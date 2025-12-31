/**
 * OSC to WebSocket Bridge for Fractal Visualizer
 * 
 * This server:
 * 1. Listens for OSC messages on UDP port 9000
 * 2. Forwards them to connected WebSocket clients on port 8080
 * 3. Receives analysis data from WebSocket and sends as OSC
 * 
 * Usage:
 *   node osc-bridge.js [osc-port] [ws-port] [osc-out-port]
 *   
 * Example:
 *   node osc-bridge.js 9000 8080 9001
 */

const dgram = require('dgram');
const { WebSocketServer } = require('ws');

const OSC_PORT = parseInt(process.argv[2]) || 9000;
const WS_PORT = parseInt(process.argv[3]) || 8080;
const OSC_OUT_PORT = parseInt(process.argv[4]) || 9001; // Port to send analysis data

// Validate ports
if (OSC_PORT < 1 || OSC_PORT > 65535 || WS_PORT < 1 || WS_PORT > 65535) {
    console.error('Error: Ports must be between 1 and 65535');
    process.exit(1);
}

// OSC Parser with bounds checking
function parseOSCMessage(buffer) {
    if (!buffer || buffer.length < 4) return { address: '', args: [] };
    
    let offset = 0;
    const addressEnd = buffer.indexOf(0, offset);
    if (addressEnd === -1) return { address: '', args: [] };
    
    const address = buffer.toString('utf8', offset, addressEnd);
    offset = Math.ceil((addressEnd + 1) / 4) * 4;
    
    if (offset >= buffer.length || buffer[offset] !== 0x2C) {
        return { address, args: [] };
    }
    offset++;
    
    const typeTagEnd = buffer.indexOf(0, offset);
    if (typeTagEnd === -1) return { address, args: [] };
    
    const typeTags = buffer.toString('utf8', offset, typeTagEnd);
    offset = Math.ceil((typeTagEnd + 1) / 4) * 4;
    
    const args = [];
    for (const tag of typeTags) {
        if (offset > buffer.length) break;
        
        switch (tag) {
            case 'f': 
                if (offset + 4 <= buffer.length) {
                    args.push(buffer.readFloatBE(offset)); 
                    offset += 4; 
                }
                break;
            case 'i': 
                if (offset + 4 <= buffer.length) {
                    args.push(buffer.readInt32BE(offset)); 
                    offset += 4; 
                }
                break;
            case 's': 
                const strEnd = buffer.indexOf(0, offset);
                if (strEnd !== -1) {
                    args.push(buffer.toString('utf8', offset, strEnd));
                    offset = Math.ceil((strEnd + 1) / 4) * 4;
                }
                break;
            case 'd': 
                if (offset + 8 <= buffer.length) {
                    args.push(buffer.readDoubleBE(offset)); 
                    offset += 8; 
                }
                break;
            case 'T': args.push(true); break;
            case 'F': args.push(false); break;
            case 'N': args.push(null); break;
            case 'h': // 64-bit int (BigInt)
                if (offset + 8 <= buffer.length) {
                    args.push(Number(buffer.readBigInt64BE(offset)));
                    offset += 8;
                }
                break;
        }
    }
    return { address, args };
}

function parseOSCBundle(buffer) {
    if (!buffer || buffer.length < 8) return [];
    
    const header = buffer.toString('utf8', 0, 8);
    if (header !== '#bundle\0') return [parseOSCMessage(buffer)];
    
    const messages = [];
    let offset = 16; // Skip header + timetag
    
    while (offset + 4 <= buffer.length) {
        const size = buffer.readInt32BE(offset);
        offset += 4;
        
        if (size <= 0 || offset + size > buffer.length) break;
        
        const elementBuffer = buffer.slice(offset, offset + size);
        if (elementBuffer.length >= 8 && elementBuffer.toString('utf8', 0, 7) === '#bundle') {
            messages.push(...parseOSCBundle(elementBuffer));
        } else {
            const msg = parseOSCMessage(elementBuffer);
            if (msg.address) messages.push(msg);
        }
        offset += size;
    }
    return messages;
}

// OSC Message Builder (for sending analysis back out)
function buildOSCMessage(address, args) {
    // Calculate sizes
    const addressPadded = Buffer.alloc(Math.ceil((address.length + 1) / 4) * 4);
    addressPadded.write(address);
    
    // Build type tag string
    let typeTags = ',';
    for (const arg of args) {
        if (typeof arg === 'number') {
            typeTags += Number.isInteger(arg) ? 'i' : 'f';
        } else if (typeof arg === 'string') {
            typeTags += 's';
        } else if (typeof arg === 'boolean') {
            typeTags += arg ? 'T' : 'F';
        }
    }
    
    const typeTagPadded = Buffer.alloc(Math.ceil((typeTags.length + 1) / 4) * 4);
    typeTagPadded.write(typeTags);
    
    // Build arguments
    const argBuffers = [];
    for (const arg of args) {
        if (typeof arg === 'number') {
            if (Number.isInteger(arg)) {
                const buf = Buffer.alloc(4);
                buf.writeInt32BE(arg);
                argBuffers.push(buf);
            } else {
                const buf = Buffer.alloc(4);
                buf.writeFloatBE(arg);
                argBuffers.push(buf);
            }
        } else if (typeof arg === 'string') {
            const buf = Buffer.alloc(Math.ceil((arg.length + 1) / 4) * 4);
            buf.write(arg);
            argBuffers.push(buf);
        }
        // Boolean T/F don't add data
    }
    
    return Buffer.concat([addressPadded, typeTagPadded, ...argBuffers]);
}

// UDP socket for sending OSC out
const udpOut = dgram.createSocket('udp4');

function sendOSC(address, args, targetHost = '127.0.0.1', targetPort = OSC_OUT_PORT) {
    try {
        const msg = buildOSCMessage(address, args);
        udpOut.send(msg, targetPort, targetHost, (err) => {
            if (err) console.error('[OSC OUT] Send error:', err.message);
        });
    } catch (err) {
        console.error('[OSC OUT] Build error:', err.message);
    }
}

// WebSocket Server with heartbeat
const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set();

// Heartbeat to detect dead connections
function heartbeat() {
    this.isAlive = true;
}

wss.on('connection', (ws, req) => {
    const clientAddr = req.socket.remoteAddress;
    console.log(`[WS] Client connected from ${clientAddr}`);
    clients.add(ws);
    ws.isAlive = true;
    
    ws.on('pong', heartbeat);
    ws.on('close', () => { 
        console.log(`[WS] Client disconnected: ${clientAddr}`); 
        clients.delete(ws); 
    });
    ws.on('error', (err) => { 
        console.error(`[WS] Error (${clientAddr}):`, err.message); 
        clients.delete(ws); 
    });
    
    // Handle messages from browser (analysis data)
    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data.toString());
            
            // Analysis messages from the visualizer
            if (msg.type === 'analysis' && msg.address) {
                // Forward as OSC to the output port
                sendOSC(msg.address, msg.args);
                
                // Log periodically (not every message to reduce spam)
                if (Math.random() < 0.1) {
                    console.log(`[ANALYSIS] ${msg.address}`, 
                        Array.isArray(msg.args) && msg.args.length > 4 
                            ? `[${msg.args.length} values]` 
                            : msg.args
                    );
                }
            }
        } catch (err) {
            // Ignore parse errors for non-JSON messages
        }
    });
});

// Ping clients every 30s to detect dead connections
const pingInterval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
            console.log('[WS] Terminating inactive client');
            clients.delete(ws);
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => clearInterval(pingInterval));

function broadcast(data) {
    const json = JSON.stringify(data);
    let sent = 0;
    for (const client of clients) {
        if (client.readyState === 1) { // WebSocket.OPEN
            try {
                client.send(json);
                sent++;
            } catch (err) {
                console.error('[WS] Send error:', err.message);
                clients.delete(client);
            }
        }
    }
    return sent;
}

// UDP Server for OSC
const udp = dgram.createSocket('udp4');

udp.on('message', (buffer, rinfo) => {
    try {
        const messages = parseOSCBundle(buffer);
        for (const msg of messages) {
            if (msg.address) {
                const clientCount = broadcast(msg);
                if (clientCount > 0) {
                    console.log(`[OSC] ${msg.address}`, msg.args, `-> ${clientCount} client(s)`);
                } else {
                    console.log(`[OSC] ${msg.address}`, msg.args, '(no clients)');
                }
            }
        }
    } catch (err) {
        console.error('[OSC] Parse error:', err.message);
    }
});

udp.on('error', (err) => { 
    console.error('[UDP] Error:', err.message); 
    shutdown();
});

udp.on('listening', () => {
    const addr = udp.address();
    console.log(`[UDP] Listening on ${addr.address}:${addr.port}`);
});

udp.bind(OSC_PORT);

// Startup banner
console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║          OSC ↔ WebSocket Bridge for Fractal Visualizer            ║
╠═══════════════════════════════════════════════════════════════════╣
║  OSC Input:       UDP port ${OSC_PORT.toString().padEnd(5)}  (control messages)         ║
║  OSC Output:      UDP port ${OSC_OUT_PORT.toString().padEnd(5)}  (analysis data)           ║
║  WebSocket:       ws://localhost:${WS_PORT.toString().padEnd(5)}                        ║
╠═══════════════════════════════════════════════════════════════════╣
║  CONTROL MESSAGES (OSC IN → Visualizer)                           ║
╠═══════════════════════════════════════════════════════════════════╣
║  FRACTAL TYPE                                                     ║
║    /fractal/type 0-5            Select fractal                    ║
║    /fractal/mandelbrot          Type 0                            ║
║    /fractal/burningship         Type 1                            ║
║    /fractal/multibrot           Type 2                            ║
║    /fractal/newton              Type 3                            ║
║    /fractal/clifford            Type 4                            ║
║    /fractal/domain              Type 5                            ║
║                                                                   ║
║  NAVIGATION                                                       ║
║    /fractal/centerX float       Center X                          ║
║    /fractal/centerY float       Center Y                          ║
║    /fractal/zoom float          Zoom (log2)                       ║
║    /fractal/reset               Reset view                        ║
║                                                                   ║
║  COLORS                                                           ║
║    /fractal/colorScheme 0-6     Palette                           ║
║    /fractal/colorOffset 0-1     Phase                             ║
║    /fractal/colorFreq float     Frequency                         ║
║                                                                   ║
║  JULIA (types 0-2)                                                ║
║    /fractal/juliaMode 0/1       Toggle                            ║
║    /fractal/juliaX float        C real                            ║
║    /fractal/juliaY float        C imag                            ║
║                                                                   ║
║  MULTIBROT (type 2)                                               ║
║    /fractal/power float         Exponent (2-8)                    ║
║                                                                   ║
║  NEWTON (type 3)                                                  ║
║    /fractal/newtonPoly 0-3      Polynomial                        ║
║    /fractal/newtonRelax 0-2     Relaxation                        ║
║                                                                   ║
║  CLIFFORD (type 4)                                                ║
║    /fractal/cliffordA float     Param a                           ║
║    /fractal/cliffordB float     Param b                           ║
║    /fractal/cliffordC float     Param c                           ║
║    /fractal/cliffordD float     Param d                           ║
║                                                                   ║
║  DOMAIN (type 5)                                                  ║
║    /fractal/domainFunc 0-9      Function                          ║
║    /fractal/domainGrid 0/1      Grid                              ║
║                                                                   ║
║  ANIMATION                                                        ║
║    /fractal/autoZoom 0/1        Auto-zoom                         ║
║    /fractal/colorCycle 0/1      Color cycle                       ║
║    /fractal/animateParams 0/1   Param animation                   ║
║    /fractal/animSpeed float     Speed (0.1-3)                     ║
║                                                                   ║
║  RENDERING                                                        ║
║    /fractal/maxIter int         Iterations (50-5000)              ║
║                                                                   ║
║  ANALYSIS CONTROL                                                 ║
║    /fractal/anrate int          Analysis rate (1-60 fps)          ║
║    /fractal/angridsize int      Grid size (2-32)                  ║
║    /fractal/anringsamples int   Ring samples (4-128)              ║
║    /fractal/an_brightness 0/1   Toggle brightness output          ║
║    /fractal/an_escape 0/1       Toggle escape ratio output        ║
║    /fractal/an_edge 0/1         Toggle edge density output        ║
║    /fractal/an_hue 0/1          Toggle dominant hue output        ║
║    /fractal/an_color 0/1        Toggle color balance output       ║
║    /fractal/an_grid 0/1         Toggle spatial grid output        ║
║    /fractal/an_columns 0/1      Toggle column sums output         ║
║    /fractal/an_rows 0/1         Toggle row sums output            ║
║    /fractal/an_ring 0/1         Toggle ring sample output         ║
║    /fractal/an_hist 0/1         Toggle iteration histogram        ║
║    /fractal/an_all_on           Enable all analysis channels      ║
║    /fractal/an_all_off          Disable all analysis channels     ║
║    /fractal/an_basic_on         Enable basic channels             ║
║    /fractal/an_spatial_on       Enable spatial channels           ║
╠═══════════════════════════════════════════════════════════════════╣
║  ANALYSIS OUTPUT (Visualizer → OSC OUT on port ${OSC_OUT_PORT.toString().padEnd(5)})            ║
╠═══════════════════════════════════════════════════════════════════╣
║    /fractal/analysis/brightness     float     0-1                 ║
║    /fractal/analysis/escapeRatio    float     0-1                 ║
║    /fractal/analysis/edgeDensity    float     0-1                 ║
║    /fractal/analysis/dominantHue    float     0-1                 ║
║    /fractal/analysis/colorBalance   r g b     0-1 each            ║
║    /fractal/analysis/spectralCentroid x y     0-1 each            ║
║    /fractal/analysis/grid           N² floats 0-1 each            ║
║    /fractal/analysis/columnSums     128 floats 0-1 each           ║
║    /fractal/analysis/rowSums        128 floats 0-1 each           ║
║    /fractal/analysis/ring           N floats  0-1 each            ║
║    /fractal/analysis/iterHist       16 floats histogram           ║
║    /fractal/analysis/zoom           float     normalized zoom     ║
║    /fractal/analysis/position       x y       normalized center   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

// Graceful shutdown
function shutdown() {
    console.log('\nShutting down...');
    
    // Close all WebSocket connections
    for (const client of clients) {
        try {
            client.close(1000, 'Server shutting down');
        } catch (e) {}
    }
    
    // Close servers
    clearInterval(pingInterval);
    wss.close(() => console.log('[WS] Server closed'));
    udp.close(() => console.log('[UDP] Server closed'));
    
    setTimeout(() => process.exit(0), 500);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('uncaughtException', (err) => {
    console.error('[FATAL]', err);
    shutdown();
});

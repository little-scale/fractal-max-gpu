/**
 * OSC to WebSocket Bridge for Fractal Visualizer
 * 
 * This server:
 * 1. Listens for OSC messages on UDP port 9000
 * 2. Forwards them to connected WebSocket clients on port 8080
 * 
 * Usage:
 *   node osc-bridge.js [osc-port] [ws-port]
 *   
 * Example:
 *   node osc-bridge.js 9000 8080
 */

const dgram = require('dgram');
const { WebSocketServer } = require('ws');

const OSC_PORT = parseInt(process.argv[2]) || 9000;
const WS_PORT = parseInt(process.argv[3]) || 8080;

// OSC Parser
function parseOSCMessage(buffer) {
    let offset = 0;
    const addressEnd = buffer.indexOf(0, offset);
    const address = buffer.toString('utf8', offset, addressEnd);
    offset = Math.ceil((addressEnd + 1) / 4) * 4;
    
    if (buffer[offset] !== 0x2C) return { address, args: [] };
    offset++;
    
    const typeTagEnd = buffer.indexOf(0, offset);
    const typeTags = buffer.toString('utf8', offset, typeTagEnd);
    offset = Math.ceil((typeTagEnd + 1) / 4) * 4;
    
    const args = [];
    for (const tag of typeTags) {
        switch (tag) {
            case 'f': args.push(buffer.readFloatBE(offset)); offset += 4; break;
            case 'i': args.push(buffer.readInt32BE(offset)); offset += 4; break;
            case 's': 
                const strEnd = buffer.indexOf(0, offset);
                args.push(buffer.toString('utf8', offset, strEnd));
                offset = Math.ceil((strEnd + 1) / 4) * 4;
                break;
            case 'd': args.push(buffer.readDoubleBE(offset)); offset += 8; break;
            case 'T': args.push(true); break;
            case 'F': args.push(false); break;
        }
    }
    return { address, args };
}

function parseOSCBundle(buffer) {
    const header = buffer.toString('utf8', 0, 8);
    if (header !== '#bundle\0') return [parseOSCMessage(buffer)];
    
    const messages = [];
    let offset = 16; // Skip header + timetag
    
    while (offset < buffer.length) {
        const size = buffer.readInt32BE(offset);
        offset += 4;
        const elementBuffer = buffer.slice(offset, offset + size);
        if (elementBuffer.toString('utf8', 0, 7) === '#bundle') {
            messages.push(...parseOSCBundle(elementBuffer));
        } else {
            messages.push(parseOSCMessage(elementBuffer));
        }
        offset += size;
    }
    return messages;
}

// WebSocket Server
const wss = new WebSocketServer({ port: WS_PORT });
const clients = new Set();

wss.on('connection', (ws, req) => {
    console.log(`[WS] Client connected from ${req.socket.remoteAddress}`);
    clients.add(ws);
    ws.on('close', () => { console.log('[WS] Client disconnected'); clients.delete(ws); });
    ws.on('error', (err) => { console.error('[WS] Error:', err.message); clients.delete(ws); });
});

function broadcast(data) {
    const json = JSON.stringify(data);
    for (const client of clients) {
        if (client.readyState === 1) client.send(json);
    }
}

// UDP Server for OSC
const udp = dgram.createSocket('udp4');

udp.on('message', (buffer) => {
    try {
        const messages = parseOSCBundle(buffer);
        for (const msg of messages) {
            console.log(`[OSC] ${msg.address}`, msg.args);
            broadcast(msg);
        }
    } catch (err) {
        console.error('[OSC] Parse error:', err.message);
    }
});

udp.on('error', (err) => { console.error('[UDP] Error:', err.message); udp.close(); });
udp.on('listening', () => console.log(`[UDP] Listening on port ${udp.address().port}`));
udp.bind(OSC_PORT);

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║            OSC → WebSocket Bridge for Fractal Visualizer         ║
╠══════════════════════════════════════════════════════════════════╣
║  OSC Input:     UDP port ${OSC_PORT.toString().padEnd(5)}                               ║
║  WebSocket:     ws://localhost:${WS_PORT.toString().padEnd(5)}                          ║
╠══════════════════════════════════════════════════════════════════╣
║  FRACTAL TYPE                                                    ║
║    /fractal/type 0-5            Select fractal                   ║
║    /fractal/mandelbrot          Type 0                           ║
║    /fractal/burningship         Type 1                           ║
║    /fractal/multibrot           Type 2                           ║
║    /fractal/newton              Type 3                           ║
║    /fractal/clifford            Type 4                           ║
║    /fractal/domain              Type 5                           ║
║                                                                  ║
║  NAVIGATION                                                      ║
║    /fractal/centerX float       Center X                         ║
║    /fractal/centerY float       Center Y                         ║
║    /fractal/zoom float          Zoom (log2)                      ║
║    /fractal/reset               Reset view                       ║
║                                                                  ║
║  COLORS                                                          ║
║    /fractal/colorScheme 0-6     Palette                          ║
║    /fractal/colorOffset 0-1     Phase                            ║
║    /fractal/colorFreq float     Frequency                        ║
║                                                                  ║
║  JULIA (types 0-2)                                               ║
║    /fractal/juliaMode 0/1       Toggle                           ║
║    /fractal/juliaX float        C real                           ║
║    /fractal/juliaY float        C imag                           ║
║                                                                  ║
║  MULTIBROT (type 2)                                              ║
║    /fractal/power float         Exponent (2-8)                   ║
║                                                                  ║
║  NEWTON (type 3)                                                 ║
║    /fractal/newtonPoly 0-3      Polynomial                       ║
║    /fractal/newtonRelax 0-2     Relaxation                       ║
║                                                                  ║
║  CLIFFORD (type 4)                                               ║
║    /fractal/cliffordA float     Param a                          ║
║    /fractal/cliffordB float     Param b                          ║
║    /fractal/cliffordC float     Param c                          ║
║    /fractal/cliffordD float     Param d                          ║
║                                                                  ║
║  DOMAIN (type 5)                                                 ║
║    /fractal/domainFunc 0-9      Function                         ║
║    /fractal/domainGrid 0/1      Grid                             ║
║                                                                  ║
║  ANIMATION                                                       ║
║    /fractal/autoZoom 0/1        Auto-zoom                        ║
║    /fractal/colorCycle 0/1      Color cycle                      ║
║    /fractal/animateParams 0/1   Param animation                  ║
║    /fractal/animSpeed float     Speed (0.1-3)                    ║
║                                                                  ║
║  RENDERING                                                       ║
║    /fractal/maxIter int         Iterations (50-5000)             ║
╚══════════════════════════════════════════════════════════════════╝
`);

process.on('SIGINT', () => { console.log('\nShutting down...'); wss.close(); udp.close(); process.exit(0); });

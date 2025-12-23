# GPU Fractal Explorer

A real-time, GPU-accelerated fractal visualizer with **Max/MSP integration** (via jweb) and **OSC control** for live performance and parameter automation.

![Fractals](https://img.shields.io/badge/Fractals-6%20Types-blue) ![WebGL2](https://img.shields.io/badge/WebGL2-GPU%20Accelerated-green) ![Max/MSP](https://img.shields.io/badge/Max%2FMSP-jweb%20Ready-orange)

## Features

- **6 Fractal Types**: Mandelbrot, Burning Ship, Multibrot, Newton, Clifford Attractor, Domain Coloring
- **GPU Accelerated**: Real-time rendering via WebGL2 fragment shaders
- **Max/MSP Integration**: Load in `jweb` and control via Max messages
- **OSC Control**: WebSocket bridge for external OSC control
- **Animation**: Auto-zoom, color cycling, parameter animation
- **7 Color Schemes**: Classic, Fire, Ocean, Rainbow, Grayscale, Psychedelic, Electric

---

## Quick Start

### Option 1: Standalone Browser
Simply open `fractals-max.html` in Chrome, Firefox, or Edge.

### Option 2: Max/MSP (jweb)
```
[jweb @url fractals-max.html]
```
Then send messages to the jweb object (see Command Reference below).

### Option 3: With OSC Control
```bash
# Start the WebSocket bridge
node osc-bridge.js

# Bridge listens on:
#   UDP 9000 (OSC input)
#   WS 8080 (WebSocket output)
```
Then click "Connect" in the HTML interface or send OSC from Max/SuperCollider/TouchOSC.

---

## Files

| File | Description |
|------|-------------|
| `fractals-max.html` | Main visualizer with max-api + OSC support |
| `fractals.html` | Standalone version (no max-api) |
| `osc-bridge.js` | Node.js OSC→WebSocket bridge |
| `package.json` | Node dependencies |

---

## Command Reference

All commands work via **Max messages** (to jweb) and **OSC** (via WebSocket bridge).

### Fractal Type Selection

| Command | Args | Description |
|---------|------|-------------|
| `type` | `0-5` | Set fractal by number |
| `mandelbrot` | - | Type 0: Classic Mandelbrot set |
| `burningship` | - | Type 1: Burning Ship fractal |
| `multibrot` | - | Type 2: Generalized z^d + c |
| `newton` | - | Type 3: Newton root-finding fractal |
| `clifford` | - | Type 4: Clifford strange attractor |
| `domain` | - | Type 5: Complex function visualization |

### Navigation

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `centerX` / `cx` | float | -2 to 2 | Center X coordinate |
| `centerY` / `cy` | float | -2 to 2 | Center Y coordinate |
| `center` | x y | | Set both coordinates |
| `zoom` | float | -2 to 45 | Zoom level (log₂ scale) |
| `reset` | - | | Reset to default view |

### Rendering

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `maxIter` | int | 50-5000 | Maximum iterations |
| `iter` | int | 50-5000 | Alias for maxIter |
| `iterations` | int | 50-5000 | Alias for maxIter |

### Colors

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `colorScheme` / `scheme` | int | 0-6 | Color palette number |
| `colorOffset` / `offset` | float | 0-1 | Color phase offset |
| `colorFreq` / `freq` | float | 0.1-10 | Color frequency |

**Color Scheme Shortcuts:**

| Command | Scheme |
|---------|--------|
| `classic` | 0 - Blue/cyan gradient |
| `fire` | 1 - Red/orange/yellow |
| `ocean` | 2 - Blue/green |
| `rainbow` | 3 - Full spectrum HSL |
| `grayscale` / `gray` | 4 - Black to white |
| `psychedelic` / `psych` | 5 - Multi-frequency RGB |
| `electric` | 6 - Purple/blue electric |

### Julia Mode (Mandelbrot / Burning Ship / Multibrot)

| Command | Args | Description |
|---------|------|-------------|
| `juliaMode` | 0/1 | Toggle Julia mode |
| `julia` | 0/1 | Toggle Julia mode |
| `julia` | x y | Set Julia C constant |
| `juliaX` / `jx` | float | Julia C real part (-2 to 2) |
| `juliaY` / `jy` | float | Julia C imaginary part (-2 to 2) |
| `julia_on` | - | Enable Julia mode |
| `julia_off` | - | Disable Julia mode |

**Classic Julia Constants:**
- Dendrite: `julia 0 1`
- Rabbit: `julia -0.123 0.745`
- Dragon: `julia -0.8 0.156`
- Spiral: `julia -0.4 0.6`

### Multibrot Parameters

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `power` | float | 2-8 | Exponent d in z^d + c |
| `multibrotPower` | float | 2-8 | Alias for power |

### Newton Fractal Parameters

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `newtonPoly` / `poly` | int | 0-3 | Polynomial selection |
| `newtonRelax` / `relax` | float | 0.1-2 | Relaxation factor |

**Polynomials:**
- 0: z³ - 1 (3 roots)
- 1: z⁴ - 1 (4 roots)
- 2: z⁵ - 1 (5 roots)
- 3: z⁶ - 1 (6 roots)

### Clifford Attractor Parameters

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `cliffordA` / `ca` | float | -3 to 3 | Parameter a |
| `cliffordB` / `cb` | float | -3 to 3 | Parameter b |
| `cliffordC` / `cc` | float | -3 to 3 | Parameter c |
| `cliffordD` / `cd` | float | -3 to 3 | Parameter d |
| `cliff` | a b c d | | Set all four parameters |

**Classic Presets:**
- Classic: `cliff -1.4 1.6 1.0 0.7`
- Leaf: `cliff 1.7 1.7 0.6 1.2`
- Swirl: `cliff -1.7 1.3 -0.1 -1.2`

### Domain Coloring Parameters

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `domainFunc` / `func` | int | 0-9 | Complex function |
| `domainGrid` / `grid` | 0/1 | | Toggle grid lines |
| `grid_on` | - | | Show grid |
| `grid_off` | - | | Hide grid |

**Functions:**
- 0: z (identity)
- 1: z²
- 2: z³
- 3: 1/z
- 4: sin(z)
- 5: cos(z)
- 6: exp(z)
- 7: tan(z)
- 8: (z²-1)/(z²+1)
- 9: z + 1/z

### Animation

| Command | Args | Description |
|---------|------|-------------|
| `autoZoom` / `autozoom` | 0/1 | Toggle auto-zoom |
| `autozoom_on` | - | Enable auto-zoom |
| `autozoom_off` | - | Disable auto-zoom |
| `colorCycle` / `cycle` | 0/1 | Toggle color cycling |
| `cycle_on` | - | Enable color cycling |
| `cycle_off` | - | Disable color cycling |
| `animateParams` / `animate` | 0/1 | Toggle parameter animation |
| `animate_on` | - | Enable parameter animation |
| `animate_off` | - | Disable parameter animation |
| `animSpeed` / `speed` | float | Animation speed (0.1-3) |

### UI Control

| Command | Description |
|---------|-------------|
| `hideui` | Hide control panel |
| `showui` | Show control panel |
| `toggleui` | Toggle control panel |

### State

| Command | Description |
|---------|-------------|
| `getstate` / `dump` | Output full state as JSON (Max outlet) |

---

## Max/MSP Examples

### Basic Setup
```
[jweb @url fractals-max.html @size 800 600]
```

### Send Commands
```
[message type 0]           -> Mandelbrot
[message zoom 5]           -> Set zoom
[message julia -0.7 0.27]  -> Set Julia constant
[message fire]             -> Fire color scheme
[message autozoom_on]      -> Start auto-zoom
```

### Using with Live Controls
```
[live.dial] -> [prepend offset] -> [jweb]
[live.dial] -> [prepend zoom] -> [jweb]
[live.dial] -> [prepend ca] -> [jweb]  (Clifford a)
```

### Audio-Reactive Example
```
[adc~] -> [peakamp~ 100] -> [scale 0. 1. 0. 1.] -> [prepend offset] -> [jweb]
```

---

## OSC Reference

When using the WebSocket bridge, OSC addresses follow the pattern `/fractal/<command>`.

### Example OSC Messages

| Address | Args | Description |
|---------|------|-------------|
| `/fractal/type` | 0-5 | Set fractal type |
| `/fractal/zoom` | float | Set zoom level |
| `/fractal/centerX` | float | Set center X |
| `/fractal/centerY` | float | Set center Y |
| `/fractal/juliaMode` | 0/1 | Toggle Julia |
| `/fractal/juliaX` | float | Julia C real |
| `/fractal/juliaY` | float | Julia C imag |
| `/fractal/colorScheme` | 0-6 | Color palette |
| `/fractal/colorOffset` | 0-1 | Color phase |
| `/fractal/cliffordA` | float | Clifford a |
| `/fractal/cliffordB` | float | Clifford b |
| `/fractal/cliffordC` | float | Clifford c |
| `/fractal/cliffordD` | float | Clifford d |
| `/fractal/autoZoom` | 0/1 | Auto-zoom |
| `/fractal/colorCycle` | 0/1 | Color cycle |
| `/fractal/reset` | - | Reset view |

### SuperCollider Example
```supercollider
n = NetAddr("localhost", 9000);

// Set fractal type
n.sendMsg('/fractal/type', 0);

// Animate Julia constant
(
Routine({
    var t = 0;
    loop {
        n.sendMsg('/fractal/juliaX', 0.7885 * cos(t));
        n.sendMsg('/fractal/juliaY', 0.7885 * sin(t));
        t = t + 0.02;
        0.016.wait;
    }
}).play;
)
```

### Max/MSP OSC Example
```
[udpsend localhost 9000]
       |
[prepend /fractal/zoom]
       |
[pak /fractal/zoom 1.]
       |
[dial]  (0-45)
```

---

## Keyboard Shortcuts (in browser)

| Key | Action |
|-----|--------|
| `H` | Toggle UI panel |
| `R` | Reset view |
| `J` | Toggle Julia mode |
| `Space` | Toggle auto-zoom |
| `C` | Toggle color cycling |
| `1-6` | Select fractal type |
| `+` / `-` | Zoom in/out |
| `Arrows` | Pan view |
| `Double-click` | Center on point |
| `Shift+Double-click` | Set Julia C |

---

## Mouse Controls

| Action | Description |
|--------|-------------|
| Drag | Pan view |
| Scroll | Zoom in/out |
| Double-click | Center on point |
| Shift+Double-click | Pick Julia C from Mandelbrot |

---

## Performance Tips

1. **Lower iterations** for smoother animation at deep zooms
2. **Clifford attractor** recomputes on parameter change (may stutter)
3. **Close other GPU apps** for best performance
4. **Chrome/Edge** typically have best WebGL2 performance

---

## Interesting Coordinates

### Mandelbrot
| Name | Center X | Center Y | Zoom |
|------|----------|----------|------|
| Seahorse Valley | -0.75 | 0.1 | 8 |
| Elephant Valley | 0.275 | 0 | 6 |
| Mini Mandelbrot | -0.16 | 1.035 | 10 |
| Spiral | -0.761574 | -0.0847596 | 12 |

### Burning Ship
| Name | Center X | Center Y | Zoom |
|------|----------|----------|------|
| Main Ship | -0.4 | -0.6 | 2 |
| Armada | -1.755 | -0.03 | 8 |

---

## License

MIT

---

## Credits

Created for live audio-visual performance with Max/MSP, SuperCollider, and TouchOSC.

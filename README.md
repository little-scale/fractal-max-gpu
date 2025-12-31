# GPU Fractal Explorer

A real-time, GPU-accelerated fractal visualizer with **Max/MSP integration** (via jweb), **OSC control**, and **sonification analysis output** for live performance and parameter automation.

![Fractals](https://img.shields.io/badge/Fractals-6%20Types-blue) ![WebGL2](https://img.shields.io/badge/WebGL2-GPU%20Accelerated-green) ![Max/MSP](https://img.shields.io/badge/Max%2FMSP-jweb%20Ready-orange) ![Sonification](https://img.shields.io/badge/Sonification-13%20Channels-purple)

## Features

- **6 Fractal Types**: Mandelbrot, Burning Ship, Multibrot, Newton, Clifford Attractor, Domain Coloring
- **GPU Accelerated**: Real-time rendering via WebGL2 fragment shaders
- **Max/MSP Integration**: Load in `jweb` and control via Max messages
- **OSC Control**: Bidirectional WebSocket bridge for external OSC control
- **Sonification Analysis**: 13 toggleable analysis channels for audio-reactive applications
- **Animation**: Auto-zoom, color cycling, parameter animation
- **7 Color Schemes**: Classic, Fire, Ocean, Rainbow, Grayscale, Psychedelic, Electric
- **Touch Support**: Pinch-to-zoom and drag on mobile/tablet

---

## Quick Start

### Option 1: Standalone Browser
Simply open `fractals-max.html` in Chrome, Firefox, or Edge.

### Option 2: Max/MSP (jweb)
```
[jweb @url fractals-max.html]
```
Then send messages to the jweb object (see Command Reference below).

### Option 3: With OSC Control + Analysis Output
```bash
# Start the WebSocket bridge
node osc-bridge.js 9000 8080 9001

# Bridge configuration:
#   UDP 9000 - OSC input (control messages)
#   WS  8080 - WebSocket (browser connection)
#   UDP 9001 - OSC output (analysis data)
```
Then click "Connect" in the HTML interface.

---

## Sonification Analysis System

The visualizer includes a comprehensive analysis system that extracts musical/sonic parameters from the fractal visualization in real-time. Each channel can be independently toggled on/off.

### Analysis Channels

| Channel | Output | Description |
|---------|--------|-------------|
| **brightness** | float 0-1 | Average luminance of viewport |
| **escapeRatio** | float 0-1 | Density of escaped pixels (vs. in-set) |
| **edgeDensity** | float 0-1 | Amount of boundary/edge detail |
| **dominantHue** | float 0-1 | Hue of average color |
| **colorBalance** | 3 floats | RGB balance (r, g, b) |
| **spectralCentroid** | 2 floats | Brightness-weighted center (x, y) |
| **grid** | N² floats | Spatial brightness grid (4×4 to 16×16) |
| **columnSums** | 128 floats | Vertical projection (spectrogram-like) |
| **rowSums** | 128 floats | Horizontal projection (waveform-like) |
| **ring** | N floats | Radial samples around center (8-64) |
| **iterHist** | 16 floats | Iteration count histogram |
| **zoomParams** | multiple | Normalized zoom, position data |
| **fractalParams** | multiple | Current fractal type, Julia C, etc. |

### Sonification Mapping Ideas

| Analysis Channel | Musical Parameter |
|------------------|-------------------|
| brightness | Filter cutoff, amplitude |
| escapeRatio | Texture density, grain rate |
| edgeDensity | Harmonic content, distortion |
| dominantHue | Pitch, timbre morph |
| colorBalance | Stereo position, 3-band EQ |
| spectralCentroid | Spatial panning |
| grid | Wavetable, FM matrix |
| columnSums | Additive synthesis spectrum |
| rowSums | Amplitude envelope |
| ring | Arpeggio sequence |
| iterHist | Spectral shape |

### Analysis Configuration

| Command | Args | Description |
|---------|------|-------------|
| `anrate` | 1-60 | Analysis rate in fps |
| `angridsize` | 2-32 | Grid resolution (N×N) |
| `anringsamples` | 4-128 | Ring sample count |

### Channel Toggle Commands

Each channel has on/off commands via Max messages or OSC:

```
an_brightness 1      Enable brightness output
an_brightness 0      Disable brightness output
an_escape 1          Enable escape ratio
an_edge 1            Enable edge density
an_hue 1             Enable dominant hue
an_color 1           Enable color balance
an_centroid 1        Enable spectral centroid
an_grid 1            Enable spatial grid
an_columns 1         Enable column sums
an_rows 1            Enable row sums
an_ring 1            Enable ring samples
an_hist 1            Enable iteration histogram
an_zoom 1            Enable zoom/position params
an_params 1          Enable fractal params
```

### Bulk Commands

| Command | Description |
|---------|-------------|
| `an_all_on` | Enable all analysis channels |
| `an_all_off` | Disable all analysis channels |
| `an_basic_on` | Enable brightness, escape, edge |
| `an_spatial_on` | Enable grid, columns, rows, ring |

---

## Analysis Output (OSC)

When using the OSC bridge, analysis data is sent to the output port (default 9001):

```
/fractal/analysis/brightness 0.342
/fractal/analysis/escapeRatio 0.723
/fractal/analysis/edgeDensity 0.156
/fractal/analysis/dominantHue 0.65
/fractal/analysis/colorBalance 0.4 0.3 0.5
/fractal/analysis/spectralCentroid 0.52 0.48
/fractal/analysis/grid 0.1 0.2 0.3 ... (N² values)
/fractal/analysis/columnSums 0.1 0.2 ... (128 values)
/fractal/analysis/rowSums 0.1 0.2 ... (128 values)
/fractal/analysis/ring 0.3 0.5 0.2 ... (N values)
/fractal/analysis/iterHist 0.1 0.05 0.2 ... (16 values)
/fractal/analysis/zoom 0.28
/fractal/analysis/position 0.45 0.52
```

### Max/MSP Analysis Output

When running in jweb, analysis data comes out the outlet:

```
[jweb]
   |
[route analysis]
   |
[route brightness escapeRatio edgeDensity ...]
```

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

### Colors

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `colorScheme` / `scheme` | int | 0-6 | Color palette number |
| `colorOffset` / `offset` | float | 0-1 | Color phase offset |
| `colorFreq` / `freq` | float | 0.1-10 | Color frequency |

**Color Scheme Shortcuts:** `classic`, `fire`, `ocean`, `rainbow`, `grayscale`, `psychedelic`, `electric`

### Julia Mode (Mandelbrot / Burning Ship / Multibrot)

| Command | Args | Description |
|---------|------|-------------|
| `juliaMode` | 0/1 | Toggle Julia mode |
| `julia` | x y | Set Julia C constant (enables Julia) |
| `juliaX` / `jx` | float | Julia C real part (-2 to 2) |
| `juliaY` / `jy` | float | Julia C imaginary part (-2 to 2) |
| `julia_on` / `julia_off` | - | Enable/disable Julia mode |

### Multibrot Parameters

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `power` | float | 2-8 | Exponent d in z^d + c |

### Newton Fractal Parameters

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `newtonPoly` / `poly` | int | 0-3 | Polynomial selection (z³-z⁶) |
| `newtonRelax` / `relax` | float | 0.1-2 | Relaxation factor |

### Clifford Attractor Parameters

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `cliffordA` / `ca` | float | -3 to 3 | Parameter a |
| `cliffordB` / `cb` | float | -3 to 3 | Parameter b |
| `cliffordC` / `cc` | float | -3 to 3 | Parameter c |
| `cliffordD` / `cd` | float | -3 to 3 | Parameter d |
| `cliff` | a b c d | | Set all four parameters |

### Domain Coloring Parameters

| Command | Args | Range | Description |
|---------|------|-------|-------------|
| `domainFunc` / `func` | int | 0-9 | Complex function |
| `domainGrid` / `grid` | 0/1 | | Toggle grid lines |

### Animation

| Command | Args | Description |
|---------|------|-------------|
| `autoZoom` / `autozoom` | 0/1 | Toggle auto-zoom |
| `colorCycle` / `cycle` | 0/1 | Toggle color cycling |
| `animateParams` / `animate` | 0/1 | Toggle parameter animation |
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
| `getstate` / `dump` | Output full state as JSON |
| `getanalysis` / `dumpanalysis` | Output analysis config as JSON |

---

## Max/MSP Examples

### Basic Setup with Analysis
```
[jweb @url fractals-max.html @size 800 600]
   |
[route analysis state]
   |           |
[route brightness escapeRatio edgeDensity]
   |           |              |
[number]   [number]       [number]
```

### Audio-Reactive Sonification
```
[adc~]
   |
[peakamp~ 100]
   |
[scale 0. 1. 0. 1.]
   |
[prepend offset]
   |
[jweb]
   |
[route analysis]
   |
[route brightness]
   |
[scale 0. 1. 200. 2000.]
   |
[line~]
   |
[lores~ 1000 0.5]
```

### Using Analysis Grid for Synthesis
```
[jweb]
   |
[route analysis]
   |
[route grid]
   |
[zl.stream 64]  // 8x8 grid = 64 values
   |
[jit.fill jit_matrix 8 8]
   |
[jit.matrix 1 float32 8 8]
```

---

## SuperCollider Example with Analysis

```supercollider
// Receive analysis from bridge
OSCdef(\fractalBrightness, { |msg|
    ~brightness = msg[1];
    ~synth.set(\cutoff, msg[1].linexp(0, 1, 200, 8000));
}, '/fractal/analysis/brightness');

OSCdef(\fractalEdge, { |msg|
    ~edgeDensity = msg[1];
    ~synth.set(\distortion, msg[1]);
}, '/fractal/analysis/edgeDensity');

// Send control
n = NetAddr("localhost", 9000);
n.sendMsg('/fractal/type', 0);
n.sendMsg('/fractal/an_basic_on');
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

---

## Mouse/Touch Controls

| Action | Description |
|--------|-------------|
| Drag | Pan view |
| Scroll / Pinch | Zoom in/out |
| Double-click | Center on point |
| Shift+Double-click | Pick Julia C from Mandelbrot |

---

## Performance Tips

1. **Lower analysis rate** (`anrate 15`) for complex patches
2. **Disable unused channels** to reduce CPU overhead
3. **Lower iterations** for smoother animation at deep zooms
4. **Clifford attractor** recomputes on parameter change (may stutter during animation)
5. **Chrome/Edge** typically have best WebGL2 performance

---

## License

MIT

---

## Credits

Created for live audio-visual performance with Max/MSP, SuperCollider, and TouchOSC.

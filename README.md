# VERDANT RUSH
> *"Breathe in. Floor it."*

**VERDANT RUSH** is a calm, sunlit 3D forest racing game for the browser. Set against a painterly, atmospheric wilderness of towering maples, birches, crystal streams, and turquoise alpine lakes, the game pairs pure relaxation with the thrill of high-speed arcade driving.

Play as cars or motorbikes across three handcrafted forest circuits, compete against 7 AI rivals, balance the dual **Calm / Rush Flow System**, customize your rides in the Garage, and progress through the 12-event Journey Career Mode.

---

## 🎮 Key Features

- **Dual Vehicle Dynamics (Cars & Bikes)**:
  - **Cars**: Arcade Pacejka-derived tyre grip, counter-steer assist, handbrake sliding, and automatic transmission torque curves.
  - **Motorbikes**: Lean physics (up to $42^\circ$), throttle wheelies, hard-braking stoppies, and soft self-righting recovery.
  - **Roster**: 6 signature rides (*Moss Hatch, Ember Coupe, Timberline 4x4, Fern 250, Hawk Adventure, Pebble Trials*) and up to 30 vehicle configurations.

- **The Calm / Rush Flow System**:
  - **Calm Flow (0–100)**: Builds from clean lines, scenic cruising, zero collisions, and photo mode snapshots. At 100%, triggers **Zen Lap** (golden world shimmer, relaxed camera, $+\$500$ bonus payout).
  - **Rush Flow (0–100)**: Builds from high-angle drifts, drafting, near-misses, air time, and nitro. At 100%, unleashes **Rush Time** (6 seconds of free unlimited nitro, speed lines, and widened FOV).

- **Three Handcrafted Forest Tracks**:
  - **Emerald Valley** (1.6 km, Spring Morning): Wide flowing meadows, wildflowers, and winding streams.
  - **Amber Woods** (2.2 km, Autumn Golden Hour): Covered wooden bridge, switchbacks, and slippery-leaf drift zones.
  - **Lakeside Haven** (2.0 km, Summer Midday): Cliffside road towering over turquoise water, elevation drops, and waterfalls.
  - **Gentle Rain Variant**: Raindrop streaks, lower tyre friction, and a finish-line rainbow.

- **Friendly Chaos (Zero Punishment)**:
  - Dodge crossing deer, fallen logs, branches, pebble slides, wind gusts, puddles, and seagulls. Collisions result in gentle speed drops and soft thuds—never harsh stops or explosions.

- **Complete Progression Loop**:
  - **Journey Mode**: 3 Championship Cups (*Sprout Cup, Canopy Cup, Summit Cup*) with 12 events (Circuits, Time Trials, Drift Slalom, Elimination).
  - **Relax Drive**: Endless free-roaming with no timers, no rival traffic, and pure Zen atmosphere.
  - **Garage & Tuning**: 3D turntable, 4 upgrade categories (Engine, Tyres, Nitro, Chassis), 8 custom liveries, wheel styles, and custom number plate text.
  - **Photo Mode**: Freeze-frame free orbit camera with FOV and vignette sliders, filter presets, and one-click PNG downloads.
  - **Web Audio API**: Real-time engine audio, tyre squeal, gravel spray, wind noise, and adaptive Rush percussion.

---

## ⌨️ Controls

| Action | Keyboard | Gamepad | Touch |
| :--- | :--- | :--- | :--- |
| **Accelerate** | `W` / `Up Arrow` | Right Trigger (`RT`) | Gas Pedal |
| **Steer** | `A` / `D` or `Left` / `Right` | Left Thumbstick | Virtual Joystick |
| **Brake / Reverse** | `S` / `Down Arrow` | Left Trigger (`LT`) | Brake Pedal |
| **Drift / Handbrake** | `Spacebar` | `X` Button | Drift Button |
| **Nitro Boost** | `Shift` | `A` Button | Nitro Button |
| **Cycle Camera** | `C` | `Y` Button | Camera Icon |
| **Respawn on Track** | `R` | `D-Pad Down` | — |
| **Photo Mode** | `F` | — | Camera Icon |
| **Pause / Menu** | `Esc` / `P` | `Start` Button | Pause Icon |
| **Mute Audio** | `M` | — | Sound Icon |

---

## 🛠️ Tech Stack

- **Framework**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS
- **3D & WebGL**: Three.js, React Three Fiber (`@react-three/fiber`), Drei (`@react-three/drei`), `@react-three/postprocessing`
- **State Management**: Zustand (persisted to `localStorage`)
- **Audio Engine**: Web Audio API (procedural synthesis + sample buffers)
- **Icons**: Lucide React (`lucide-react`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/goateddhleminh/verdant-rush.git
cd verdant-rush

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev
```

### Production Build

```bash
# Compile TypeScript and build with Vite
npm run build

# Preview production build locally
npm run preview
```

---

## 📄 License

MIT License. Designed and built with care for a calm, joyful driving experience.

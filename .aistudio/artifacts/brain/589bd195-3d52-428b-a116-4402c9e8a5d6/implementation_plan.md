# Intelligent Tactical AI, Exact Ballistic Physics & Unobstructed Side-Dock HUD Plan

This plan resolves the AI out-of-bounds shot bug with an exact closed-form ballistic solver, upgrades the AI to tactically target open court space away from your current position, and moves all power/shot controls (`Clear`, `Drop`, `Drive`, `Smash`) and signature pro skills into the left and right dark stadium margins so you have a 100% unobstructed view of the entire court.

### User Review & Critical Decisions

> [!IMPORTANT]
> Your confirmed preferences from our clarification step are locked into this plan:

- **Confirmed Decision 1 — Vertical Side-Margin Control Docks**: All shot power cards (`Clear [J]`, `Drop [L]`, `Drive [U]`, `Smash [K]`), sub-variant selectors (`Mid/Deep`, `Tight/Push`, `Soft/Fast`, `75%/90%/100%`), `Safety Lock`, and the 4 Signature Pro Skills (`1`–`4`) are docked into slim vertical panels in the dark stadium margins on the **far left** and **far right** of the screen—leaving the entire green court and baselines completely clear.
- **Confirmed Decision 2 — Smart Tactical Open-Space AI**: The AI opponent analyzes your real-time `(x, y)` court position before every strike—aiming cross-court away from your horizontal position, dropping tight over the net when you are deep at the baseline, and firing deep clears or smashes into the back corners when you push near the net.

---

### 1. Overview & Core Concept

- **What It Does**: Eliminates unforced AI out-of-bounds errors through exact aerodynamic trajectory math, gives the AI true spatial awareness of your court positioning, and clears the bottom court view by docking all tactical controls into vertical left and right side panels.
- **Target Audience / Persona**: Players who want competitive, intelligent rallies against a realistic tactical opponent with full visual clarity across the entire near and far baselines.
- **Key Value**: Every AI shot lands cleanly inside your court lines at the most challenging open corner, while your near-court baseline and movement zone remain completely free of overlapping buttons.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Unobstructed Court Vision**: The central 3D perspective green court spans cleanly from the top VIP stands down to the bottom edge of the screen with zero overlapping cards over the near baseline.
  2. **Left Vertical Margin Dock (Pro Skills & Fingertip Pad)**: Positioned in the dark left stadium margin, housing the interactive **Fingertip Touchpad** and the 4 vertically stacked **Signature Pro Skills** (`[1] Thunder Smash`, `[2] Deceptive Slice`, `[3] Iron Defense`, `[4] Stamina Surge`).
  3. **Right Vertical Margin Dock (Tactical Shot Power Deck)**: Positioned in the dark right stadium margin, housing the `100% FULL POWER`, `Touchpad Follow`, and `Safety Lock` toggles at the top, followed by a vertical stack of the 4 Tactical Shot Cards (`CLEAR [J]`, `DROP [L]`, `DRIVE [U]`, `SMASH [K]`) with their clickable percentage/depth sub-selectors.
  4. **Intelligent Tactical AI Rallies**: As you move with your fingertip on the touchpad, the AI reads your position—if you camp near the front service line, it lobs a deep clear to your back baseline; if you retreat to the back baseline, it taps a tight drop shot just over the net; if you lean left, it drives or smashes to the open right sideline.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Clean broadcast sports telemetry with side-mounted translucent glass docks (`rgba(8, 15, 29, 0.88)`) framed in subtle neon borders that sit strictly outside the trapezoidal court footprint.
  - *Color Palette & Mood*:
    - `--background`: `#040811` (Deep Arena Obsidian)
    - `--court-surface`: `#0e7c5b` (Unobstructed BWF Tournament Emerald)
    - `--dock-surface`: `#091122` with `1px` functional accent borders (`#6366f1` Clear, `#06b6d4` Drop, `#14b8a6` Drive, `#f59e0b` Smash)
  - *Typography & Hierarchy*:
    - Compact single-line headers (`Outfit` Bold 12px) and `JetBrains Mono` (`tabular-nums`) percentages inside the side docks so controls remain crisp without encroaching on the court.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Exact Closed-Form Ballistic Solver (`calculateShot`) vs. Heuristic Velocity Multipliers**
  - *Chosen Approach*: Solve the exact vertical flight duration `T` (in frames) required for the shuttle to peak safely above the net (`zPeak >= 122`) and land at `z = 0`, then compute horizontal velocities `(vx, vy)` using the exact geometric series of air drag:
    $$v_0 = \frac{\Delta d \cdot (1 - \text{AIR\_DRAG})}{1 - \text{AIR\_DRAG}^T}$$
  - *Why*: Previously, boosting `vz` to clear the net increased total hang-time `T` without scaling down `vy`, causing AI shots to fly past the baseline (`y < 60`). With the closed-form solver, every AI shot and Safety-Locked player shot is mathematically guaranteed to land on the exact target coordinate `(targetX, targetY)` inside the court boundaries.

- **Decision 2: Open-Space Tactical Target Selection in `aiBot.ts`**
  - *Chosen Approach*: Pass the human player's live `(x, y)` coordinates into `aiBot.ts` so the AI selects both the optimal **shot type** (`smash`, `drop`, `clear`, `drive`) and **target coordinates** `(targetX, targetY)` in the quadrant furthest from the human player, clamped with a safe margin (`18` units inside the singles/doubles lines).
  - *Why*: Creates authentic, rewarding badminton tactics where court positioning and recovery after each shot matter.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         TOP BROADCAST SCOREBOARD BAR                         │
│  [Match Setup] 1v1/2v2 Rules │ USA P1 [10] VS [3] Axelsen DEN │ Rally/Speed  │
├──────────────────┬────────────────────────────────────────┬──────────────────┤
│   LEFT MARGIN    │         UNOBSTRUCTED CENTER            │   RIGHT MARGIN   │
│   VERTICAL DOCK  │       3D PERSPECTIVE GREEN COURT       │   VERTICAL DOCK  │
│                  │                                        │                  │
│  ┌────────────┐  │        Top Crowd & BWF Banner          │  ┌────────────┐  │
│  │ Fingertip  │  │      ┌────────────────────────┐        │  │ Power &    │  │
│  │ Touchpad   │  │      │ Far Court (Smart AI)   │        │  │ Safety Bar │  │
│  └────────────┘  │      │                        │        │  ├────────────┤  │
│  ┌────────────┐  │      ├═══════ 3D NET ═════════┤        │  │ CLEAR  [J] │  │
│  │ [1] Smash  │  │      │                        │        │  │ Mid|Deep   │  │
│  ├────────────┤  │      │ Near Court (You)       │        │  ├────────────┤  │
│  │ [2] Slice  │  │      │ 100% Clear Baseline    │        │  │ DROP   [L] │  │
│  ├────────────┤  │      │ Vision & Touchpad      │        │  │ Tight|Push │  │
│  │ [3] Defend │  │      └────────────────────────┘        │  ├────────────┤  │
│  ├────────────┤  │                                        │  │ DRIVE  [U] │  │
│  │ [4] Surge  │  │                                        │  │ Soft|Fast  │  │
│  └────────────┘  │                                        │  ├────────────┤  │
│                  │                                        │  │ SMASH  [K] │  │
│                  │                                        │  │ 75|90|100% │  │
│                  │                                        │  └────────────┘  │
└──────────────────┴────────────────────────────────────────┴──────────────────┘
```

- **Data Model & State**:
  - `BotDecision`: Expanded to return `{ moveX, moveY, jump, swing, power, targetX, targetY }` so the AI explicitly aims at the open quadrant on the player's court.
  - `calculateShot(player, shotType, power, targetX, variants, currentShuttleZ, explicitTargetY)`: Computes exact `(vx, vy, vz)` using the closed-form drag series so the shuttle lands precisely at `(targetX, targetY)` inside the court boundaries.

- **Interactive Component & State Mapping**:
  - **Left Vertical Dock (`ControlsOverlay.tsx`)**: Renders the `Fingertip Pad` and the 4 `Signature Pro Skills` vertically along the left viewport edge (`left-3 top-1/2 -translate-y-1/2`), keeping the center and bottom of the screen completely open.
  - **Right Vertical Dock (`ControlsOverlay.tsx`)**: Renders the `Safety Lock` / `Touchpad Follow` status toggles and the 4 `Tactical Shot Cards` (`Clear`, `Drop`, `Drive`, `Smash`) stacked vertically along the right viewport edge (`right-3 top-1/2 -translate-y-1/2`).
  - **Direct Court Touchpad Tracking (`BadmintonCourt.tsx`)**: With the bottom of the court now 100% unobstructed, sliding your fingertip anywhere over the court smoothly moves `Player 1 (You)` across the entire near court including the back baseline corners.

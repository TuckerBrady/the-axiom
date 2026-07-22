# Audio and Haptics Spec

Sprint 19 -- UX/UI Department

---

## Overview

Two sensory systems that ship together: background music (per-sector
playlists with ship ambient) and haptic feedback (machine heartbeat
plus interaction confirmations). Both are on by default with toggles
in Settings.

---

## Audio Architecture

### Layers

The audio system has two layers that crossfade during transitions:

1. **Ship Ambient** -- plays on Hub, Level Select, Codex, Store, and
   all non-gameplay screens. One consistent track. This is home base.
   The player is on the ship; the ship has a sound.

2. **Sector Playlist** -- plays during gameplay. 2-4 tracks per
   sector that rotate (shuffle, no immediate repeat). Each sector has
   its own audio identity that reinforces its place in the galaxy.

### Crossfade Behavior

- Entering gameplay: ship ambient fades out over 0.8s, sector track
  fades in over 0.8s. Overlap creates a smooth blend.
- Exiting gameplay (scoring page CONTINUE, back button, abandon):
  sector track fades out over 0.8s, ship ambient fades in over 0.8s.
- The crossfade is volume-based. Both Audio.Sound instances stay
  loaded; only volume changes.

### Sector Audio Identity

| Sector | Vibe | Tempo | Character |
|--------|------|-------|-----------|
| Axiom | Warm lo-fi synthwave | 70-85 BPM | Approachable, safe, inviting. Learning to be an Engineer. |
| Kepler Belt | Cooler, more spacious | 75-90 BPM | Wider synths, more complex beats, cosmic atmosphere. Venturing further out. |
| Deep Void | Dark, tense | 65-80 BPM | Lower frequencies, minor keys, warmth pulls back. COGS gets serious. |

Axiom tracks (approved):
- 80x Chill Synthwave -- SigmaMusicArt (Pixabay, 2:17)
- 80s Retro Synthwave -- Playsound (Pixabay, 4:28)
- Midnight Run 90s Synthwave -- lofidreams (Pixabay, 4:38)
- Synthwave 80s Background -- Audioknap (Pixabay, 2:13)

Kepler and Deep Void tracks sourced when those sectors ship.

Ship ambient: TBD -- one track from the drone/atmospheric category.
Candidates: Cinematic Space Drone (Good_B_Music), Drone Deep Ambient
(RomanSenykMusic).

### Licensing

All tracks sourced from Pixabay Music. Pixabay license permits
commercial use in mobile applications without attribution. No
royalty obligations. License terms verified April 2026.

If Pixabay does not cover a sector adequately, fallback to Fiverr
commission ($100-200 for 3-4 custom tracks with explicit commercial
licensing).

### Player Controls

- Music volume slider in Settings (0-100%, default 80%)
- Sound effects volume slider in Settings (0-100%, default 100%)
- Haptics toggle in Settings (on/off, default on)
- Respects iOS device mute switch (silent mode = no audio)
- Audio pauses on app background, resumes on foreground

### Implementation

Stack: expo-av (Audio.Sound API).

Global audio manager service (`src/services/audioManager.ts`):
- Singleton pattern, initialized at app startup
- Manages two Audio.Sound slots (ambient + gameplay)
- Exposes: playAmbient(), playGameplay(sector), stopAll(),
  setMusicVolume(n), crossfade()
- Tracks current sector to avoid reloading same playlist
- Handles app state changes (pause on background)
- Preloads next track in playlist during current playback

Audio files stored in `assets/audio/`:
- `assets/audio/ambient/` -- ship ambient tracks
- `assets/audio/axiom/` -- Axiom sector gameplay tracks
- `assets/audio/kepler/` -- Kepler sector gameplay tracks (future)
- `assets/audio/void/` -- Deep Void sector gameplay tracks (future)

---

## Haptics Architecture

### Philosophy

Haptics are felt, not noticed. They confirm actions and create
tactile rhythm without breaking flow state. The machine is alive
every time it runs.

### Impact Mapping

**Light impact** (subtle confirmation):
- Placing a piece on the board
- Tapping Config Node to cycle configValue
- Rotating a Conveyor
- Scrolling through level select nodes
- Dismissing a tutorial hint
- Returning a piece to tray (long press)

**Medium impact** (meaningful moment):
- Engage button press
- Signal reaching Terminal (success arrival)
- Star reveal on scoring page (one tap per star)
- Collecting credits

**Heavy impact** (dramatic beat):
- Void state (machine failure)
- Wrong output result
- Blown cell (piece overloaded)
- 3-star level completion

**No haptics** (would be distracting):
- Wire glow animations
- Tape cell updates during beam travel
- Background UI navigation (Hub, Store, Codex)
- COGS dialogue display
- Tutorial overlay transitions

### Machine Heartbeat

The signature haptic pattern. When the beam travels through the
machine, each piece it reaches triggers a light haptic tap. The
player feels the machine working.

Design principles:

1. **One pulse per piece, not per wire segment.** A typical path
   hits 5-8 pieces over 2-3 seconds. That is 5-8 light taps --
   feels like a heartbeat. Pulsing on every wire segment would
   produce 15-20 taps and feel like a phone notification.

2. **Taper the intensity.** All piece-arrival taps are light impact.
   The Terminal arrival is medium impact -- the payoff. The player
   feels the machine build toward its conclusion.

3. **Nothing during charge phase.** The 0.6s charge-up before beam
   launch is visual tension. Adding haptics there releases the
   tension too early. Let the beam launch be the first thing the
   player feels.

4. **Multi-pulse restraint.** On a 6-pulse level, the heartbeat
   repeats 6 times. Keep the per-piece taps barely-there. The
   player should notice if paying attention and not notice if
   focused on watching tape values.

5. **Every run gets its heartbeat.** The machine is alive every
   time it runs. First attempt, fifth retry, replay after
   completion -- always. No skipping.

### Implementation

Stack: expo-haptics.

Haptic triggers are placed in the existing animation/interaction
code, not in a separate system:

- Piece placement: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
  in handleCanvasTap after successful placement
- Config Node tap: same, in handlePieceTap configNode branch
- Engage press: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
  at start of handleEngage
- Beam piece arrival: `Haptics.impactAsync(ImpactFeedbackStyle.Light)`
  in the beam animation step callback (runPieceInteraction or
  equivalent in engagement/interactions.ts)
- Terminal arrival: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
  in the terminal success step
- Void/failure: `Haptics.impactAsync(ImpactFeedbackStyle.Heavy)`
  in handleVoidFailure
- Star reveal: `Haptics.impactAsync(ImpactFeedbackStyle.Medium)`
  per star in the scoring animation sequence

All haptic calls gated by a settings check:
```typescript
if (useSettingsStore.getState().hapticsEnabled) {
  Haptics.impactAsync(ImpactFeedbackStyle.Light);
}
```

Or wrap in a utility:
```typescript
// src/utils/haptics.ts
export function hapticLight() { ... }
export function hapticMedium() { ... }
export function hapticHeavy() { ... }
```

---

## Settings UI

Add to existing Settings screen:

- **Music** -- slider, 0-100%, default 80%
- **Sound Effects** -- slider, 0-100%, default 100% (future SFX)
- **Haptics** -- toggle, default on

Store in useSettingsStore (Zustand + AsyncStorage persistence).

---

## Rollout

Phase A (ship with refactor): Audio manager + Axiom playlist +
ship ambient + music volume setting.

Phase B (ship with Kepler): Kepler playlist + haptic system +
haptics toggle + sound effects slider (placeholder for future SFX).

Phase C (future): Deep Void playlist, SFX layer (piece placement
clicks, beam whoosh, terminal chime, void alarm).

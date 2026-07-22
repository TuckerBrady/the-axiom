# Copy Review — PR #34 (feat/a17-spec-out-and-anim)
# Extracted 2026-07-22 for Tucker sign-off

All player-facing copy added or changed on this branch vs master.
Marked [PROPOSED] in source where applicable. Do not approve or edit here — return decisions to Cowork.

---

## 1. Min-pieces hard-floor rejection line (COGS)

**File:** `src/game/engagement/requiredPiecesDialogue.ts:78`
**Context:** Shown when a completing run passes the output gate but engages fewer player-placed pieces than `level.minPieces`. Displayed in the "required not engaged" modal. Fires after the win check; consumes a life (non-Axiom).
**Status:** [PROPOSED]

> It works. It is also barely a machine. The corridor does not reward the minimum out here. It survives on the parts you add because you understand the load. Build something that could take a fault and keep routing. Then run it again.

---

## 2. A1-1 — Spec Sheet intro tutorial step (last step of opening walkthrough)

**File:** `src/game/levels.ts:164`
**Context:** Final COGS tutorial step in A1-1 before the Engineer can freely interact. Points at the Spec Sheet (top-right info button). Added as part of the Spec Sheet tutorial integration (commit ac42c8f).

> I am routing the job's tasking to your console. The specifications were always on file. You simply had no reason to read them. Now you do. Top right, when you want them.

---

## 3. K1-1 — Arc Wheel onboarding tutorial steps (4 steps, all PROPOSED)

**File:** `src/game/levels.ts:794–802`
**Context:** Kepler sector introduction. K1-1 is the first level with the Arc Wheel instead of the Axiom tray. These four steps teach the wheel before the existing "No placement highlights" step.
**Status:** [PROPOSED]

**Step 1 — wheel-intro** (`levels.ts:794`):
> Requisitions complete. The parts you ordered are loaded here — on the wheel. Out here the manifest is not a tray along the bottom of the board anymore. It is this. One piece at center at a time.

**Step 2 — wheel-scroll** (`levels.ts:796`):
> Swipe the wheel to bring a piece to the center. The one in the middle is the one you are holding. You will not see every part at once — that is the trade for the room it gives the board.

**Step 3 — wheel-drag** (`levels.ts:798`):
> Press and hold a piece, then drag it onto the board and release. No more tapping the grid. The wheel hands the piece to you directly.

**Step 4 — wheel-forfeit** (`levels.ts:800`):
> Anything left on the wheel when the mission ends is forfeited — used or not. Requisition what the machine needs. Nothing more.

---

## 4. K1-4 — Level description (PROPOSED)

**File:** `src/game/levels.ts:891`
**Context:** Level card / Spec Sheet description. Was "Output each input value using Latch as dynamic per-pulse memory." Replaced in fun-pass rebuild to reflect BLANK-masking mechanic.
**Status:** [PROPOSED]

> Relay only the active pulses. The Latch stores each pulse and a Config gate forwards it only when it carries signal; idle pulses stay dark.

---

## 5. K1-4 — Consequence copy (cogsWarning + failureEffect)

**File:** `src/game/levels.ts:898–899`
**Context:** Consequence block. Shown as pre-engage warning (cogsWarning) and post-failure log (failureEffect). Was "Pay attention to this one." / "Mining Platform Alpha relay failure. Seven settlements lost communication for forty-eight hours."

**cogsWarning** (`levels.ts:898`):
> Mining Platform Alpha is carrying more than it was built to carry. If the relay drops, it does not fail quietly. The colonists routing through it lose their signal path before they know it is gone. I am stating the stakes once. Proceed.

**failureEffect** (`levels.ts:899`):
> The platform relay dropped. Four settlements on the Alpha branch lost signal routing for the duration. They reverted to manual relay, the way they did before this ship arrived. No casualties logged. I am logging the interruption. They will have noticed it.

---

## 6. K1-5 — Tutorial step board-intro (modified)

**File:** `src/game/levels.ts:971`
**Context:** First COGS tutorial step at K1-5 (Splitter level). Added mention of blown/damaged cells.

> The resupply chain has four relay nodes. All degraded. Some cells on this board are already blown — scarred, unusable. Build around them. The board splits the signal into two routes; something downstream needs to bring them back together.

**K1-5 — Tutorial step Splitter codex reveal** (`levels.ts:973`):
> One input. Two outputs. The signal takes both routes at once. I never catalogued this one properly. Doing it now.

---

## 7. K1-6 — Tutorial steps (2 new steps)

**File:** `src/game/levels.ts:1014–1016`
**Context:** K1-6 (Colonist Hub — Merger level). Two tutorial steps added.

**board-intro** (`levels.ts:1014`):
> The Colonist Hub. Thirty-one settlements depend on what gets built here. Nothing on this board is new. The Latch holds the value. The Splitter forks the path. The Merger brings it back. The work is in combining them.

**board-resume** (`levels.ts:1016`):
> The Hub will not accept a straight line. A Splitter and a Merger are both required, and both must carry signal. Build the branch. Then run it.

---

## 8. K1-7 — Consequence copy (cogsWarning + failureEffect)

**File:** `src/game/levels.ts:1085–1086`
**Context:** K1-7 (transit gate — Bridge level). Was "Do not fail here. I will not elaborate." / short failure text.

**cogsWarning** (`levels.ts:1085`):
> The transit gate sorts everything moving through this corridor, including traffic that stopped existing years ago. If the routing logic fails, live traffic gets queued behind ghosts. Nothing collides. Everything waits. Hold the routing clean. Proceed.

**failureEffect** (`levels.ts:1086`):
> The gate routing collapsed back to its default table. Live corridor traffic queued behind transit records for ships that no longer exist. The backlog cleared on its own in time. No vessel was lost. The gate kept faithfully directing the dead. I have left that observation in the log without further comment.

---

## 9. K1-7 — Tutorial steps (2 new steps)

**File:** `src/game/levels.ts:1096–1098`
**Context:** K1-7 (Bridge level).

**board-intro** (`levels.ts:1096`):
> The transit gate. Bridge and Latch in one machine. Two paths cross without touching, and a stored value decides what passes. Every piece here has been used before. Not together. Not under this much load.

**board-resume** (`levels.ts:1098`):
> Bridge, Latch, Splitter, Merger. All four are required. The gate routes ghost traffic if any of them is missing. Build the full architecture. Hold the routing clean.

---

## 10. K1-9 — Level description (modified)

**File:** `src/game/levels.ts:1111`
**Context:** K1-9 (The Narrows — Latch Delay level). Was "XOR of current input and previously stored Latch value." Rebuilt as shift register (one-pulse delay).

> Output each pulse the value of the previous pulse — a one-pulse delay.

---

## 11. K1-9 — Tutorial steps (3 new steps)

**File:** `src/game/levels.ts:1138–1142`
**Context:** K1-9 (The Narrows).

**board-intro** (`levels.ts:1138`):
> The Narrows. Maximum interference. The output here is not the current signal. It is the one before it. Each pulse carries forward the value of the pulse that preceded it. A one-step delay.

**latch-delay-codex** (`levels.ts:1140`):
> The Latch has a third mode. Write holds a value. Read returns it. Delay does both at once — it hands back what it held last, then stores what just arrived. Tap the Latch through to Delay.

**board-resume** (`levels.ts:1142`):
> The first pulse outputs nothing. There is no previous value yet. After that, every output is the input that came before it. Build the delay. The Narrows remembers by one.

---

## 12. K1-10 — Level description (PROPOSED)

**File:** `src/game/levels.ts:1160`
**Context:** Boss level description on the level card / Spec Sheet. Was "Running count machine: output 1 when two or more consecutive 1s seen." Rebuilt as temporal-OR.
**Status:** [PROPOSED]

> Hold the signal. Output 1 if the current pulse OR the one before it carried signal — the routing must not drop a pulse the instant it ends.

---

## 13. K1-10 — Consequence copy (cogsWarning + failureEffect)

**File:** `src/game/levels.ts:1206–1207` (consequence block)
**Context:** Was "Do not fail here. I will not elaborate." / "Central Hub failure. The corridor is offline. Three hundred and fourteen colonists lost scheduled resupply access for eleven days."

**cogsWarning** (`levels.ts:1206`):
> The Central Hub is the corridor's single point of failure. There is no redundancy. If this routing does not hold, it does not degrade gracefully. It drops. Three hundred thousand people are downstream of the work you are about to do. I am not saying that to apply pressure. I am saying it because it is the situation, and you should have it before you begin. Proceed.

**failureEffect** (`levels.ts:1207`):
> The relay failure has been logged with the transit authority. Three hundred and fourteen colonists lost scheduled resupply access for eleven days. The transit authority has filed a negligence inquiry against this vessel. I would suggest we resolve the inquiry through competence rather than correspondence. The systems are repairable.

---

## 14. K1-10 — Tutorial steps (2 modified/new)

**File:** `src/game/levels.ts:1211–1213`
**Context:** K1-10 boss tutorial.

**board-intro** (`levels.ts:1211`) — modified:
> The Central Hub. Twelve columns. The largest board in this sector. The routing here cannot drop a signal the moment a pulse ends — it has to hold one step. Everything you have learned in this corridor is on the manifest. Nothing here is new.

**board-resume** (`levels.ts:1213`) — modified:
> Output carries signal if this pulse OR the one before it did. Split the signal: one path forward, one path through a Latch in Delay to hold the previous pulse. A Merger brings them back together. Three hundred thousand people are downstream. Build it correctly.

---

## 15. NF-1 — Level description

**File:** `src/game/levels.ts:1286` (approximate — NF-1 block)
**Context:** Nova Fringe sector, level NF-1 (Outer Marker — Inverter introduction). New level.

> Output the logical inverse of each input value using an Inverter.

---

## 16. NF-1 — cogsLine

**File:** `src/game/levels.ts:1283`
**Context:** Ambient COGS line shown at NF-1 board entry.

> Nova Fringe. This is where the official charts stop. We have supplementary charts. They are not official. I do not know who made them. They are accurate.

---

## 17. NF-1 — Tutorial steps (3 steps)

**File:** `src/game/levels.ts:1307–1312`
**Context:** NF-1 Inverter onboarding.

**board-intro** (`levels.ts:1307`):
> Nova Fringe. The objective here is not to pass the signal through. It is to flip it. Every 1 becomes a 0. Every 0 becomes a 1. The board has a piece that does exactly that.

**inverter-codex** (`levels.ts:1309`):
> A logic gate. It does not decide what the correct value is. It only knows what the current value is not. Cataloguing it.

**board-resume** (`levels.ts:1312`):
> The Inverter flips the bit. The Transmitter writes the inverse. Route the path from the Source through both to the Terminal.

---

## 18. Replay Tutorial — Settings screen label

**File:** `src/screens/SettingsScreen.tsx:433`
**Context:** Toggle row in GAMEPLAY section of Settings. Lets the player re-arm the A1-1 tutorial walkthrough.

**label:** `Replay Tutorial`
*(No sub-label / description text is shown for this row in the current implementation.)*

---

## Summary table

| # | Location | Type | Status |
|---|----------|------|--------|
| 1 | requiredPiecesDialogue.ts:78 | COGS rejection line (min-pieces) | [PROPOSED] |
| 2 | levels.ts:164 | A1-1 tutorial step (Spec Sheet intro) | needs sign-off |
| 3 | levels.ts:794–802 | K1-1 Arc Wheel onboarding (4 steps) | [PROPOSED] |
| 4 | levels.ts:891 | K1-4 description | [PROPOSED] |
| 5 | levels.ts:898–899 | K1-4 consequence (cogsWarning + failureEffect) | needs sign-off |
| 6 | levels.ts:971–973 | K1-5 tutorial steps (2 modified/new) | needs sign-off |
| 7 | levels.ts:1014–1016 | K1-6 tutorial steps (2 new) | needs sign-off |
| 8 | levels.ts:1085–1086 | K1-7 consequence (cogsWarning + failureEffect) | needs sign-off |
| 9 | levels.ts:1096–1098 | K1-7 tutorial steps (2 new) | needs sign-off |
| 10 | levels.ts:1111 | K1-9 description | needs sign-off |
| 11 | levels.ts:1138–1142 | K1-9 tutorial steps (3 new) | needs sign-off |
| 12 | levels.ts:1160 | K1-10 description | [PROPOSED] |
| 13 | levels.ts:1206–1207 | K1-10 consequence (cogsWarning + failureEffect) | needs sign-off |
| 14 | levels.ts:1211–1213 | K1-10 tutorial steps (2 modified) | needs sign-off |
| 15 | levels.ts:~1286 | NF-1 description | needs sign-off |
| 16 | levels.ts:1283 | NF-1 cogsLine | needs sign-off |
| 17 | levels.ts:1307–1312 | NF-1 tutorial steps (3 new) | needs sign-off |
| 18 | SettingsScreen.tsx:433 | "Replay Tutorial" setting label | needs sign-off |

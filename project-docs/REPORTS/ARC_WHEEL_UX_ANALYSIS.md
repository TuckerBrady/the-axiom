# ARC WHEEL vs VERTICAL TRAY — UX Analysis
### PRISM Report | May 2026

---

## The Question

Which piece-selection pattern better serves The Axiom's core philosophy: "the joy is building elaborate, interesting machines — not finding the minimum solution"?

Two candidates:

**Arc Wheel** — A vertical pill anchored to the screen edge (left or right, configurable). Shows 5 nodes at a time with depth-scaled sizing: the selected piece is largest, neighbors shrink with distance. Vertical swipe scrolls. Dismissible off-screen. Fades to 18% opacity when idle, activates on touch. Corner brackets on the selected node. Staggered entrance animation.

**Vertical Tray** — A horizontal strip docked to the bottom of the screen, 72px tall. All available piece types visible simultaneously in a scrollable row. Each cell shows the piece icon, count badge, and cost. Tap to select, tap again to deselect.

---

## Evaluation

### 1. Elaboration Encouragement

The soul of the game says the player who builds a beautiful 12-piece machine is playing correctly; the player who finds the 5-piece shortcut is missing the point. The piece selector is where the Engineer decides what to build WITH. It shapes creative intent.

**Arc Wheel:** Shows 5 pieces at a time with one hero node. Scrolling through pieces is a deliberate, sequential act — the Engineer encounters each piece individually, which gives each piece a moment of consideration. The wheel's physicality (swipe to browse, nodes scaling in and out) makes piece selection feel like spinning through a parts catalog. There is a browsing quality here that the tray lacks.

However, the wheel hides most of the inventory. With 20 piece types across two categories (Physics and Protocol), the Engineer cannot see the full landscape of what is available. This is a problem for elaboration: you cannot be inspired by a piece you forgot exists. The wheel rewards knowing what you want; the tray rewards discovering what you could use.

**Vertical Tray:** All pieces visible at once (or with minimal scrolling). The Engineer sees the full palette. This is how a workbench works — everything laid out, inviting combination. When the tray shows 8-10 pieces simultaneously, the Engineer can visually pattern-match: "I have two Gears, a Splitter, and three Conveyors — what if I...?" That gestalt view is where creative impulse lives.

The tray is less theatrical but more generative. It treats pieces as a palette, not a menu.

**Score: Wheel 6/10, Tray 8/10.** The tray's at-a-glance visibility is a stronger driver of creative exploration. The wheel's sequential browsing has charm but constrains the creative field of view.

---

### 2. Build-Fail-Learn Loop

Failure is the curriculum. When the machine fails, the Engineer returns to rebuild. The piece selector mediates every rebuild cycle. It needs to make iteration feel like a workshop session, not a chore.

**Arc Wheel:** On rebuild, the Engineer must scroll back to the piece they want. If the failure diagnostic says "the data had nowhere to persist between pulses" and the Engineer realizes they need a Scanner, they must scroll the wheel to find it. This adds friction to the learn-act transition. Every extra swipe between "I know what I need" and "I have it selected" is friction that cools the insight.

The wheel's idle fade (18% opacity after 2 seconds) means the Engineer loses visual contact with their inventory between interactions. On re-engagement, there is a re-orientation cost: where was I in the list?

**Vertical Tray:** One tap. The Engineer sees the Scanner, taps it, places it. The loop from insight to action is as short as possible. The tray is always visible, always oriented. No scrolling to find what you already know you need.

For the build-fail-learn loop specifically, the tray's low-friction selection is a significant advantage. The moment of insight after failure is fragile — the UI should not get in the way.

**Score: Wheel 4/10, Tray 9/10.** The tray preserves momentum through the rebuild cycle. The wheel adds friction at the worst possible moment.

---

### 3. Visual Identity

Y2K translucent aesthetic. Rube Goldberg machines in space. Signal beams, corner brackets, COGS eye states. The UI should feel like operating a spacecraft instrument panel.

**Arc Wheel:** The pill shape, depth-scaled nodes, corner brackets on the selected piece, staggered entrance animation, dismiss/recall slide — this is a gadget. It feels like a component OF the machine the Engineer is building. The 85% opacity dark background with the blue border glow reads as a translucent instrument. The idle fade creates a sense of the wheel being alive, present but dormant until needed. The recall strip (a thin glowing line at the screen edge) is a beautiful detail.

This is the wheel's strongest argument. It does not look like a UI element. It looks like part of the Axiom.

**Vertical Tray:** Functional. Clean. The bottom strip with its border-top glow is consistent with the HUD chrome, but it reads as interface, not instrument. It is a toolbar. Every mobile game has a toolbar. The tray does not contribute to the fiction.

**Score: Wheel 9/10, Tray 5/10.** The wheel is a piece of the world. The tray is a piece of the UI. In a game where aesthetic is load-bearing, this matters.

---

### 4. Screen Real Estate

iPhone 15 Pro Max: 390x844 logical points. The board needs maximum space. The tape bar sits at the top. The engage button row sits at the bottom. Every pixel of vertical space is contested.

**Arc Wheel:** 72px wide, positioned at the screen edge. Overlaps the board laterally but does not consume vertical space. The board can extend the full height of the play area. The wheel is dismissible — swipe it off-screen and the board has zero obstruction. The recall strip is only 5px wide.

The trade-off: 72px of horizontal board space is partially occluded on one side. On a 390px-wide screen, that is 18% of the width. For boards with pieces near the wheel edge, this creates a potential interaction conflict (tapping a board cell near the wheel vs scrolling the wheel).

**Vertical Tray:** 72px tall, consuming vertical space below the board. On an 844px screen with tape bar (~60px), status bar (~50px), and engage button row (~56px), the board gets roughly 606px of height. With the tray, that drops to ~534px. That is a 12% reduction in board height.

For larger boards (8x8 Kepler levels), that vertical space is critical. Cells get smaller. Precision suffers. The tray creates a fixed tax on the most important element on screen.

**Score: Wheel 7/10, Tray 5/10.** The wheel trades horizontal edge space (partially occluded, dismissible) for full vertical board height. The tray permanently taxes the vertical axis where space is most scarce. The wheel's dismissibility is a decisive advantage.

---

### 5. Discoverability

20 piece types, two categories (Physics amber, Protocol blue). The expanding tray from Kepler Belt adds purchasable pieces beyond the pre-assigned set. The Engineer needs to understand what is available, what they have, and what they could buy.

**Arc Wheel:** Sequential access. The Engineer sees 5 of 20 pieces at any time. For a new player encountering 10+ piece types for the first time in Kepler, the wheel requires them to scroll through every piece to build a mental model of their inventory. The color-coded borders (amber for pre-assigned, blue for requisitioned, purple for tapes) help, but only for the 5 visible nodes.

Category switching is implicit — Physics and Protocol pieces are mixed in the scroll order. The Engineer cannot quickly scan "all my Protocol pieces."

**Vertical Tray:** All pieces visible (or nearly so with one scroll gesture). Category grouping is immediately apparent from the color coding across the full row. Count badges show inventory at a glance. Cost labels show the economy at a glance. The Engineer builds a complete mental model in one look.

For the expanding tray mechanic specifically — where the Engineer must assess what they have vs what they could buy — the tray's all-at-once visibility is far superior. The requisition decision ("what am I missing?") requires seeing the full picture.

**Score: Wheel 3/10, Tray 9/10.** Discoverability is the wheel's weakest dimension. The tray wins decisively for inventory comprehension.

---

### 6. Tactile Feel

This is touched constantly. Select, place, re-select, place, scroll, re-select. The interaction must be fast, precise, and satisfying under repeated use.

**Arc Wheel:** Scroll to browse, tap to select, long-press to drag. The scroll gesture has haptic feedback on each node transition. The depth-scaling animation as nodes grow/shrink during scroll is satisfying. The entrance animation (staggered, alternating above/below) sets a tone of mechanical precision.

But: the 180ms drag hold timer means the Engineer must be deliberate about tap vs long-press. Under rapid iteration (place, scroll, select, place), the wheel requires more gesture precision than the tray. The 2-second idle timeout means re-engagement after a pause requires an extra tap.

**Vertical Tray:** Tap to select, tap board to place. Two-gesture loop. No ambiguity between tap and scroll. No idle state to wake from. The interaction is maximally simple and maximally fast.

Under sustained use (placing 8-12 pieces in a build session), the tray's simplicity compounds. The wheel's scroll-select loop adds 1-2 seconds per piece selection. Over 10 pieces, that is 10-20 seconds of pure UI friction.

**Score: Wheel 6/10, Tray 8/10.** The wheel feels more premium but the tray is faster under sustained use. For a building game where piece selection is the most frequent interaction, speed wins.

---

## Soul Alignment

The soul says: "the joy is building elaborate, interesting machines." The piece selector's job is to serve that joy.

The wheel serves the FEELING of building. It is a gadget, an instrument, a piece of the world. It makes piece selection feel like operating machinery. It contributes to the fantasy.

The tray serves the ACT of building. It minimizes friction between creative intent and creative action. It shows the full palette. It keeps the Engineer in flow.

These are different aspects of the same soul. The question is which matters more: the feeling of the tool, or the function of the tool.

For a game where the core loop is build-fail-learn-rebuild, and where the scoring system explicitly rewards building MORE (elaborate machines earn more stars, more credits), the speed of the creative loop is paramount. Every second of UI friction is a second not spent building. The tray serves the soul's FUNCTION better.

But the wheel serves the soul's IDENTITY better. The Axiom is not just a puzzle game with good UX. It is a space where machines feel real, where every interaction contributes to the fiction of being an Engineer operating spacecraft equipment. A toolbar at the bottom breaks that fiction. The wheel sustains it.

---

## Hybrid Consideration

The existing codebase already hints at a hybrid: Axiom tutorial levels use the Arc Wheel for focused piece introduction, while non-tutorial Axiom levels use the PieceTray. This is not accidental — it recognizes that the wheel excels at FOCUS (one piece, hero treatment, dramatic entrance) while the tray excels at SELECTION (many pieces, browse, choose).

A refined hybrid:

**The Carousel Tray.** Keep the tray's bottom-docked position and all-at-once visibility, but steal the wheel's visual language. Instead of flat rectangular cells, use the wheel's depth-scaled circular nodes. The selected piece gets the hero treatment (larger, corner brackets, label). Neighbors scale down slightly. The tray background gets the wheel's translucent pill treatment. Entrance animation staggers from center outward.

This gives you: tray's discoverability and speed, wheel's visual identity and tactile richness. The tray stops being a toolbar and starts being an instrument panel.

However: this is a third design requiring new implementation, new testing, and new edge-case discovery. It does not exist yet. The question asked is wheel vs tray as they are.

**The better hybrid (no new component):** Use the wheel as the PRIMARY piece selector for Kepler+ levels. Keep the tray for Axiom (where piece counts are small and the tray works fine). Add one enhancement to the wheel: a quick-access strip. When the wheel is active, a thin horizontal row of dot indicators appears at the bottom of the wheel showing all pieces as colored dots. Tap a dot to jump the wheel to that piece. This preserves the wheel's visual identity while solving its discoverability problem.

---

## Recommendation

**Use the Arc Wheel for Kepler+ levels. Keep the PieceTray for Axiom.**

This is already the architecture in the codebase, and it is the right one. Here is why:

The wheel's weaknesses (discoverability, rebuild friction, sequential access) are real but contextual. They are worst when the Engineer has many unfamiliar pieces and is iterating rapidly on a brand-new concept. That describes Axiom — the tutorial sector where everything is new.

By Kepler Belt, the Engineer KNOWS the pieces. They have built dozens of machines. They do not need to see all 10 Physics pieces to remember that Gears exist. They need to scroll to the one they want and place it. The wheel's sequential browsing is a liability for novices but neutral for experienced Engineers.

Meanwhile, the wheel's strengths (visual identity, screen real estate, dismissibility, aesthetic) compound with experience. The Engineer who has mastered piece selection and is now building elaborate 15-piece machines benefits from the wheel's board-preserving layout and its contribution to the spacecraft fantasy.

The soul of the game is building elaborate machines. The wheel is the right instrument for an experienced builder. The tray is the right instrument for a learner. The game already transitions from one to the other.

**One investment to make:** Add a piece-category quick-jump to the wheel (e.g., tap the wheel border to toggle between Physics and Protocol pieces, or add a minimal dot-strip index). This directly addresses the discoverability gap without sacrificing the wheel's visual identity. The expanding tray mechanic in Kepler (where purchased pieces join the wheel) needs the Engineer to be able to assess their full inventory quickly. The wheel as-built does not support that well enough.

**Do not replace the wheel with the tray for Kepler+.** Tucker's instinct is correct: the wheel is cooler, it fits the soul, and its weaknesses are manageable with a targeted enhancement. The tray is the right tool for Axiom's teaching context, not for the game's expressive core.

---

*PRISM — The Axiom UX Analysis*

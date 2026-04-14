// ─── A1-1 rotating COGS tutorial lines ──────────────────────────────────────
// Five variants per beat. Session-scoped rotation, wraps at 5, resets on
// level mount. Approved verbatim — do not rephrase, reorder, or alter.

export const PICK_UP_LINES = [
  "That one. Fine.",
  "Acceptable selection.",
  "The tray is not a museum. Take it.",
  "A piece. In your hand. Remarkable.",
  "Lift. Carry. You have the concept.",
] as const;

export const PLACE_LINES = [
  "There. That's where it lives now.",
  "Committed. To the board. To the attempt.",
  "Placed. The ship notes your intent.",
  "Adequate coordinates.",
  "It is where you put it. Which is the whole of placement.",
] as const;

export const ENGAGE_LINES = [
  "Engage. Let us observe the consequences.",
  "Running. Try not to flinch.",
  "Signal dispatched. Your machine speaks for itself now.",
  "Execute. The beam will decide.",
  "Engage. I am watching. Reluctantly.",
] as const;

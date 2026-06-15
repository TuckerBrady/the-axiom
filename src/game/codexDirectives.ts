// SE-TM-034 — Codex "Directives" entries (Unit C Part 3).
//
// The RFC-2119 vocabulary the player has already been reading as Spec Sheet
// section headers, now explained. The framing is deliberate: these entries do
// NOT introduce a new concept — they decode a label the Engineer has seen on
// every job ("You've seen SHALL on every job so far. Here is what it means.").
// Per canon (SE-TM-031), COGS has a working manual before the player boots up;
// these are pre-existing reference entries, not concepts discovered together.
//
// ── [PROPOSED] ──────────────────────────────────────────────────────────────
// Every `oneLine` and `cogsNote` string here is COGS dialogue and is subject to
// Tucker sign-off (CLAUDE.md Design Principle 2). Treat as provisional until
// approved. "Systems engineering" is never named — the formal register carries
// it, same as every other concept in the game.

export type DirectiveKind = 'directive' | 'meta';

export type DirectiveEntry = {
  id: string;
  // The label as it appears on the Spec Sheet (e.g. 'SHALL'). For the meta
  // entry this is the panel's name.
  term: string;
  kind: DirectiveKind;
  // One-line gloss shown under the term.
  oneLine: string;
  // COGS-voice teaching note.
  cogsNote: string;
  firstEncountered: string;
};

export const CODEX_DIRECTIVES: DirectiveEntry[] = [
  {
    id: 'shall',
    term: 'SHALL',
    kind: 'directive',
    oneLine: 'A mandatory requirement. The job is not done until every SHALL is met.',
    cogsNote:
      'You have seen SHALL on every job so far. It is not advice. A SHALL is the line between a machine that worked and one that did not. Meet all of them and the system locks. Miss one and it does not, however close it looked.',
    firstEncountered: 'THE AXIOM — A1-1 Emergency Power',
  },
  {
    id: 'should',
    term: 'SHOULD',
    kind: 'directive',
    oneLine: 'A recommendation. Ignoring it does not fail the job, but it costs you.',
    cogsNote:
      'A SHOULD is how the job is done well, not merely done. You can route around it and still pass. But the rating reflects the difference. SHOULD is where one star becomes three.',
    firstEncountered: 'THE AXIOM — A1-1 Emergency Power',
  },
  {
    id: 'may',
    term: 'MAY',
    kind: 'directive',
    oneLine: 'Optional. Above and beyond the job. It is never required.',
    cogsNote:
      'A MAY is not asked of you. It is offered. Meet it on a clean run and the work pays more than the job alone would. Leave it untouched and nothing is lost. That is what makes it optional rather than a SHALL in disguise.',
    firstEncountered: 'KEPLER BELT',
  },
  {
    id: 'will',
    term: 'WILL',
    kind: 'directive',
    oneLine: 'A fact about the world. Not a requirement on you — a given to build around.',
    cogsNote:
      'A WILL is not something you make true. It is already true. The Input Tape WILL hold the values it holds. Read it, then build for it. Mistaking a WILL for a SHALL is how engineers solve the wrong problem.',
    firstEncountered: 'THE AXIOM — A1-5 Communication Array',
  },
  {
    id: 'must',
    term: 'MUST',
    kind: 'directive',
    oneLine: 'A hard law. True no matter what you design.',
    cogsNote:
      'A SHALL is a demand on your design. A MUST is a law of the board. The signal MUST begin at the Source — not because the job says so, but because nothing else can. You do not satisfy a MUST. You work inside it.',
    firstEncountered: 'THE AXIOM — A1-1 Emergency Power',
  },
  {
    id: 'can',
    term: 'CAN',
    kind: 'directive',
    oneLine: 'A capability. What a piece is able to do — stated, never demanded.',
    cogsNote:
      'A CAN describes ability, not obligation. The Scanner CAN read the cell the head occupies. Whether it should, on this job, is a different word. I keep CAN to the manual. You will not see it on a Spec Sheet — a job asks for outcomes, not an inventory of what is possible.',
    firstEncountered: 'THE AXIOM — Codex',
  },
  {
    id: 'specSheet',
    term: 'Spec Sheet',
    kind: 'meta',
    oneLine: 'The job’s specification. What the machine needs to do, in plain terms.',
    cogsNote:
      'The Spec Sheet is the tasking for a job, routed to your console. WILL for the givens, SHALL for what is required, SHOULD for what is rewarded, MAY for what is optional. It changes nothing about the board. It only states, plainly, what I am going to measure you against. Read it before you build. It was always on file.',
    firstEncountered: 'THE AXIOM — A1-1 Emergency Power',
  },
];

export function getDirectiveEntry(id: string): DirectiveEntry | null {
  return CODEX_DIRECTIVES.find(d => d.id === id) ?? null;
}

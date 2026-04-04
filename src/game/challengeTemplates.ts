import type { PieceType } from './types';

// ─── Template types ──────────────────────────────────────────────────────────

export type Difficulty = 'easy' | 'medium' | 'hard' | 'expert';

export type SolutionShape = 'straight' | 'bend_down' | 'bend_up' | 'double_bend' | 'split_rejoin' | 'zigzag';

export type SourcePosition = 'left' | 'top_left' | 'bottom_left';
export type OutputPosition = 'right' | 'top_right' | 'bottom_right';

export type PatternDefinition = {
  sourcePosition: SourcePosition;
  outputPosition: OutputPosition;
  solutionShape: SolutionShape;
  requiredPieceTypes: PieceType[];
  optimalPieceCount: number;
};

export type PiecePoolEntry = {
  type: PieceType;
  countRange: [number, number];
};

export type PuzzleTemplate = {
  id: string;
  name: string;
  difficulty: Difficulty;
  gridWidth: number;
  gridHeight: number;
  pattern: PatternDefinition;
  piecePool: PiecePoolEntry[];
  budgetRange: [number, number];
  tags: string[];
};

// ─── Helper ──────────────────────────────────────────────────────────────────

function t(
  id: string, name: string, difficulty: Difficulty,
  gw: number, gh: number,
  sp: SourcePosition, op: OutputPosition,
  shape: SolutionShape, required: PieceType[], optimal: number,
  pool: PiecePoolEntry[], budget: [number, number], tags: string[],
): PuzzleTemplate {
  return {
    id, name, difficulty, gridWidth: gw, gridHeight: gh,
    pattern: { sourcePosition: sp, outputPosition: op, solutionShape: shape, requiredPieceTypes: required, optimalPieceCount: optimal },
    piecePool: pool, budgetRange: budget, tags,
  };
}

const C = (n: [number, number]): PiecePoolEntry => ({ type: 'conveyor', countRange: n });
const G = (n: [number, number]): PiecePoolEntry => ({ type: 'gear', countRange: n });
const S = (n: [number, number]): PiecePoolEntry => ({ type: 'splitter', countRange: n });
const CN = (n: [number, number]): PiecePoolEntry => ({ type: 'configNode', countRange: n });
const SC = (n: [number, number]): PiecePoolEntry => ({ type: 'scanner', countRange: n });
const TX = (n: [number, number]): PiecePoolEntry => ({ type: 'transmitter', countRange: n });

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY A — STRAIGHT LINE (easy, physics only)
// ═══════════════════════════════════════════════════════════════════════════════

const A: PuzzleTemplate[] = [
  t('A01','Straight Short','easy',7,5,'left','right','straight',['conveyor'],2,[C([2,4])],[0,10],['straight','physics_only']),
  t('A02','Straight Medium','easy',8,5,'left','right','straight',['conveyor'],3,[C([3,5])],[0,10],['straight','physics_only']),
  t('A03','Straight Long','easy',9,5,'left','right','straight',['conveyor'],5,[C([5,7])],[0,15],['straight','physics_only']),
  t('A04','Straight Gear','easy',7,5,'left','right','straight',['conveyor','gear'],3,[C([2,4]),G([1,1])],[0,10],['straight','physics_only']),
  t('A05','Straight Split','medium',8,6,'left','right','straight',['conveyor','splitter'],3,[C([3,5]),S([1,1])],[5,15],['straight']),
  t('A06','Straight Top','easy',8,5,'top_left','top_right','straight',['conveyor'],4,[C([4,6])],[0,10],['straight','physics_only']),
  t('A07','Straight Bottom','easy',8,5,'bottom_left','bottom_right','straight',['conveyor'],4,[C([4,6])],[0,10],['straight','physics_only']),
  t('A08','Straight Gear Middle','easy',8,5,'left','right','straight',['conveyor','gear'],3,[C([3,5]),G([1,1])],[0,10],['straight','physics_only']),
  t('A09','Straight With Noise','medium',8,6,'left','right','straight',['conveyor'],3,[C([3,6]),G([1,2]),S([0,1])],[5,15],['straight']),
  t('A10','Straight Tight','medium',9,4,'left','right','straight',['conveyor'],5,[C([5,7])],[5,15],['straight','physics_only']),
];

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY B — SINGLE BEND (medium, physics focus)
// ═══════════════════════════════════════════════════════════════════════════════

const B: PuzzleTemplate[] = [
  t('B01','Bend Down Right','medium',8,6,'top_left','bottom_right','bend_down',['conveyor','gear'],4,[C([3,6]),G([1,2])],[10,20],['bend']),
  t('B02','Bend Up Right','medium',8,6,'bottom_left','top_right','bend_up',['conveyor','gear'],4,[C([3,6]),G([1,2])],[10,20],['bend']),
  t('B03','Bend Late','medium',9,6,'left','bottom_right','bend_down',['conveyor','gear'],5,[C([4,7]),G([1,2])],[10,25],['bend']),
  t('B04','Bend Early','medium',8,6,'left','bottom_right','bend_down',['conveyor','gear'],4,[C([3,5]),G([1,2])],[10,20],['bend']),
  t('B05','Bend With Gear','medium',8,6,'top_left','bottom_right','bend_down',['conveyor','gear'],4,[C([3,5]),G([1,2])],[10,20],['bend']),
  t('B06','Bend Gear Choice','medium',9,7,'left','bottom_right','bend_down',['conveyor','gear'],5,[C([4,6]),G([1,3])],[15,25],['bend']),
  t('B07','Bend Splitter','hard',9,7,'top_left','bottom_right','bend_down',['conveyor','gear','splitter'],5,[C([3,6]),G([1,2]),S([1,1])],[15,30],['bend']),
  t('B08','Bend Tight Corner','hard',7,7,'top_left','bottom_right','bend_down',['conveyor','gear'],4,[C([3,5]),G([1,2])],[15,25],['bend']),
  t('B09','Bend Long Vertical','medium',8,8,'top_left','bottom_right','bend_down',['conveyor','gear'],6,[C([5,8]),G([1,2])],[10,25],['bend']),
  t('B10','Bend Reverse','medium',8,6,'top_left','bottom_right','bend_down',['conveyor','gear'],4,[C([3,6]),G([1,2])],[10,20],['bend']),
];

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY C — PROTOCOL INTRODUCTION (medium-hard)
// ═══════════════════════════════════════════════════════════════════════════════

const CC: PuzzleTemplate[] = [
  t('C01','Single Gate','medium',8,5,'left','right','straight',['conveyor','configNode'],3,[C([2,4]),CN([1,1])],[15,25],['straight','protocol_required']),
  t('C02','Double Gate','hard',9,5,'left','right','straight',['conveyor','configNode'],4,[C([2,5]),CN([2,2])],[20,35],['straight','protocol_required']),
  t('C03','Scanner Route','hard',8,6,'left','right','bend_down',['conveyor','scanner','gear'],5,[C([3,5]),SC([1,1]),G([1,2])],[20,35],['bend','protocol_required','trail_read']),
  t('C04','Trail Unlock','medium',9,5,'left','right','straight',['conveyor','configNode'],3,[C([2,5]),CN([1,1])],[15,25],['straight','protocol_required','trail_read']),
  t('C05','Gate With Bend','hard',9,6,'top_left','bottom_right','bend_down',['conveyor','configNode','gear'],5,[C([3,5]),CN([1,1]),G([1,2])],[20,35],['bend','protocol_required']),
  t('C06','Double Scanner','hard',9,7,'left','right','straight',['conveyor','scanner'],4,[C([2,5]),SC([2,2])],[20,35],['straight','protocol_required','trail_read']),
  t('C07','Gate Easy Trail','medium',8,5,'left','right','straight',['conveyor','configNode'],3,[C([2,4]),CN([1,1])],[10,20],['straight','protocol_required']),
  t('C08','Protocol Shortcut','hard',9,6,'left','right','bend_down',['conveyor','configNode','gear'],4,[C([2,5]),CN([1,2]),G([1,2])],[20,35],['bend','protocol_required']),
  t('C09','Gate Timing','hard',9,6,'left','right','straight',['conveyor','configNode','scanner'],5,[C([3,5]),CN([1,2]),SC([1,1])],[25,40],['straight','protocol_required','trail_read']),
  t('C10','Mixed Gates','expert',10,7,'left','right','bend_down',['conveyor','configNode','scanner','gear'],6,[C([3,6]),CN([2,3]),SC([1,2]),G([1,2])],[30,50],['bend','protocol_required','trail_read']),
];

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY D — TRANSMITTER AND WRITE (hard)
// ═══════════════════════════════════════════════════════════════════════════════

const D: PuzzleTemplate[] = [
  t('D01','Write Then Read','hard',9,5,'left','right','straight',['conveyor','transmitter','scanner','configNode'],5,[C([2,4]),TX([1,1]),SC([1,1]),CN([1,1])],[25,40],['straight','protocol_required','trail_write']),
  t('D02','Write Clear Read','hard',10,5,'left','right','straight',['conveyor','transmitter','scanner'],4,[C([2,5]),TX([1,1]),SC([1,1])],[25,40],['straight','protocol_required','trail_write']),
  t('D03','Double Write','expert',10,6,'left','right','straight',['conveyor','transmitter','scanner','configNode'],6,[C([2,5]),TX([2,2]),SC([1,2]),CN([1,2])],[35,50],['straight','protocol_required','trail_write']),
  t('D04','Write Split','expert',10,7,'left','right','bend_down',['conveyor','transmitter','splitter','scanner'],6,[C([3,5]),TX([1,1]),S([1,1]),SC([1,2]),G([1,2])],[35,55],['bend','protocol_required','trail_write','splitter']),
  t('D05','Loop Trail','expert',10,6,'left','right','straight',['conveyor','transmitter','scanner','configNode'],6,[C([3,5]),TX([1,2]),SC([1,2]),CN([1,2])],[35,50],['straight','protocol_required','trail_write']),
  t('D06','Write Unlock Bend','hard',9,7,'top_left','bottom_right','bend_down',['conveyor','transmitter','configNode','gear'],5,[C([2,5]),TX([1,1]),CN([1,1]),G([1,2])],[25,40],['bend','protocol_required','trail_write']),
  t('D07','Double Scanner Write','expert',10,7,'left','right','straight',['conveyor','transmitter','scanner','configNode'],7,[C([3,5]),TX([1,1]),SC([2,2]),CN([1,2])],[40,55],['straight','protocol_required','trail_write']),
  t('D08','Trail Chain','hard',10,6,'left','right','straight',['conveyor','transmitter','scanner','configNode'],5,[C([2,5]),TX([1,1]),SC([1,1]),CN([1,1])],[25,40],['straight','protocol_required','trail_write']),
  t('D09','Write Gate Split','expert',10,8,'left','right','bend_down',['conveyor','transmitter','configNode','splitter','gear'],7,[C([3,5]),TX([1,1]),CN([1,2]),S([1,1]),G([1,2])],[40,60],['bend','protocol_required','trail_write','splitter']),
  t('D10','Full Protocol','expert',10,8,'left','right','bend_down',['conveyor','transmitter','scanner','configNode','gear'],8,[C([3,5]),TX([1,2]),SC([1,2]),CN([2,3]),G([1,2])],[45,60],['bend','protocol_required','trail_write']),
];

// ═══════════════════════════════════════════════════════════════════════════════
// CATEGORY E — MULTI-PATH AND ADVANCED (expert)
// ═══════════════════════════════════════════════════════════════════════════════

const E: PuzzleTemplate[] = [
  t('E01','Split Rejoin','expert',10,7,'left','right','straight',['conveyor','splitter','gear'],6,[C([4,6]),S([1,1]),G([2,3])],[35,50],['straight','splitter','multi_path']),
  t('E02','Split One Path','hard',9,7,'left','right','bend_down',['conveyor','splitter','gear'],5,[C([3,6]),S([1,1]),G([1,2])],[25,40],['bend','splitter']),
  t('E03','Zigzag','expert',10,8,'top_left','bottom_right','zigzag',['conveyor','gear'],8,[C([5,8]),G([2,4])],[40,55],['double_bend']),
  t('E04','Split Gate Rejoin','expert',10,8,'left','right','bend_down',['conveyor','splitter','configNode','gear'],7,[C([3,6]),S([1,1]),CN([1,2]),G([2,3])],[40,60],['bend','splitter','protocol_required']),
  t('E05','Long Trail','expert',10,7,'left','right','straight',['conveyor','scanner','configNode'],6,[C([3,5]),SC([2,3]),CN([2,3])],[35,50],['straight','protocol_required','trail_read']),
  t('E06','Reverse Engineer','hard',9,6,'left','right','bend_down',['conveyor','gear'],5,[C([3,6]),G([2,3])],[25,40],['bend']),
  t('E07','Gear Chain','hard',9,6,'left','right','straight',['conveyor','gear'],5,[C([2,5]),G([3,3])],[20,35],['straight']),
  t('E08','Minimal Protocol','expert',9,7,'left','right','bend_down',['conveyor','configNode','gear'],5,[C([3,6]),CN([1,1]),G([1,3])],[30,45],['bend','protocol_required']),
  t('E09','Time Pressure','expert',10,6,'left','right','straight',['conveyor','gear'],6,[C([4,6]),G([2,2])],[30,45],['straight']),
  t('E10','The Architect','expert',10,8,'left','bottom_right','double_bend',['conveyor','gear','configNode','scanner','transmitter'],8,[C([3,5]),G([2,3]),CN([1,2]),SC([1,1]),TX([1,1])],[50,60],['double_bend','protocol_required','trail_write']),
];

// ─── All templates ───────────────────────────────────────────────────────────

export const ALL_TEMPLATES: PuzzleTemplate[] = [...A, ...B, ...CC, ...D, ...E];

export function getTemplatesByDifficulty(difficulty: Difficulty): PuzzleTemplate[] {
  return ALL_TEMPLATES.filter(t => t.difficulty === difficulty);
}

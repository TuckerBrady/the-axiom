import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Line, Polyline } from 'react-native-svg';
import type { PlacedPiece, PieceType, ExecutionStep } from '../../game/types';
import { getDefaultPorts, autoConnectPhysicsPieces, executeMachine, getPieceCategory } from '../../game/engine';
import { computeSplitterMagnets } from '../../store/gameStore';
import { PieceIcon } from '../../components/PieceIcon';
import { Colors, Fonts } from '../../theme/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const GRID_W = 12;
const GRID_H = 12;
const BOARD_SIZE = SCREEN_W - 24;
const CELL = Math.floor(BOARD_SIZE / GRID_W);
const BOARD_W = GRID_W * CELL;
const BOARD_H = GRID_H * CELL;
const DOT_R = 1.5;

const INITIAL_PIECES: PlacedPiece[] = [
  {
    id: 'sb-input',
    type: 'inputPort',
    category: 'physics',
    gridX: 1,
    gridY: 6,
    ports: getDefaultPorts('inputPort'),
    rotation: 0,
    isPrePlaced: false,
  },
  {
    id: 'sb-output',
    type: 'outputPort',
    category: 'physics',
    gridX: 10,
    gridY: 6,
    ports: getDefaultPorts('outputPort'),
    rotation: 0,
    isPrePlaced: false,
  },
];

const TRAY: { type: PieceType; count: number }[] = [
  { type: 'inputPort', count: 1 },
  { type: 'outputPort', count: 4 },
  { type: 'conveyor', count: 8 },
  { type: 'gear', count: 4 },
  { type: 'splitter', count: 4 },
  { type: 'merger', count: 4 },
  { type: 'bridge', count: 4 },
  { type: 'configNode', count: 4 },
  { type: 'scanner', count: 4 },
  { type: 'transmitter', count: 4 },
  { type: 'inverter', count: 4 },
  { type: 'counter', count: 4 },
  { type: 'latch', count: 4 },
];

let sandboxCounter = 0;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PieceSandboxScreen() {
  const navigation = useNavigation();
  const [pieces, setPieces] = useState<PlacedPiece[]>(computeSplitterMagnets([...INITIAL_PIECES]));
  const [selectedTray, setSelectedTray] = useState<PieceType | null>(null);
  const [executionResult, setExecutionResult] = useState<string | null>(null);

  // Beam animation state
  type Pt = { x: number; y: number };
  const [beamTrail, setBeamTrail] = useState<Pt[]>([]);
  const [beamHead, setBeamHead] = useState<Pt | null>(null);
  const [beamColor, setBeamColor] = useState('#00D4FF');
  const animFrameRef = useRef<number>(0);

  const wires = useMemo(() => autoConnectPhysicsPieces(pieces), [pieces]);
  const allPlaced = pieces;

  const trayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of TRAY) counts[t.type] = t.count;
    for (const p of allPlaced) {
      if (counts[p.type] !== undefined) counts[p.type]--;
    }
    return counts;
  }, [allPlaced]);

  const handleCellPress = useCallback((gridX: number, gridY: number) => {
    if (!selectedTray) return;
    if (pieces.some(p => p.gridX === gridX && p.gridY === gridY)) return;
    if ((trayCounts[selectedTray] ?? 0) <= 0) return;

    const newPiece: PlacedPiece = {
      id: `sb-${++sandboxCounter}`,
      type: selectedTray,
      category: getPieceCategory(selectedTray),
      gridX,
      gridY,
      ports: getDefaultPorts(selectedTray),
      rotation: selectedTray === 'splitter' ? 0 : 0,
      isPrePlaced: false,
    };
    setPieces(prev => computeSplitterMagnets([...prev, newPiece]));
    setSelectedTray(null);
  }, [selectedTray, pieces, trayCounts]);

  const handlePieceTap = useCallback((piece: PlacedPiece) => {
    if (piece.type === 'conveyor') {
      setPieces(prev => computeSplitterMagnets(prev.map(p =>
        p.id === piece.id ? { ...p, rotation: (p.rotation + 90) % 360 } : p,
      )));
    } else if (piece.type === 'configNode') {
      setPieces(prev => computeSplitterMagnets(prev.map(p =>
        p.id === piece.id ? { ...p, configValue: (p.configValue ?? 1) === 1 ? 0 : 1 } : p,
      )));
    } else if (piece.type === 'latch') {
      setPieces(prev => computeSplitterMagnets(prev.map(p =>
        p.id === piece.id ? { ...p, latchMode: p.latchMode === 'write' ? 'read' : 'write' } : p,
      )));
    }
  }, []);

  const handlePieceLongPress = useCallback((piece: PlacedPiece) => {
    setPieces(prev => computeSplitterMagnets(prev.filter(p => p.id !== piece.id)));
  }, []);

  const handleEngage = useCallback(() => {
    // Cancel any running animation
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setBeamTrail([]);
    setBeamHead(null);

    const state = {
      pieces,
      wires,
      dataTrail: { cells: [] as (0 | 1)[], headPosition: 0 },
      configuration: 0,
      isRunning: true,
      signalPath: [],
      currentSignalStep: 0,
      status: 'running' as const,
    };
    const steps = executeMachine(state);
    const success = steps.some(s => s.type === 'outputPort' && s.success);

    // Build waypoints from ALL steps (pass or fail) so the beam always
    // traces as far as the signal traveled.
    const waypoints: Pt[] = [];
    for (const stp of steps) {
      if (stp.type === 'void' || stp.type === 'error') continue;
      const pc = pieces.find(pp => pp.id === stp.pieceId);
      if (pc) waypoints.push({ x: pc.gridX * CELL + CELL / 2, y: pc.gridY * CELL + CELL / 2 });
    }

    if (waypoints.length < 2) {
      setExecutionResult(success ? 'LOCKED' : 'VOID');
      setTimeout(() => setExecutionResult(null), 2000);
      return;
    }

    // Compute cumulative path length
    const dists: number[] = [0];
    for (let i = 1; i < waypoints.length; i++) {
      const dx = waypoints[i].x - waypoints[i - 1].x;
      const dy = waypoints[i].y - waypoints[i - 1].y;
      dists.push(dists[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
    const totalLen = dists[dists.length - 1];
    const totalMs = Math.max(400, Math.min(2000, 600 * (totalLen / (CELL * 4))));
    const endColor = success ? '#00C48C' : '#FF3B3B';

    setBeamColor('#00D4FF');
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / totalMs);
      const d = t * totalLen;

      // Find position along path at distance d
      let head: Pt = waypoints[0];
      for (let i = 1; i < waypoints.length; i++) {
        if (d <= dists[i]) {
          const segLen = dists[i] - dists[i - 1];
          const segT = segLen > 0 ? (d - dists[i - 1]) / segLen : 0;
          head = {
            x: waypoints[i - 1].x + (waypoints[i].x - waypoints[i - 1].x) * segT,
            y: waypoints[i - 1].y + (waypoints[i].y - waypoints[i - 1].y) * segT,
          };
          break;
        }
        head = waypoints[i];
      }

      // Build trail up to current position
      const trail: Pt[] = [waypoints[0]];
      for (let i = 1; i < waypoints.length; i++) {
        if (d >= dists[i]) {
          trail.push(waypoints[i]);
        } else if (d > dists[i - 1]) {
          trail.push(head);
          break;
        }
      }

      setBeamTrail(trail);
      setBeamHead(head);

      // Switch to end color in last 15% of animation
      if (t > 0.85) setBeamColor(endColor);

      if (t < 1) {
        animFrameRef.current = requestAnimationFrame(tick);
      } else {
        // Hold the final state briefly then show result
        setTimeout(() => {
          setExecutionResult(success ? 'LOCKED' : 'VOID');
          setTimeout(() => {
            setBeamTrail([]);
            setBeamHead(null);
            setExecutionResult(null);
          }, 1500);
        }, 300);
      }
    };
    animFrameRef.current = requestAnimationFrame(tick);
  }, [pieces, wires]);

  const handleReset = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setPieces(computeSplitterMagnets([...INITIAL_PIECES]));
    setBeamTrail([]);
    setBeamHead(null);
    setExecutionResult(null);
    sandboxCounter = 0;
  }, []);

  return (
    <SafeAreaView style={st.root}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Text style={st.backText}>BACK</Text>
        </TouchableOpacity>
        <Text style={st.title}>PIECE SANDBOX</Text>
        <Text style={st.devTag}>DEV</Text>
      </View>

      {/* Result flash */}
      {executionResult && (
        <View style={[st.resultBanner, { backgroundColor: executionResult === 'LOCKED' ? 'rgba(0,196,140,0.15)' : 'rgba(255,59,59,0.15)' }]}>
          <Text style={[st.resultText, { color: executionResult === 'LOCKED' ? '#00C48C' : '#FF3B3B' }]}>
            {executionResult}
          </Text>
        </View>
      )}

      {/* Board */}
      <View style={st.boardWrap}>
        <View style={st.board}>
          <Svg width={BOARD_W} height={BOARD_H} style={StyleSheet.absoluteFill}>
            {Array.from({ length: GRID_H + 1 }, (_, y) =>
              Array.from({ length: GRID_W + 1 }, (_, x) => (
                <Circle key={`d-${x}-${y}`} cx={x * CELL + CELL / 2} cy={y * CELL + CELL / 2} r={DOT_R} fill="rgba(74,158,255,0.12)" />
              )),
            )}
            {wires.map(w => {
              const a = pieces.find(p => p.id === w.fromPieceId);
              const b = pieces.find(p => p.id === w.toPieceId);
              if (!a || !b) return null;
              return (
                <Line
                  key={w.id}
                  x1={a.gridX * CELL + CELL / 2} y1={a.gridY * CELL + CELL / 2}
                  x2={b.gridX * CELL + CELL / 2} y2={b.gridY * CELL + CELL / 2}
                  stroke="rgba(0,212,255,0.3)" strokeWidth={1.5} strokeDasharray="4,3" strokeLinecap="round"
                />
              );
            })}
            {/* Beam trail */}
            {beamTrail.length > 1 && (
              <Polyline
                points={beamTrail.map(p => `${p.x},${p.y}`).join(' ')}
                fill="none"
                stroke={beamColor}
                strokeWidth={2.5}
                strokeLinecap="round"
                opacity={0.6}
              />
            )}
            {/* Beam head */}
            {beamHead && (
              <>
                <Circle cx={beamHead.x} cy={beamHead.y} r={8} fill={beamColor} opacity={0.25} />
                <Circle cx={beamHead.x} cy={beamHead.y} r={3} fill="white" opacity={0.95} />
              </>
            )}
          </Svg>

          {/* Empty cell touch targets */}
          {Array.from({ length: GRID_H }, (_, y) =>
            Array.from({ length: GRID_W }, (_, x) => {
              if (pieces.some(p => p.gridX === x && p.gridY === y)) return null;
              return (
                <Pressable
                  key={`c-${x}-${y}`}
                  onPress={() => handleCellPress(x, y)}
                  style={{ position: 'absolute', left: x * CELL, top: y * CELL, width: CELL, height: CELL }}
                />
              );
            }),
          )}

          {/* Pieces */}
          {pieces.map(piece => {
            const sz = CELL - 4;
            const off = (CELL - sz) / 2;
            const iconSz = sz * 0.6;
            const isSource = piece.type === 'inputPort';
            const isOutput = piece.type === 'outputPort';
            const clr = isSource ? '#F0B429' : isOutput ? '#00C48C' : Colors.blue;
            return (
              <Pressable
                key={piece.id}
                style={{ position: 'absolute', left: piece.gridX * CELL + off, top: piece.gridY * CELL + off, width: sz, height: sz, alignItems: 'center', justifyContent: 'center' }}
                onPress={() => handlePieceTap(piece)}
                onLongPress={() => handlePieceLongPress(piece)}
                delayLongPress={500}
              >
                <View style={{ transform: [{ rotate: `${piece.rotation}deg` }] }}>
                  <PieceIcon
                    type={piece.type}
                    size={iconSz}
                    color={clr}
                    configValue={piece.type === 'configNode' ? piece.configValue : undefined}
                    connectedMagnetSides={piece.type === 'splitter' ? piece.connectedMagnetSides : undefined}
                    latchMode={piece.type === 'latch' ? piece.latchMode : undefined}
                    storedValue={piece.type === 'latch' ? piece.storedValue : undefined}
                    count={piece.type === 'counter' ? piece.count : undefined}
                    threshold={piece.type === 'counter' ? piece.threshold : undefined}
                  />
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Tray */}
      <ScrollView horizontal style={st.tray} contentContainerStyle={st.trayContent}>
        {TRAY.map(t => {
          const remaining = trayCounts[t.type] ?? 0;
          const isActive = selectedTray === t.type;
          const isPort = t.type === 'inputPort' || t.type === 'outputPort';
          const trayColor = t.type === 'inputPort' ? '#F0B429' : t.type === 'outputPort' ? '#00C48C' : Colors.blue;
          return (
            <TouchableOpacity
              key={t.type}
              style={[st.trayItem, isActive && { borderColor: trayColor, backgroundColor: `${trayColor}15` }]}
              onPress={() => setSelectedTray(isActive ? null : t.type)}
              activeOpacity={0.7}
              disabled={remaining <= 0}
            >
              <View style={{ opacity: remaining > 0 ? 1 : 0.3 }}>
                <PieceIcon type={t.type} size={18} color={trayColor} />
              </View>
              <Text style={st.trayLabel}>{t.type === 'inputPort' ? 'IN' : t.type === 'outputPort' ? 'OUT' : t.type.toUpperCase()}</Text>
              <View style={[st.trayBadge, { backgroundColor: remaining > 0 ? trayColor : Colors.dim }]}>
                <Text style={st.trayBadgeText}>{remaining}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Actions */}
      <View style={st.actions}>
        <TouchableOpacity style={st.resetBtn} onPress={handleReset} activeOpacity={0.7}>
          <Text style={st.resetText}>RESET</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.engageBtn} onPress={handleEngage} activeOpacity={0.7}>
          <Text style={st.engageText}>ENGAGE MACHINE</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#06090f' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontFamily: Fonts.spaceMono, fontSize: 12, color: Colors.muted, letterSpacing: 2 },
  title: { fontFamily: Fonts.spaceMono, fontSize: 14, color: '#D0E4FF', letterSpacing: 3, flex: 1 },
  devTag: { fontFamily: Fonts.spaceMono, fontSize: 9, color: '#FF3B3B', letterSpacing: 2, borderWidth: 1, borderColor: '#FF3B3B', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  resultBanner: { alignItems: 'center', paddingVertical: 6 },
  resultText: { fontFamily: Fonts.spaceMono, fontSize: 14, letterSpacing: 4 },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  board: { width: BOARD_W, height: BOARD_H, backgroundColor: '#080e18', borderWidth: 1, borderColor: 'rgba(74,158,255,0.1)', borderRadius: 6, position: 'relative', overflow: 'hidden' },
  tray: { maxHeight: 68, borderTopWidth: 1, borderTopColor: 'rgba(0,212,255,0.08)' },
  trayContent: { paddingHorizontal: 6, gap: 4, alignItems: 'center' },
  trayItem: { width: 48, height: 60, borderWidth: 1, borderColor: 'rgba(0,212,255,0.12)', borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 1, paddingVertical: 3 },
  trayLabel: { fontFamily: Fonts.spaceMono, fontSize: 5, color: Colors.muted, letterSpacing: 0.3 },
  trayBadge: { width: 12, height: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  trayBadgeText: { fontFamily: Fonts.spaceMono, fontSize: 7, color: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 10, justifyContent: 'center' },
  resetBtn: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.muted, borderRadius: 4 },
  resetText: { fontFamily: Fonts.spaceMono, fontSize: 11, color: Colors.muted, letterSpacing: 2 },
  engageBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.amber, borderRadius: 4, backgroundColor: 'rgba(240,180,41,0.06)' },
  engageText: { fontFamily: Fonts.spaceMono, fontSize: 11, color: Colors.amber, letterSpacing: 2 },
});

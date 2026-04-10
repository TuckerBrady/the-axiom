import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Circle, Line } from 'react-native-svg';
import type { PlacedPiece, PieceType } from '../../game/types';
import { getDefaultPorts, autoConnectPhysicsPieces, executeMachine, getPieceCategory } from '../../game/engine';
import { PieceIcon } from '../../components/PieceIcon';
import { Colors, Fonts } from '../../theme/tokens';

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_W = 7;
const GRID_H = 7;
const CELL = 52;
const BOARD_W = GRID_W * CELL;
const BOARD_H = GRID_H * CELL;
const DOT_R = 1.5;

const INITIAL_PIECES: PlacedPiece[] = [
  {
    id: 'sb-input',
    type: 'inputPort',
    category: 'physics',
    gridX: 1,
    gridY: 3,
    ports: getDefaultPorts('inputPort'),
    rotation: 0,
    isPrePlaced: true,
  },
  {
    id: 'sb-output',
    type: 'outputPort',
    category: 'physics',
    gridX: 5,
    gridY: 3,
    ports: getDefaultPorts('outputPort'),
    rotation: 0,
    isPrePlaced: true,
  },
];

const TRAY: { type: PieceType; count: number }[] = [
  { type: 'conveyor', count: 8 },
  { type: 'gear', count: 4 },
  { type: 'splitter', count: 2 },
  { type: 'merger', count: 2 },
  { type: 'bridge', count: 2 },
  { type: 'configNode', count: 2 },
  { type: 'scanner', count: 1 },
  { type: 'transmitter', count: 1 },
  { type: 'inverter', count: 2 },
  { type: 'counter', count: 2 },
  { type: 'latch', count: 2 },
];

let sandboxCounter = 0;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PieceSandboxScreen() {
  const navigation = useNavigation();
  const [pieces, setPieces] = useState<PlacedPiece[]>([...INITIAL_PIECES]);
  const [selectedTray, setSelectedTray] = useState<PieceType | null>(null);
  const [executionResult, setExecutionResult] = useState<string | null>(null);

  const wires = useMemo(() => autoConnectPhysicsPieces(pieces), [pieces]);
  const playerPieces = pieces.filter(p => !p.isPrePlaced);

  const trayCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of TRAY) counts[t.type] = t.count;
    for (const p of playerPieces) {
      if (counts[p.type] !== undefined) counts[p.type]--;
    }
    return counts;
  }, [playerPieces]);

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
      rotation: 0,
      isPrePlaced: false,
    };
    setPieces(prev => [...prev, newPiece]);
    setSelectedTray(null);
  }, [selectedTray, pieces, trayCounts]);

  const handlePieceTap = useCallback((piece: PlacedPiece) => {
    if (piece.isPrePlaced) return;
    if (piece.type === 'conveyor') {
      setPieces(prev => prev.map(p =>
        p.id === piece.id ? { ...p, rotation: (p.rotation + 90) % 360 } : p,
      ));
    } else if (piece.type === 'configNode') {
      setPieces(prev => prev.map(p =>
        p.id === piece.id ? { ...p, configValue: (p.configValue ?? 1) === 1 ? 0 : 1 } : p,
      ));
    } else if (piece.type === 'latch') {
      setPieces(prev => prev.map(p =>
        p.id === piece.id ? { ...p, latchMode: p.latchMode === 'write' ? 'read' : 'write' } : p,
      ));
    }
  }, []);

  const handlePieceLongPress = useCallback((piece: PlacedPiece) => {
    if (piece.isPrePlaced) return;
    setPieces(prev => prev.filter(p => p.id !== piece.id));
  }, []);

  const handleEngage = useCallback(() => {
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
    setExecutionResult(success ? 'LOCKED' : 'VOID');
    setTimeout(() => setExecutionResult(null), 2000);
  }, [pieces, wires]);

  const handleReset = useCallback(() => {
    setPieces([...INITIAL_PIECES]);
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
            const sz = CELL - 6;
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
                <View style={{ transform: [{ rotate: `${!piece.isPrePlaced ? piece.rotation : 0}deg` }] }}>
                  <PieceIcon
                    type={piece.type}
                    size={iconSz}
                    color={clr}
                    configValue={piece.type === 'configNode' ? piece.configValue : undefined}
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
          return (
            <TouchableOpacity
              key={t.type}
              style={[st.trayItem, isActive && { borderColor: Colors.blue, backgroundColor: 'rgba(0,212,255,0.08)' }]}
              onPress={() => setSelectedTray(isActive ? null : t.type)}
              activeOpacity={0.7}
              disabled={remaining <= 0}
            >
              <View style={{ opacity: remaining > 0 ? 1 : 0.3 }}>
                <PieceIcon type={t.type} size={20} color={Colors.blue} />
              </View>
              <Text style={st.trayLabel}>{t.type.toUpperCase()}</Text>
              <View style={[st.trayBadge, { backgroundColor: remaining > 0 ? Colors.blue : Colors.dim }]}>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  backBtn: { paddingVertical: 4, paddingRight: 8 },
  backText: { fontFamily: Fonts.spaceMono, fontSize: 12, color: Colors.muted, letterSpacing: 2 },
  title: { fontFamily: Fonts.spaceMono, fontSize: 14, color: '#D0E4FF', letterSpacing: 3, flex: 1 },
  devTag: { fontFamily: Fonts.spaceMono, fontSize: 9, color: '#FF3B3B', letterSpacing: 2, borderWidth: 1, borderColor: '#FF3B3B', borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2 },
  resultBanner: { alignItems: 'center', paddingVertical: 6 },
  resultText: { fontFamily: Fonts.spaceMono, fontSize: 14, letterSpacing: 4 },
  boardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  board: { width: BOARD_W, height: BOARD_H, backgroundColor: '#080e18', borderWidth: 1, borderColor: 'rgba(74,158,255,0.1)', borderRadius: 6, position: 'relative', overflow: 'hidden' },
  tray: { maxHeight: 72, borderTopWidth: 1, borderTopColor: 'rgba(0,212,255,0.08)' },
  trayContent: { paddingHorizontal: 8, gap: 6, alignItems: 'center' },
  trayItem: { width: 56, height: 64, borderWidth: 1, borderColor: 'rgba(0,212,255,0.12)', borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 2, paddingVertical: 4 },
  trayLabel: { fontFamily: Fonts.spaceMono, fontSize: 6, color: Colors.muted, letterSpacing: 0.5 },
  trayBadge: { width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center' },
  trayBadgeText: { fontFamily: Fonts.spaceMono, fontSize: 8, color: '#FFFFFF' },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12, justifyContent: 'center' },
  resetBtn: { paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: Colors.muted, borderRadius: 4 },
  resetText: { fontFamily: Fonts.spaceMono, fontSize: 11, color: Colors.muted, letterSpacing: 2 },
  engageBtn: { paddingHorizontal: 20, paddingVertical: 10, borderWidth: 1, borderColor: Colors.amber, borderRadius: 4, backgroundColor: 'rgba(240,180,41,0.06)' },
  engageText: { fontFamily: Fonts.spaceMono, fontSize: 11, color: Colors.amber, letterSpacing: 2 },
});

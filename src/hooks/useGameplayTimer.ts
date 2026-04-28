import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseGameplayTimerResult {
  elapsedSeconds: number;
  lockTimer: () => number;
  resetTimer: () => void;
  lockedRef: React.MutableRefObject<boolean>;
}

export function useGameplayTimer(
  levelId: string | undefined,
  tutorialIsActiveRef: React.MutableRefObject<boolean>,
  showPauseModal: boolean,
): UseGameplayTimerResult {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRunning = useRef(false);
  const lockedRef = useRef(false);
  const elapsedRef = useRef(0);

  useEffect(() => {
    elapsedRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  useEffect(() => {
    if (!levelId) return;
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    lockedRef.current = false;
    timerRunning.current = true;
    timerRef.current = setInterval(() => {
      if (timerRunning.current && !tutorialIsActiveRef.current) {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      timerRunning.current = false;
    };
  }, [levelId, tutorialIsActiveRef]);

  useEffect(() => {
    if (lockedRef.current) return;
    timerRunning.current = !showPauseModal;
  }, [showPauseModal]);

  const lockTimer = useCallback(() => {
    timerRunning.current = false;
    lockedRef.current = true;
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    return elapsedRef.current;
  }, []);

  const resetTimer = useCallback(() => {
    setElapsedSeconds(0);
    elapsedRef.current = 0;
    lockedRef.current = false;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (timerRunning.current && !tutorialIsActiveRef.current) {
        setElapsedSeconds(prev => prev + 1);
      }
    }, 1000);
    timerRunning.current = true;
  }, [tutorialIsActiveRef]);

  return {
    elapsedSeconds,
    lockTimer,
    resetTimer,
    lockedRef,
  };
}

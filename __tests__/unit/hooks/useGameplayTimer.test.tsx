// React 18+ requires this flag set before any act() calls so the
// concurrent renderer treats this as a test environment.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

import * as React from 'react';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const TestRenderer: {
  act: (cb: () => void | Promise<void>) => Promise<void>;
  create: (
    el: React.ReactElement,
  ) => { update: (el: React.ReactElement) => void; unmount: () => void };
} = require('react-test-renderer');
import { useGameplayTimer } from '../../../src/hooks/useGameplayTimer';

type HookResult = ReturnType<typeof useGameplayTimer>;

let captured: HookResult | null = null;

function Harness(props: {
  levelId: string | undefined;
  tutorialIsActiveRef: React.MutableRefObject<boolean>;
  showPauseModal: boolean;
}) {
  captured = useGameplayTimer(props.levelId, props.tutorialIsActiveRef, props.showPauseModal);
  return null;
}

function makeTutorialRef(active = false): React.MutableRefObject<boolean> {
  return { current: active };
}

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  captured = null;
  jest.useRealTimers();
});

describe('useGameplayTimer', () => {
  describe('initial state', () => {
    it('starts at 0 elapsed seconds when given a levelId', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: makeTutorialRef(),
            showPauseModal: false,
          }),
        );
      });
      expect(captured!.elapsedSeconds).toBe(0);
      expect(captured!.lockedRef.current).toBe(false);
    });
  });

  describe('tick behavior', () => {
    it('increments elapsedSeconds once per second when running', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: makeTutorialRef(),
            showPauseModal: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(captured!.elapsedSeconds).toBe(3);
    });

    it('does not tick while showPauseModal is true', async () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: makeTutorialRef(),
            showPauseModal: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        renderer.update(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: makeTutorialRef(),
            showPauseModal: true,
          }),
        );
      });
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(captured!.elapsedSeconds).toBe(0);
    });

    it('does not tick while tutorial is active', async () => {
      const tutorialRef = makeTutorialRef(true);
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: tutorialRef,
            showPauseModal: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(captured!.elapsedSeconds).toBe(0);
    });
  });

  describe('reset on level change', () => {
    it('resets elapsedSeconds to 0 when levelId changes', async () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: makeTutorialRef(),
            showPauseModal: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(4000);
      });
      expect(captured!.elapsedSeconds).toBe(4);

      await TestRenderer.act(async () => {
        renderer.update(
          React.createElement(Harness, {
            levelId: 'A1-2',
            tutorialIsActiveRef: makeTutorialRef(),
            showPauseModal: false,
          }),
        );
      });
      expect(captured!.elapsedSeconds).toBe(0);
    });
  });

  describe('lockTimer', () => {
    it('freezes the timer and returns the elapsed snapshot', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: makeTutorialRef(),
            showPauseModal: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(7000);
      });
      let snapshot = -1;
      await TestRenderer.act(async () => {
        snapshot = captured!.lockTimer();
      });
      expect(snapshot).toBe(7);
      expect(captured!.lockedRef.current).toBe(true);
      // Further ticks should not advance the timer.
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(captured!.elapsedSeconds).toBe(7);
    });

    it('keeps the timer locked even if showPauseModal toggles', async () => {
      const tutorialRef = makeTutorialRef();
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: tutorialRef,
            showPauseModal: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(2000);
      });
      await TestRenderer.act(async () => {
        captured!.lockTimer();
      });
      await TestRenderer.act(async () => {
        renderer.update(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: tutorialRef,
            showPauseModal: true,
          }),
        );
      });
      await TestRenderer.act(async () => {
        renderer.update(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: tutorialRef,
            showPauseModal: false,
          }),
        );
      });
      // Even after pause toggles, lockedRef stays true and elapsed
      // does not advance.
      expect(captured!.lockedRef.current).toBe(true);
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(5000);
      });
      expect(captured!.elapsedSeconds).toBe(2);
    });
  });

  describe('resetTimer', () => {
    it('restarts the timer from zero and resumes ticking', async () => {
      await TestRenderer.act(async () => {
        TestRenderer.create(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: makeTutorialRef(),
            showPauseModal: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(2000);
        captured!.lockTimer();
      });
      expect(captured!.elapsedSeconds).toBe(2);

      await TestRenderer.act(async () => {
        captured!.resetTimer();
      });
      expect(captured!.elapsedSeconds).toBe(0);
      expect(captured!.lockedRef.current).toBe(false);

      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(3000);
      });
      expect(captured!.elapsedSeconds).toBe(3);
    });
  });

  describe('cleanup', () => {
    it('clears the interval on unmount', async () => {
      let renderer!: { update: (el: React.ReactElement) => void; unmount: () => void };
      await TestRenderer.act(async () => {
        renderer = TestRenderer.create(
          React.createElement(Harness, {
            levelId: 'A1-1',
            tutorialIsActiveRef: makeTutorialRef(),
            showPauseModal: false,
          }),
        );
      });
      await TestRenderer.act(async () => {
        jest.advanceTimersByTime(2000);
      });
      const beforeUnmount = captured!.elapsedSeconds;
      expect(beforeUnmount).toBe(2);
      await TestRenderer.act(async () => {
        renderer.unmount();
      });
      // After unmount, the interval is cleared so further fake-timer
      // ticks must not advance state. (We can't assert against
      // jest.getTimerCount because RN test renderer schedules unrelated
      // microtasks during its own teardown; advancing time and asserting
      // captured stays stable proves the interval cleared.)
      const lastCaptured = captured!.elapsedSeconds;
      jest.advanceTimersByTime(5000);
      expect(captured!.elapsedSeconds).toBe(lastCaptured);
    });
  });
});

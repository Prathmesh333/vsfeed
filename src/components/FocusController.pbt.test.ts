import * as fc from 'fast-check';
import { FocusController } from './FocusController';

// Mock vscode module
jest.mock('vscode', () => ({
  EventEmitter: class<T> {
    private listeners: Array<(e: T) => void> = [];
    
    event(listener: (e: T) => void) {
      this.listeners.push(listener);
      return {
        dispose: () => {
          const index = this.listeners.indexOf(listener);
          if (index > -1) {
            this.listeners.splice(index, 1);
          }
        }
      };
    }
    
    fire(data: T) {
      this.listeners.forEach(listener => listener(data));
    }
    
    dispose() {
      this.listeners = [];
    }
  }
}), { virtual: true });

describe('FocusController - Property-Based Tests', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  /**
   * Feature: vsfeed, Property 4: Focus Mode Timer Countdown
   * **Validates: Requirements 2.1, 2.4**
   * 
   * For any configured session duration between 1 and 60 minutes,
   * activating Focus_Mode should start a timer that counts down from that duration.
   */
  test('Property 4: Timer countdown for any valid duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }), // Valid duration range
        (durationMinutes) => {
          const controller = new FocusController();
          
          try {
            // Start session with random duration
            controller.startSession(durationMinutes);
            
            // Verify session is active
            expect(controller.isActive()).toBe(true);
            
            // Verify initial remaining time equals duration
            const expectedSeconds = durationMinutes * 60;
            expect(controller.getRemainingTime()).toBe(expectedSeconds);
            
            // Verify initial progress is 0
            expect(controller.getSessionProgress()).toBe(0);
            
            // Advance time by 1 second and verify countdown
            jest.advanceTimersByTime(1000);
            expect(controller.getRemainingTime()).toBe(expectedSeconds - 1);
            
            // Verify progress increases
            const progress = controller.getSessionProgress();
            expect(progress).toBeGreaterThan(0);
            expect(progress).toBeLessThan(1);
            
          } finally {
            controller.dispose();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vsfeed, Property 5: Timer Display Updates
   * **Validates: Requirements 2.2**
   * 
   * For any active focus mode session, the remaining time should be displayed
   * in the Browser_Panel UI and update as the timer counts down.
   */
  test('Property 5: Timer emits tick events for any duration', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 1, max: 10 }), // Number of seconds to advance
        (durationMinutes, secondsToAdvance) => {
          const controller = new FocusController();
          const tickEvents: number[] = [];
          
          try {
            // Subscribe to timer ticks
            controller.onTimerTick((remaining) => {
              tickEvents.push(remaining);
            });
            
            // Start session
            controller.startSession(durationMinutes);
            
            // Clear initial tick
            tickEvents.length = 0;
            
            // Advance time
            const maxAdvance = Math.min(secondsToAdvance, durationMinutes * 60);
            for (let i = 0; i < maxAdvance; i++) {
              jest.advanceTimersByTime(1000);
            }
            
            // Verify we received tick events
            expect(tickEvents.length).toBe(maxAdvance);
            
            // Verify ticks are in descending order
            for (let i = 1; i < tickEvents.length; i++) {
              expect(tickEvents[i]).toBe(tickEvents[i - 1] - 1);
            }
            
          } finally {
            controller.dispose();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vsfeed, Property 9: Warning Threshold Indicator
   * **Validates: Requirements 3.1**
   * 
   * For any focus mode session, when the remaining time falls below 25% of
   * the configured duration, a warning indicator should be displayed.
   */
  test('Property 9: Warning threshold triggers at 25% remaining', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4, max: 60 }), // Min 4 to have meaningful 25% threshold
        (durationMinutes) => {
          const controller = new FocusController();
          let warningTriggered = false;
          
          try {
            // Subscribe to warning threshold
            controller.onWarningThreshold(() => {
              warningTriggered = true;
            });
            
            // Start session
            controller.startSession(durationMinutes);
            
            // Advance to 76% progress (definitely past 75% threshold)
            const totalSeconds = durationMinutes * 60;
            const pastThreshold = Math.ceil(totalSeconds * 0.76);
            jest.advanceTimersByTime(pastThreshold * 1000);
            
            // Warning should have triggered
            expect(warningTriggered).toBe(true);
            
          } finally {
            controller.dispose();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vsfeed, Property 13: Timer Pause on Coding Activity
   * **Validates: Requirements 4.2**
   * 
   * For any active focus mode session, when paused, the timer should
   * stop counting down and preserve remaining time.
   */
  test('Property 13: Paused timer preserves remaining time', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 1, max: 30 }), // Seconds to pause
        (durationMinutes, pauseDuration) => {
          const controller = new FocusController();
          
          try {
            // Start session
            controller.startSession(durationMinutes);
            
            // Advance a bit
            jest.advanceTimersByTime(5000);
            const remainingBeforePause = controller.getRemainingTime();
            
            // Pause
            controller.pauseSession();
            
            // Advance time while paused
            jest.advanceTimersByTime(pauseDuration * 1000);
            
            // Verify time hasn't changed
            expect(controller.getRemainingTime()).toBe(remainingBeforePause);
            
          } finally {
            controller.dispose();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vsfeed, Property 14: Timer Resume on Panel Focus
   * **Validates: Requirements 4.3**
   * 
   * For any paused focus mode session, when resumed, the timer should
   * continue counting down from the remaining time.
   */
  test('Property 14: Resumed timer continues countdown', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 60 }),
        fc.integer({ min: 1, max: 20 }), // Pause duration
        (durationMinutes, pauseDuration) => {
          const controller = new FocusController();
          
          try {
            // Start session
            controller.startSession(durationMinutes);
            
            // Advance and pause
            jest.advanceTimersByTime(5000);
            controller.pauseSession();
            
            const remainingAtPause = controller.getRemainingTime();
            
            // Wait while paused
            jest.advanceTimersByTime(pauseDuration * 1000);
            
            // Resume
            controller.resumeSession();
            
            // Advance 1 second after resume
            jest.advanceTimersByTime(1000);
            
            // Verify countdown resumed
            expect(controller.getRemainingTime()).toBe(remainingAtPause - 1);
            
          } finally {
            controller.dispose();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vsfeed, Property 6: Session Auto-Hide on Timeout
   * **Validates: Requirements 2.3**
   * 
   * For any focus mode session, when the Session_Timer reaches zero,
   * the session should automatically end.
   */
  test('Property 6: Session ends when timer reaches zero', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10 }), // Use shorter durations for faster tests
        (durationMinutes) => {
          const controller = new FocusController();
          let sessionEnded = false;
          
          try {
            // Subscribe to session end
            controller.onSessionEnd(() => {
              sessionEnded = true;
            });
            
            // Start session
            controller.startSession(durationMinutes);
            
            // Advance to end of session
            jest.advanceTimersByTime(durationMinutes * 60 * 1000);
            
            // Verify session ended
            expect(sessionEnded).toBe(true);
            expect(controller.isActive()).toBe(false);
            expect(controller.getRemainingTime()).toBe(0);
            
          } finally {
            controller.dispose();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Feature: vsfeed, Property 8: Manual Session Termination
   * **Validates: Requirements 2.6**
   * 
   * For any active focus mode session with remaining time, the user should
   * be able to manually end the session before the timer expires.
   */
  test('Property 8: Manual session termination works at any time', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 60 }),
        fc.integer({ min: 1, max: 50 }), // Seconds before manual end
        (durationMinutes, secondsBeforeEnd) => {
          const controller = new FocusController();
          let sessionEnded = false;
          
          try {
            // Subscribe to session end
            controller.onSessionEnd(() => {
              sessionEnded = true;
            });
            
            // Start session
            controller.startSession(durationMinutes);
            
            // Advance partway through session
            const maxAdvance = Math.min(secondsBeforeEnd, durationMinutes * 60 - 10);
            jest.advanceTimersByTime(maxAdvance * 1000);
            
            const remainingBeforeEnd = controller.getRemainingTime();
            expect(remainingBeforeEnd).toBeGreaterThan(0);
            
            // Manually end session
            controller.endSession();
            
            // Verify session ended
            expect(sessionEnded).toBe(true);
            expect(controller.isActive()).toBe(false);
            expect(controller.getRemainingTime()).toBe(0);
            
          } finally {
            controller.dispose();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Test that session progress is always between 0 and 1
   */
  test('Session progress is always in valid range [0, 1]', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 60 }),
        fc.integer({ min: 0, max: 100 }), // Percentage of session to advance
        (durationMinutes, percentAdvance) => {
          const controller = new FocusController();
          
          try {
            controller.startSession(durationMinutes);
            
            // Advance by percentage
            const totalMs = durationMinutes * 60 * 1000;
            const advanceMs = Math.floor((totalMs * percentAdvance) / 100);
            jest.advanceTimersByTime(advanceMs);
            
            const progress = controller.getSessionProgress();
            
            // Progress should always be between 0 and 1
            expect(progress).toBeGreaterThanOrEqual(0);
            expect(progress).toBeLessThanOrEqual(1);
            
          } finally {
            controller.dispose();
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

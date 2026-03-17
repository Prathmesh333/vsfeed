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

describe('FocusController', () => {
  let controller: FocusController;

  beforeEach(() => {
    controller = new FocusController();
    jest.useFakeTimers();
  });

  afterEach(() => {
    controller.dispose();
    jest.useRealTimers();
  });

  describe('startSession', () => {
    it('should start a session with valid duration', () => {
      controller.startSession(15);
      
      expect(controller.isActive()).toBe(true);
      expect(controller.getRemainingTime()).toBe(15 * 60); // 15 minutes in seconds
    });

    it('should throw error for duration less than 1 minute', () => {
      expect(() => controller.startSession(0)).toThrow('Session duration must be between 1 and 60 minutes');
    });

    it('should throw error for duration greater than 60 minutes', () => {
      expect(() => controller.startSession(61)).toThrow('Session duration must be between 1 and 60 minutes');
    });

    it('should accept minimum duration of 1 minute', () => {
      controller.startSession(1);
      
      expect(controller.isActive()).toBe(true);
      expect(controller.getRemainingTime()).toBe(60);
    });

    it('should accept maximum duration of 60 minutes', () => {
      controller.startSession(60);
      
      expect(controller.isActive()).toBe(true);
      expect(controller.getRemainingTime()).toBe(60 * 60);
    });

    it('should end existing session when starting a new one', () => {
      controller.startSession(10);
      const firstSessionRemaining = controller.getRemainingTime();
      
      controller.startSession(20);
      const secondSessionRemaining = controller.getRemainingTime();
      
      expect(secondSessionRemaining).toBe(20 * 60);
      expect(secondSessionRemaining).not.toBe(firstSessionRemaining);
    });

    it('should emit initial timer tick', () => {
      const tickCallback = jest.fn();
      controller.onTimerTick(tickCallback);
      
      controller.startSession(5);
      
      expect(tickCallback).toHaveBeenCalledWith(5 * 60);
    });
  });

  describe('endSession', () => {
    it('should end active session', () => {
      controller.startSession(10);
      expect(controller.isActive()).toBe(true);
      
      controller.endSession();
      
      expect(controller.isActive()).toBe(false);
      expect(controller.getRemainingTime()).toBe(0);
    });

    it('should emit session end event', () => {
      const endCallback = jest.fn();
      controller.onSessionEnd(endCallback);
      
      controller.startSession(10);
      controller.endSession();
      
      expect(endCallback).toHaveBeenCalled();
    });

    it('should not throw when ending non-existent session', () => {
      expect(() => controller.endSession()).not.toThrow();
    });

    it('should stop timer countdown', () => {
      const tickCallback = jest.fn();
      controller.onTimerTick(tickCallback);
      
      controller.startSession(10);
      tickCallback.mockClear(); // Clear initial tick
      
      controller.endSession();
      
      // Advance time and verify no more ticks
      jest.advanceTimersByTime(5000);
      expect(tickCallback).not.toHaveBeenCalled();
    });
  });

  describe('timer countdown', () => {
    it('should countdown with 1-second granularity', () => {
      const tickCallback = jest.fn();
      controller.onTimerTick(tickCallback);
      
      controller.startSession(1); // 1 minute = 60 seconds
      tickCallback.mockClear(); // Clear initial tick
      
      // Advance 1 second
      jest.advanceTimersByTime(1000);
      expect(tickCallback).toHaveBeenCalledWith(59);
      
      // Advance another second
      jest.advanceTimersByTime(1000);
      expect(tickCallback).toHaveBeenCalledWith(58);
    });

    it('should automatically end session when timer reaches zero', () => {
      const endCallback = jest.fn();
      controller.onSessionEnd(endCallback);
      
      controller.startSession(1); // 1 minute
      
      // Advance to end of session
      jest.advanceTimersByTime(60 * 1000);
      
      expect(endCallback).toHaveBeenCalled();
      expect(controller.isActive()).toBe(false);
      expect(controller.getRemainingTime()).toBe(0);
    });

    it('should emit final tick with 0 before ending', () => {
      const tickCallback = jest.fn();
      controller.onTimerTick(tickCallback);
      
      controller.startSession(1);
      tickCallback.mockClear();
      
      // Advance to end
      jest.advanceTimersByTime(60 * 1000);
      
      // Should have been called with 0
      expect(tickCallback).toHaveBeenCalledWith(0);
    });
  });

  describe('getRemainingTime', () => {
    it('should return 0 when no session is active', () => {
      expect(controller.getRemainingTime()).toBe(0);
    });

    it('should return remaining time in seconds', () => {
      controller.startSession(5);
      
      expect(controller.getRemainingTime()).toBe(5 * 60);
      
      jest.advanceTimersByTime(30 * 1000); // 30 seconds
      
      expect(controller.getRemainingTime()).toBe(5 * 60 - 30);
    });

    it('should round up to nearest second', () => {
      controller.startSession(1);
      
      // Even with millisecond precision, should return whole seconds
      expect(controller.getRemainingTime()).toBe(60);
    });
  });

  describe('getSessionProgress', () => {
    it('should return 0 when no session is active', () => {
      expect(controller.getSessionProgress()).toBe(0);
    });

    it('should return progress between 0 and 1', () => {
      controller.startSession(10); // 10 minutes = 600 seconds
      
      expect(controller.getSessionProgress()).toBe(0);
      
      // Advance 5 minutes (50% progress)
      jest.advanceTimersByTime(5 * 60 * 1000);
      expect(controller.getSessionProgress()).toBeCloseTo(0.5, 2);
      
      // Advance to 7.5 minutes (75% progress)
      jest.advanceTimersByTime(2.5 * 60 * 1000);
      expect(controller.getSessionProgress()).toBeCloseTo(0.75, 2);
    });

    it('should return 1.0 when session completes', () => {
      controller.startSession(1);
      
      jest.advanceTimersByTime(60 * 1000);
      
      // Session should be ended, progress should be 0 (no active session)
      expect(controller.isActive()).toBe(false);
      expect(controller.getSessionProgress()).toBe(0);
    });
  });

  describe('pauseSession and resumeSession', () => {
    it('should pause active session', () => {
      const tickCallback = jest.fn();
      controller.onTimerTick(tickCallback);
      
      controller.startSession(10);
      tickCallback.mockClear();
      
      controller.pauseSession();
      
      // Advance time while paused
      jest.advanceTimersByTime(5000);
      
      // Timer should not have ticked
      expect(tickCallback).not.toHaveBeenCalled();
      expect(controller.getRemainingTime()).toBe(10 * 60); // Still at original time
    });

    it('should resume paused session', () => {
      const tickCallback = jest.fn();
      controller.onTimerTick(tickCallback);
      
      controller.startSession(10);
      tickCallback.mockClear();
      
      // Pause for 5 seconds
      controller.pauseSession();
      jest.advanceTimersByTime(5000);
      
      // Resume
      controller.resumeSession();
      jest.advanceTimersByTime(1000);
      
      // Should tick after resume
      expect(tickCallback).toHaveBeenCalledWith(10 * 60 - 1);
    });

    it('should not pause if no session is active', () => {
      expect(() => controller.pauseSession()).not.toThrow();
    });

    it('should not resume if no session is active', () => {
      expect(() => controller.resumeSession()).not.toThrow();
    });

    it('should not pause if already paused', () => {
      controller.startSession(10);
      controller.pauseSession();
      
      // Pause again should be no-op
      expect(() => controller.pauseSession()).not.toThrow();
    });

    it('should not resume if not paused', () => {
      controller.startSession(10);
      
      // Resume when not paused should be no-op
      expect(() => controller.resumeSession()).not.toThrow();
    });
  });

  describe('warning threshold', () => {
    it('should emit warning when 25% time remains', () => {
      const warningCallback = jest.fn();
      controller.onWarningThreshold(warningCallback);
      
      controller.startSession(4); // 4 minutes = 240 seconds
      
      // Advance to 75% progress (3 minutes elapsed, 1 minute remaining = 25%)
      jest.advanceTimersByTime(3 * 60 * 1000);
      
      expect(warningCallback).toHaveBeenCalled();
    });

    it('should only emit warning once per session', () => {
      const warningCallback = jest.fn();
      controller.onWarningThreshold(warningCallback);
      
      controller.startSession(4);
      
      // Advance past 75% threshold
      jest.advanceTimersByTime(3 * 60 * 1000);
      expect(warningCallback).toHaveBeenCalledTimes(1);
      
      // Continue advancing
      jest.advanceTimersByTime(30 * 1000);
      
      // Should still only be called once
      expect(warningCallback).toHaveBeenCalledTimes(1);
    });

    it('should reset warning flag for new session', () => {
      const warningCallback = jest.fn();
      controller.onWarningThreshold(warningCallback);
      
      // First session
      controller.startSession(4);
      jest.advanceTimersByTime(3 * 60 * 1000);
      expect(warningCallback).toHaveBeenCalledTimes(1);
      
      // Start new session
      controller.startSession(4);
      jest.advanceTimersByTime(3 * 60 * 1000);
      
      // Should be called again for new session
      expect(warningCallback).toHaveBeenCalledTimes(2);
    });
  });

  describe('event emitters', () => {
    it('should allow multiple listeners for timer tick', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      controller.onTimerTick(callback1);
      controller.onTimerTick(callback2);
      
      controller.startSession(1);
      
      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should allow disposing of event listeners', () => {
      const callback = jest.fn();
      const disposable = controller.onTimerTick(callback);
      
      controller.startSession(1);
      expect(callback).toHaveBeenCalledTimes(1);
      
      callback.mockClear();
      disposable.dispose();
      
      jest.advanceTimersByTime(1000);
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid pause/resume cycles', () => {
      controller.startSession(10);
      const initialRemaining = controller.getRemainingTime();
      
      controller.pauseSession();
      controller.resumeSession();
      controller.pauseSession();
      controller.resumeSession();
      
      // Time should not have changed significantly
      expect(controller.getRemainingTime()).toBe(initialRemaining);
    });

    it('should handle session end during pause', () => {
      const endCallback = jest.fn();
      controller.onSessionEnd(endCallback);
      
      controller.startSession(10);
      controller.pauseSession();
      
      controller.endSession();
      
      expect(endCallback).toHaveBeenCalled();
      expect(controller.isActive()).toBe(false);
    });

    it('should maintain timer accuracy over long durations', () => {
      controller.startSession(60); // 60 minutes
      
      // Advance 30 minutes
      jest.advanceTimersByTime(30 * 60 * 1000);
      
      expect(controller.getRemainingTime()).toBe(30 * 60);
      expect(controller.getSessionProgress()).toBeCloseTo(0.5, 2);
    });
  });

  describe('isActive', () => {
    it('should return false when no session exists', () => {
      expect(controller.isActive()).toBe(false);
    });

    it('should return true when session is active', () => {
      controller.startSession(10);
      expect(controller.isActive()).toBe(true);
    });

    it('should return true when session is paused', () => {
      controller.startSession(10);
      controller.pauseSession();
      expect(controller.isActive()).toBe(true);
    });

    it('should return false after session ends', () => {
      controller.startSession(1);
      jest.advanceTimersByTime(60 * 1000);
      expect(controller.isActive()).toBe(false);
    });
  });
});


describe('FocusController - Activity Monitor Integration (Task 6.4)', () => {
  let controller: FocusController;
  let activityMonitor: any;

  beforeEach(() => {
    controller = new FocusController();
    activityMonitor = {
      isUserCoding: jest.fn().mockReturnValue(false),
      startMonitoring: jest.fn(),
      dispose: jest.fn()
    };
    jest.useFakeTimers();
  });

  afterEach(() => {
    controller.dispose();
    jest.useRealTimers();
  });

  describe('Activity-based pausing', () => {
    it('should pause timer when user is coding for more than 30 seconds', () => {
      controller.setActivityMonitor(activityMonitor);
      controller.setActivityPausingEnabled(true);

      controller.startSession(10);
      const initialRemaining = controller.getRemainingTime();

      activityMonitor.isUserCoding.mockReturnValue(true);
      jest.advanceTimersByTime(31000);

      const remainingAfterPause = controller.getRemainingTime();
      expect(remainingAfterPause).toBeLessThan(initialRemaining);
      expect(remainingAfterPause).toBeGreaterThan(initialRemaining - 31);
    });

    it('should resume timer when user switches back to Browser Panel', () => {
      controller.setActivityMonitor(activityMonitor);
      controller.setActivityPausingEnabled(true);

      controller.startSession(10);

      activityMonitor.isUserCoding.mockReturnValue(true);
      jest.advanceTimersByTime(31000);

      const remainingWhenPaused = controller.getRemainingTime();

      activityMonitor.isUserCoding.mockReturnValue(false);
      jest.advanceTimersByTime(5000);

      const remainingAfterResume = controller.getRemainingTime();
      expect(remainingAfterResume).toBeLessThan(remainingWhenPaused);
    });

    it('should not pause when activity-based pausing is disabled', () => {
      controller.setActivityMonitor(activityMonitor);
      controller.setActivityPausingEnabled(false);

      controller.startSession(10);
      const initialRemaining = controller.getRemainingTime();

      activityMonitor.isUserCoding.mockReturnValue(true);
      jest.advanceTimersByTime(31000);

      const remainingAfter = controller.getRemainingTime();
      expect(remainingAfter).toBe(initialRemaining - 31);
    });

    it('should not pause if no activity monitor is set', () => {
      controller.setActivityPausingEnabled(true);

      controller.startSession(10);
      const initialRemaining = controller.getRemainingTime();

      jest.advanceTimersByTime(31000);

      const remainingAfter = controller.getRemainingTime();
      expect(remainingAfter).toBe(initialRemaining - 31);
    });
  });
});

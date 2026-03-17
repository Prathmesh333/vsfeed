import { ActivityMonitor } from './ActivityMonitor';
import * as vscode from 'vscode';

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
  },
  workspace: {
    onDidChangeTextDocument: jest.fn(() => ({ dispose: jest.fn() })),
  },
  window: {
    onDidChangeActiveTextEditor: jest.fn(() => ({ dispose: jest.fn() })),
    onDidChangeWindowState: jest.fn(() => ({ dispose: jest.fn() })),
  },
}), { virtual: true });

describe('ActivityMonitor', () => {
  let activityMonitor: ActivityMonitor;
  let mockTextDocumentChangeHandler: (event: vscode.TextDocumentChangeEvent) => void;
  let mockActiveEditorChangeHandler: (editor: vscode.TextEditor | undefined) => void;
  let mockWindowStateChangeHandler: (state: vscode.WindowState) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Capture event handlers
    (vscode.workspace.onDidChangeTextDocument as jest.Mock) = jest.fn((handler) => {
      mockTextDocumentChangeHandler = handler;
      return { dispose: jest.fn() };
    });

    (vscode.window.onDidChangeActiveTextEditor as jest.Mock) = jest.fn((handler) => {
      mockActiveEditorChangeHandler = handler;
      return { dispose: jest.fn() };
    });

    (vscode.window.onDidChangeWindowState as jest.Mock) = jest.fn((handler) => {
      mockWindowStateChangeHandler = handler;
      return { dispose: jest.fn() };
    });

    activityMonitor = new ActivityMonitor();
  });

  afterEach(() => {
    activityMonitor.dispose();
  });

  describe('startMonitoring', () => {
    it('should subscribe to text document changes', () => {
      activityMonitor.startMonitoring();
      
      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalled();
    });

    it('should subscribe to active editor changes', () => {
      activityMonitor.startMonitoring();
      
      expect(vscode.window.onDidChangeActiveTextEditor).toHaveBeenCalled();
    });

    it('should subscribe to window state changes', () => {
      activityMonitor.startMonitoring();
      
      expect(vscode.window.onDidChangeWindowState).toHaveBeenCalled();
    });

    it('should not subscribe multiple times if called repeatedly', () => {
      activityMonitor.startMonitoring();
      activityMonitor.startMonitoring();
      
      // Should only subscribe once
      expect(vscode.workspace.onDidChangeTextDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopMonitoring', () => {
    it('should dispose all subscriptions', () => {
      const disposeMock = jest.fn();
      (vscode.workspace.onDidChangeTextDocument as jest.Mock).mockReturnValue({ dispose: disposeMock });
      (vscode.window.onDidChangeActiveTextEditor as jest.Mock).mockReturnValue({ dispose: disposeMock });
      (vscode.window.onDidChangeWindowState as jest.Mock).mockReturnValue({ dispose: disposeMock });

      activityMonitor.startMonitoring();
      activityMonitor.stopMonitoring();
      
      expect(disposeMock).toHaveBeenCalledTimes(3);
    });

    it('should handle being called without starting monitoring', () => {
      expect(() => activityMonitor.stopMonitoring()).not.toThrow();
    });
  });

  describe('getTimeSinceLastActivity', () => {
    it('should return time since last activity', async () => {
      activityMonitor.startMonitoring();
      
      const timeBefore = activityMonitor.getTimeSinceLastActivity();
      
      // Wait a bit using real time
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const timeAfter = activityMonitor.getTimeSinceLastActivity();
      
      expect(timeAfter).toBeGreaterThanOrEqual(timeBefore);
    });

    it('should reset when activity is detected', () => {
      activityMonitor.startMonitoring();
      
      // Simulate text document change
      mockTextDocumentChangeHandler({
        document: {} as vscode.TextDocument,
        contentChanges: [{ text: 'a' } as vscode.TextDocumentContentChangeEvent],
        reason: undefined
      });
      
      const timeSinceActivity = activityMonitor.getTimeSinceLastActivity();
      
      // Should be very recent (< 100ms)
      expect(timeSinceActivity).toBeLessThan(100);
    });
  });

  describe('isUserCoding', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return true when activity is within 30 seconds', () => {
      activityMonitor.startMonitoring();
      
      // Simulate activity
      mockTextDocumentChangeHandler({
        document: {} as vscode.TextDocument,
        contentChanges: [{ text: 'a' } as vscode.TextDocumentContentChangeEvent],
        reason: undefined
      });
      
      expect(activityMonitor.isUserCoding()).toBe(true);
    });

    it('should return false when activity is older than 30 seconds', () => {
      activityMonitor.startMonitoring();
      
      // Simulate activity
      mockTextDocumentChangeHandler({
        document: {} as vscode.TextDocument,
        contentChanges: [{ text: 'a' } as vscode.TextDocumentContentChangeEvent],
        reason: undefined
      });
      
      // Advance time by 31 seconds
      jest.advanceTimersByTime(31000);
      
      expect(activityMonitor.isUserCoding()).toBe(false);
    });

    it('should return true immediately after activity', () => {
      activityMonitor.startMonitoring();
      
      // Simulate activity
      mockTextDocumentChangeHandler({
        document: {} as vscode.TextDocument,
        contentChanges: [{ text: 'a' } as vscode.TextDocumentContentChangeEvent],
        reason: undefined
      });
      
      expect(activityMonitor.isUserCoding()).toBe(true);
    });
  });

  describe('getTimeSinceLastBreak', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should return time since last break', () => {
      const timeBefore = activityMonitor.getTimeSinceLastBreak();
      
      jest.advanceTimersByTime(5000);
      
      const timeAfter = activityMonitor.getTimeSinceLastBreak();
      
      expect(timeAfter).toBeGreaterThan(timeBefore);
    });

    it('should reset when updateLastBreakTime is called', () => {
      jest.advanceTimersByTime(10000);
      
      activityMonitor.updateLastBreakTime();
      
      const timeSinceBreak = activityMonitor.getTimeSinceLastBreak();
      
      expect(timeSinceBreak).toBeLessThan(100);
    });
  });

  describe('onCodingActivityDetected', () => {
    it('should emit event when coding activity is detected', () => {
      const callback = jest.fn();
      const disposable = activityMonitor.onCodingActivityDetected(callback);
      activityMonitor.startMonitoring();
      
      // Simulate text document change
      mockTextDocumentChangeHandler({
        document: {} as vscode.TextDocument,
        contentChanges: [{ text: 'a' } as vscode.TextDocumentContentChangeEvent],
        reason: undefined
      });
      
      expect(callback).toHaveBeenCalled();
      disposable.dispose();
    });

    it('should not emit event for empty content changes', () => {
      const callback = jest.fn();
      const disposable = activityMonitor.onCodingActivityDetected(callback);
      activityMonitor.startMonitoring();
      
      // Simulate empty change
      mockTextDocumentChangeHandler({
        document: {} as vscode.TextDocument,
        contentChanges: [],
        reason: undefined
      });
      
      expect(callback).not.toHaveBeenCalled();
      disposable.dispose();
    });
  });

  describe('text document change handling', () => {
    it('should update activity state on text document change', () => {
      activityMonitor.startMonitoring();
      
      const stateBefore = activityMonitor.getActivityState();
      
      // Simulate text document change
      mockTextDocumentChangeHandler({
        document: {} as vscode.TextDocument,
        contentChanges: [{ text: 'a' } as vscode.TextDocumentContentChangeEvent],
        reason: undefined
      });
      
      const stateAfter = activityMonitor.getActivityState();
      
      expect(stateAfter.lastEditorInteraction).toBeGreaterThanOrEqual(stateBefore.lastEditorInteraction);
      expect(stateAfter.isCurrentlyCoding).toBe(true);
    });

    it('should ignore empty content changes', () => {
      activityMonitor.startMonitoring();
      
      const stateBefore = activityMonitor.getActivityState();
      
      // Simulate empty change
      mockTextDocumentChangeHandler({
        document: {} as vscode.TextDocument,
        contentChanges: [],
        reason: undefined
      });
      
      const stateAfter = activityMonitor.getActivityState();
      
      expect(stateAfter.lastEditorInteraction).toBe(stateBefore.lastEditorInteraction);
    });
  });

  describe('active editor change handling', () => {
    it('should update activity state when editor changes', () => {
      activityMonitor.startMonitoring();
      
      const stateBefore = activityMonitor.getActivityState();
      
      // Simulate editor change
      mockActiveEditorChangeHandler({} as vscode.TextEditor);
      
      const stateAfter = activityMonitor.getActivityState();
      
      expect(stateAfter.lastEditorInteraction).toBeGreaterThanOrEqual(stateBefore.lastEditorInteraction);
    });

    it('should not update activity state when editor is undefined', () => {
      activityMonitor.startMonitoring();
      
      const stateBefore = activityMonitor.getActivityState();
      
      // Simulate editor change to undefined
      mockActiveEditorChangeHandler(undefined);
      
      const stateAfter = activityMonitor.getActivityState();
      
      expect(stateAfter.lastEditorInteraction).toBe(stateBefore.lastEditorInteraction);
    });
  });

  describe('window state change handling', () => {
    it('should update activity state when window gains focus', () => {
      activityMonitor.startMonitoring();
      
      const stateBefore = activityMonitor.getActivityState();
      
      // Simulate window focus
      mockWindowStateChangeHandler({ focused: true } as vscode.WindowState);
      
      const stateAfter = activityMonitor.getActivityState();
      
      expect(stateAfter.lastEditorInteraction).toBeGreaterThanOrEqual(stateBefore.lastEditorInteraction);
    });

    it('should not update activity state when window loses focus', () => {
      activityMonitor.startMonitoring();
      
      const stateBefore = activityMonitor.getActivityState();
      
      // Simulate window blur
      mockWindowStateChangeHandler({ focused: false } as vscode.WindowState);
      
      const stateAfter = activityMonitor.getActivityState();
      
      expect(stateAfter.lastEditorInteraction).toBe(stateBefore.lastEditorInteraction);
    });
  });

  describe('updateLastBreakTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should update last break time', () => {
      jest.advanceTimersByTime(5000);
      
      activityMonitor.updateLastBreakTime();
      
      const timeAfter = activityMonitor.getTimeSinceLastBreak();
      
      // Should be very recent (< 100ms)
      expect(timeAfter).toBeLessThan(100);
    });

    it('should reset continuous coding duration', () => {
      activityMonitor.startMonitoring();
      
      // Simulate some coding activity
      mockTextDocumentChangeHandler({
        document: {} as vscode.TextDocument,
        contentChanges: [{ text: 'a' } as vscode.TextDocumentContentChangeEvent],
        reason: undefined
      });
      
      activityMonitor.updateLastBreakTime();
      
      const state = activityMonitor.getActivityState();
      expect(state.continuousCodingDuration).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should stop monitoring and dispose all resources', () => {
      const disposeMock = jest.fn();
      (vscode.workspace.onDidChangeTextDocument as jest.Mock).mockReturnValue({ dispose: disposeMock });
      (vscode.window.onDidChangeActiveTextEditor as jest.Mock).mockReturnValue({ dispose: disposeMock });
      (vscode.window.onDidChangeWindowState as jest.Mock).mockReturnValue({ dispose: disposeMock });

      activityMonitor.startMonitoring();
      activityMonitor.dispose();
      
      expect(disposeMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('getActivityState', () => {
    it('should return a copy of the activity state', () => {
      const state1 = activityMonitor.getActivityState();
      const state2 = activityMonitor.getActivityState();
      
      // Should be equal but not the same object
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2);
    });
  });
});


describe('ActivityMonitor - Break Suggestion System (Task 6.5)', () => {
  let monitor: ActivityMonitor;

  beforeEach(() => {
    monitor = new ActivityMonitor();
    jest.useFakeTimers();
  });

  afterEach(() => {
    monitor.dispose();
    jest.useRealTimers();
  });

  describe('Break suggestion threshold', () => {
    it('should emit break suggestion when threshold exceeded', () => {
      const breakCallback = jest.fn();
      monitor.onBreakSuggestionThreshold(breakCallback);

      monitor.setBreakSuggestionThreshold(90);
      monitor.setBreakSuggestionsEnabled(true);
      monitor.startMonitoring();

      jest.advanceTimersByTime(89 * 60 * 1000);
      expect(breakCallback).not.toHaveBeenCalled();

      jest.advanceTimersByTime(2 * 60 * 1000);
      expect(breakCallback).toHaveBeenCalled();
    });

    it('should respect custom threshold values', () => {
      const breakCallback = jest.fn();
      monitor.onBreakSuggestionThreshold(breakCallback);

      monitor.setBreakSuggestionThreshold(30);
      monitor.setBreakSuggestionsEnabled(true);
      monitor.startMonitoring();

      jest.advanceTimersByTime(31 * 60 * 1000);
      expect(breakCallback).toHaveBeenCalled();
    });

    it('should not emit when break suggestions are disabled', () => {
      const breakCallback = jest.fn();
      monitor.onBreakSuggestionThreshold(breakCallback);

      monitor.setBreakSuggestionThreshold(30);
      monitor.setBreakSuggestionsEnabled(false);
      monitor.startMonitoring();

      jest.advanceTimersByTime(35 * 60 * 1000);
      expect(breakCallback).not.toHaveBeenCalled();
    });

    it('should only emit break suggestion once per threshold', () => {
      const breakCallback = jest.fn();
      monitor.onBreakSuggestionThreshold(breakCallback);

      monitor.setBreakSuggestionThreshold(30);
      monitor.setBreakSuggestionsEnabled(true);
      monitor.startMonitoring();

      jest.advanceTimersByTime(35 * 60 * 1000);
      expect(breakCallback).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(10 * 60 * 1000);
      expect(breakCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTimeSinceLastBreak', () => {
    it('should track time since last break', () => {
      const initialTime = monitor.getTimeSinceLastBreak();
      expect(initialTime).toBeGreaterThanOrEqual(0);

      jest.advanceTimersByTime(5 * 60 * 1000);

      const afterFiveMinutes = monitor.getTimeSinceLastBreak();
      expect(afterFiveMinutes).toBeGreaterThanOrEqual(5 * 60 * 1000);
    });

    it('should reset when updateLastBreakTime is called', () => {
      jest.advanceTimersByTime(30 * 60 * 1000);

      const beforeReset = monitor.getTimeSinceLastBreak();
      expect(beforeReset).toBeGreaterThanOrEqual(30 * 60 * 1000);

      monitor.updateLastBreakTime();

      const afterReset = monitor.getTimeSinceLastBreak();
      expect(afterReset).toBeLessThan(1000);
    });
  });

  describe('updateLastBreakTime', () => {
    it('should reset continuous coding duration', () => {
      monitor.startMonitoring();

      const state = monitor.getActivityState();
      expect(state.continuousCodingDuration).toBe(0);

      monitor.updateLastBreakTime();

      const newState = monitor.getActivityState();
      expect(newState.continuousCodingDuration).toBe(0);
    });

    it('should reset break suggestion trigger flag', () => {
      const breakCallback = jest.fn();
      monitor.onBreakSuggestionThreshold(breakCallback);

      monitor.setBreakSuggestionThreshold(30);
      monitor.setBreakSuggestionsEnabled(true);
      monitor.startMonitoring();

      jest.advanceTimersByTime(35 * 60 * 1000);
      expect(breakCallback).toHaveBeenCalledTimes(1);

      monitor.updateLastBreakTime();

      jest.advanceTimersByTime(35 * 60 * 1000);
      expect(breakCallback).toHaveBeenCalledTimes(2);
    });
  });
});

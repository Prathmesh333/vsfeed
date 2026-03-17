import * as vscode from 'vscode';
import { SessionState } from '../models/SessionState';
import { ActivityMonitor } from './ActivityMonitor';

export class FocusController {
  private sessionState?: SessionState;
  private timerInterval?: NodeJS.Timeout;
  private timerTickEmitter = new vscode.EventEmitter<number>();
  private sessionEndEmitter = new vscode.EventEmitter<void>();
  private warningThresholdEmitter = new vscode.EventEmitter<void>();
  private warningThresholdTriggered = false;
  private activityMonitor?: ActivityMonitor;
  private enableActivityPausing = true;
  private lastCodingCheckTime = 0;
  private codingDetectedDuration = 0;

  /**
   * Set the activity monitor for activity-based pausing
   * Requirements: 4.2, 4.3, 4.4
   */
  setActivityMonitor(activityMonitor: ActivityMonitor): void {
    this.activityMonitor = activityMonitor;
  }

  /**
   * Configure activity-based pausing
   * Requirements: 4.4
   */
  setActivityPausingEnabled(enabled: boolean): void {
    this.enableActivityPausing = enabled;
  }

  /**
   * Start a new focus mode session with configurable duration
   * Requirements: 2.1, 2.2, 2.4
   */
  startSession(durationMinutes: number): void {
    // Validate duration (1-60 minutes)
    if (durationMinutes < 1 || durationMinutes > 60) {
      throw new Error('Session duration must be between 1 and 60 minutes');
    }

    // End any existing session
    if (this.sessionState) {
      this.endSession();
    }

    // Create new session state
    const durationMs = durationMinutes * 60 * 1000;
    this.sessionState = {
      sessionId: this.generateSessionId(),
      startTime: Date.now(),
      durationMs: durationMs,
      remainingMs: durationMs,
      isPaused: false
    };

    this.warningThresholdTriggered = false;

    // Reset activity-based pausing state
    this.lastCodingCheckTime = Date.now();
    this.codingDetectedDuration = 0;

    // Start timer countdown with 1-second granularity
    this.timerInterval = setInterval(() => {
      this.tick();
    }, 1000);

    // Emit initial tick
    this.timerTickEmitter.fire(Math.ceil(this.sessionState.remainingMs / 1000));
  }

  /**
   * End the current session and trigger cleanup
   * Requirements: 2.1
   */
  endSession(): void {
    if (!this.sessionState) {
      return;
    }

    // Stop timer
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }

    // Clear session state
    this.sessionState = undefined;
    this.warningThresholdTriggered = false;

    // Emit session end event
    this.sessionEndEmitter.fire();
  }

  /**
   * Pause the current session
   * Requirements: 4.2
   */
  pauseSession(): void {
    if (!this.sessionState || this.sessionState.isPaused) {
      return;
    }

    this.sessionState.isPaused = true;
    this.sessionState.pausedAt = Date.now();
  }

  /**
   * Resume the current session
   * Requirements: 4.3
   */
  resumeSession(): void {
    if (!this.sessionState || !this.sessionState.isPaused) {
      return;
    }

    this.sessionState.isPaused = false;
    this.sessionState.pausedAt = undefined;
  }

  /**
   * Check if a session is currently active
   * Requirements: 2.1
   */
  isActive(): boolean {
    return this.sessionState !== undefined;
  }

  /**
   * Get remaining time in seconds
   * Requirements: 2.2
   */
  getRemainingTime(): number {
    if (!this.sessionState) {
      return 0;
    }

    return Math.ceil(this.sessionState.remainingMs / 1000);
  }

  /**
   * Get session progress as a value between 0.0 and 1.0
   * Requirements: 2.2
   */
  getSessionProgress(): number {
    if (!this.sessionState) {
      return 0;
    }

    const elapsed = this.sessionState.durationMs - this.sessionState.remainingMs;
    return elapsed / this.sessionState.durationMs;
  }

  /**
   * Register callback for timer tick events (fires every second)
   * Requirements: 2.2
   */
  onTimerTick(callback: (remaining: number) => void): vscode.Disposable {
    return this.timerTickEmitter.event(callback);
  }

  /**
   * Register callback for session end events
   * Requirements: 2.3, 2.5
   */
  onSessionEnd(callback: () => void): vscode.Disposable {
    return this.sessionEndEmitter.event(callback);
  }

  /**
   * Register callback for warning threshold events (25% remaining)
   * Requirements: 3.1
   */
  onWarningThreshold(callback: () => void): vscode.Disposable {
    return this.warningThresholdEmitter.event(callback);
  }

  /**
   * Timer tick handler - decrements remaining time and checks thresholds
   * Requirements: 2.1, 2.2, 3.1, 4.2, 4.3
   */
  private tick(): void {
    if (!this.sessionState) {
      return;
    }

    // Check for activity-based pausing
    if (this.enableActivityPausing && this.activityMonitor) {
      const isUserCoding = this.activityMonitor.isUserCoding();
      const now = Date.now();
      const timeSinceLastCheck = now - this.lastCodingCheckTime;
      this.lastCodingCheckTime = now;

      if (isUserCoding) {
        // User is coding - accumulate coding duration
        this.codingDetectedDuration += timeSinceLastCheck;

        // If coding detected for >30 seconds, pause timer
        if (this.codingDetectedDuration > 30 * 1000 && !this.sessionState.isPaused) {
          this.pauseSession();
        }
      } else {
        // User is not coding - reset coding duration and resume if paused
        this.codingDetectedDuration = 0;
        if (this.sessionState.isPaused) {
          this.resumeSession();
        }
      }
    }

    // Don't decrement if paused
    if (this.sessionState.isPaused) {
      return;
    }

    // Decrement remaining time by 1 second
    this.sessionState.remainingMs -= 1000;

    // Check if timer reached zero
    if (this.sessionState.remainingMs <= 0) {
      this.sessionState.remainingMs = 0;
      this.timerTickEmitter.fire(0);
      this.endSession();
      return;
    }

    // Emit timer tick event
    const remainingSeconds = Math.ceil(this.sessionState.remainingMs / 1000);
    this.timerTickEmitter.fire(remainingSeconds);

    // Check for warning threshold (25% remaining)
    const progress = this.getSessionProgress();
    if (progress >= 0.75 && !this.warningThresholdTriggered) {
      this.warningThresholdTriggered = true;
      this.warningThresholdEmitter.fire();
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.endSession();
    this.timerTickEmitter.dispose();
    this.sessionEndEmitter.dispose();
    this.warningThresholdEmitter.dispose();
  }
}

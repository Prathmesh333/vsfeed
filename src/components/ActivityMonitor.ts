import * as vscode from 'vscode';
import { ActivityState } from '../models/ActivityState';

/**
 * ActivityMonitor tracks user coding activity to enable intelligent timer pausing
 * and break suggestions.
 * Requirements: 4.1, 4.5
 */
export class ActivityMonitor {
  private activityState: ActivityState;
  private subscriptions: vscode.Disposable[] = [];
  private codingActivityEmitter = new vscode.EventEmitter<void>();
  private breakSuggestionEmitter = new vscode.EventEmitter<void>();
  private isMonitoring = false;
  private breakSuggestionThresholdMs = 90 * 60 * 1000; // Default 90 minutes
  private breakSuggestionsEnabled = true;
  private breakSuggestionTriggered = false;
  private continuousCodingCheckInterval?: NodeJS.Timeout;

  // 30-second threshold for determining if user is actively coding
  private readonly CODING_THRESHOLD_MS = 30 * 1000;

  constructor() {
    this.activityState = {
      lastEditorInteraction: Date.now(),
      lastBreakTime: Date.now(),
      continuousCodingDuration: 0,
      isCurrentlyCoding: false
    };
  }

  /**
   * Configure break suggestion threshold
   * Requirements: 5.2
   */
  setBreakSuggestionThreshold(minutes: number): void {
    this.breakSuggestionThresholdMs = minutes * 60 * 1000;
  }

  /**
   * Configure break suggestions enabled/disabled
   * Requirements: 5.4
   */
  setBreakSuggestionsEnabled(enabled: boolean): void {
    this.breakSuggestionsEnabled = enabled;
  }

  /**
   * Start monitoring user activity
   * Requirements: 4.1
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;

    // Subscribe to text document changes for typing detection
    const textDocumentSubscription = vscode.workspace.onDidChangeTextDocument((event) => {
      this.handleTextDocumentChange(event);
    });
    this.subscriptions.push(textDocumentSubscription);

    // Subscribe to active editor changes for editor focus
    const activeEditorSubscription = vscode.window.onDidChangeActiveTextEditor((editor) => {
      this.handleActiveEditorChange(editor);
    });
    this.subscriptions.push(activeEditorSubscription);

    // Subscribe to window state changes for window focus
    const windowStateSubscription = vscode.window.onDidChangeWindowState((state) => {
      this.handleWindowStateChange(state);
    });
    this.subscriptions.push(windowStateSubscription);

    // Start continuous coding duration check (every 10 seconds)
    this.continuousCodingCheckInterval = setInterval(() => {
      this.checkBreakSuggestionThreshold();
    }, 10000);
  }

  /**
   * Stop monitoring user activity
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;

    // Dispose all subscriptions
    this.subscriptions.forEach(sub => sub.dispose());
    this.subscriptions = [];

    // Clear continuous coding check interval
    if (this.continuousCodingCheckInterval) {
      clearInterval(this.continuousCodingCheckInterval);
      this.continuousCodingCheckInterval = undefined;
    }
  }

  /**
   * Get time in milliseconds since last editor interaction
   * Requirements: 4.5
   */
  getTimeSinceLastActivity(): number {
    return Date.now() - this.activityState.lastEditorInteraction;
  }

  /**
   * Check if user is currently coding (activity within 30 seconds)
   * Requirements: 4.1
   */
  isUserCoding(): boolean {
    return this.getTimeSinceLastActivity() < this.CODING_THRESHOLD_MS;
  }

  /**
   * Get time in milliseconds since last break
   * Requirements: 5.5
   */
  getTimeSinceLastBreak(): number {
    return Date.now() - this.activityState.lastBreakTime;
  }

  /**
   * Register callback for coding activity detection
   * Requirements: 4.1
   */
  onCodingActivityDetected(callback: () => void): vscode.Disposable {
    return this.codingActivityEmitter.event(callback);
  }

  /**
   * Register callback for break suggestion threshold
   * Requirements: 5.1, 5.2
   */
  onBreakSuggestionThreshold(callback: () => void): vscode.Disposable {
    return this.breakSuggestionEmitter.event(callback);
  }

  /**
   * Update last break time (called when user takes a break)
   * Requirements: 5.5
   */
  updateLastBreakTime(): void {
    this.activityState.lastBreakTime = Date.now();
    this.activityState.continuousCodingDuration = 0;
    this.breakSuggestionTriggered = false;
  }

  /**
   * Get current activity state (for testing and debugging)
   */
  getActivityState(): ActivityState {
    return { ...this.activityState };
  }

  /**
   * Handle text document changes (typing detection)
   * Requirements: 4.1
   */
  private handleTextDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    // Ignore empty changes
    if (event.contentChanges.length === 0) {
      return;
    }

    // Update activity timestamp
    this.recordActivity();
  }

  /**
   * Handle active editor changes (editor focus)
   * Requirements: 4.1
   */
  private handleActiveEditorChange(editor: vscode.TextEditor | undefined): void {
    if (editor) {
      this.recordActivity();
    }
  }

  /**
   * Handle window state changes (window focus)
   * Requirements: 4.1
   */
  private handleWindowStateChange(state: vscode.WindowState): void {
    if (state.focused) {
      this.recordActivity();
    }
  }

  /**
   * Record an activity event and update state
   * Requirements: 4.1, 4.5
   */
  private recordActivity(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.activityState.lastEditorInteraction;

    // Update last interaction time
    this.activityState.lastEditorInteraction = now;

    // Update coding state
    const wasCoding = this.activityState.isCurrentlyCoding;
    this.activityState.isCurrentlyCoding = true;

    // Emit coding activity detected event if transitioning to coding state
    if (!wasCoding) {
      this.codingActivityEmitter.fire();
    }

    // Update continuous coding duration
    if (timeSinceLastActivity < this.CODING_THRESHOLD_MS) {
      // Activity within threshold - add to continuous duration
      this.activityState.continuousCodingDuration += timeSinceLastActivity;
    } else {
      // Gap in activity - reset continuous duration
      this.activityState.continuousCodingDuration = 0;
    }
  }

  /**
   * Check if break suggestion threshold has been exceeded
   * Requirements: 5.1, 5.2
   */
  private checkBreakSuggestionThreshold(): void {
    if (!this.breakSuggestionsEnabled || this.breakSuggestionTriggered) {
      return;
    }

    const timeSinceLastBreak = this.getTimeSinceLastBreak();
    
    if (timeSinceLastBreak >= this.breakSuggestionThresholdMs) {
      this.breakSuggestionTriggered = true;
      this.breakSuggestionEmitter.fire();
    }
  }

  /**
   * Dispose all resources
   */
  dispose(): void {
    this.stopMonitoring();
    this.codingActivityEmitter.dispose();
    this.breakSuggestionEmitter.dispose();
  }
}

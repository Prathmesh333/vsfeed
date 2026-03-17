export interface SessionState {
  sessionId: string;
  startTime: number;
  durationMs: number;
  remainingMs: number;
  isPaused: boolean;
  pausedAt?: number;
}

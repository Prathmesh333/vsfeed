import * as vscode from 'vscode';
import { PanelPosition } from './BrowserManager';

export interface WorkspaceState {
  currentUrl?: string;
  panelVisible: boolean;
  panelPosition: PanelPosition;
  lastBreakTimestamp?: number;
  authCookies?: Record<string, string>;
}

const WORKSPACE_STATE_KEY = 'vsfeed.workspaceState';

export class StateManager {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Save workspace state with JSON serialization
   * Handles errors gracefully by logging but not throwing
   */
  async saveState(state: WorkspaceState): Promise<void> {
    try {
      // Serialize state to JSON string for storage
      const serialized = JSON.stringify(state);
      await this.context.workspaceState.update(WORKSPACE_STATE_KEY, serialized);
    } catch (error) {
      // Log error but don't throw - state persistence failures shouldn't block operations
      console.error('Failed to save workspace state:', error);
    }
  }

  /**
   * Load workspace state with default initialization for missing state
   * Handles corrupted state data by returning defaults
   */
  async loadState(): Promise<WorkspaceState> {
    try {
      const serialized = this.context.workspaceState.get<string>(WORKSPACE_STATE_KEY);
      
      // If no state exists, return default state
      if (!serialized) {
        return this.getDefaultState();
      }

      // Parse JSON and validate structure
      const parsed = JSON.parse(serialized);
      
      // Validate that parsed data has expected structure
      if (!this.isValidWorkspaceState(parsed)) {
        console.warn('Invalid workspace state structure, using defaults');
        return this.getDefaultState();
      }

      return parsed as WorkspaceState;
    } catch (error) {
      // Handle corrupted state data (JSON parse errors, etc.)
      console.error('Failed to load workspace state, using defaults:', error);
      return this.getDefaultState();
    }
  }

  /**
   * Clear workspace state for state reset
   */
  async clearState(): Promise<void> {
    try {
      await this.context.workspaceState.update(WORKSPACE_STATE_KEY, undefined);
    } catch (error) {
      console.error('Failed to clear workspace state:', error);
      throw error; // Throw here since clear is an explicit user action
    }
  }

  /**
   * Get default workspace state for initialization
   */
  private getDefaultState(): WorkspaceState {
    return {
      panelVisible: false,
      panelPosition: PanelPosition.Sidebar,
    };
  }

  /**
   * Validate that an object has the expected WorkspaceState structure
   */
  private isValidWorkspaceState(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    // Check required fields
    if (typeof obj.panelVisible !== 'boolean') {
      return false;
    }

    if (obj.panelPosition !== PanelPosition.Sidebar && 
        obj.panelPosition !== PanelPosition.EditorColumn) {
      return false;
    }

    // Check optional fields if present
    if (obj.currentUrl !== undefined && typeof obj.currentUrl !== 'string') {
      return false;
    }

    if (obj.lastBreakTimestamp !== undefined && typeof obj.lastBreakTimestamp !== 'number') {
      return false;
    }

    if (obj.authCookies !== undefined && 
        (typeof obj.authCookies !== 'object' || obj.authCookies === null)) {
      return false;
    }

    return true;
  }
}

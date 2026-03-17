import { StateManager, WorkspaceState } from './StateManager';
import { PanelPosition } from './BrowserManager';
import { MockExtensionContext } from '../__mocks__/vscode';

describe('StateManager', () => {
  let stateManager: StateManager;
  let mockContext: MockExtensionContext;

  beforeEach(() => {
    // Clear storage between tests
    MockExtensionContext.clearStorage();
    mockContext = new MockExtensionContext();
    stateManager = new StateManager(mockContext as any);
  });

  describe('saveState', () => {
    test('saves workspace state with JSON serialization', async () => {
      const state: WorkspaceState = {
        currentUrl: 'https://example.com',
        panelVisible: true,
        panelPosition: PanelPosition.EditorColumn,
        lastBreakTimestamp: Date.now(),
      };

      await stateManager.saveState(state);

      expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
        'vsfeed.workspaceState',
        JSON.stringify(state)
      );
    });

    test('handles state with optional fields', async () => {
      const state: WorkspaceState = {
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      };

      await stateManager.saveState(state);

      expect(mockContext.workspaceState.update).toHaveBeenCalled();
    });

    test('handles errors gracefully without throwing', async () => {
      const state: WorkspaceState = {
        panelVisible: true,
        panelPosition: PanelPosition.Sidebar,
      };

      // Mock update to throw error
      mockContext.workspaceState.update = jest.fn().mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(stateManager.saveState(state)).resolves.not.toThrow();
    });
  });

  describe('loadState', () => {
    test('loads saved workspace state', async () => {
      const savedState: WorkspaceState = {
        currentUrl: 'https://example.com',
        panelVisible: true,
        panelPosition: PanelPosition.EditorColumn,
        lastBreakTimestamp: 1234567890,
      };

      await stateManager.saveState(savedState);
      const loadedState = await stateManager.loadState();

      expect(loadedState).toEqual(savedState);
    });

    test('returns default state when no state exists', async () => {
      const state = await stateManager.loadState();

      expect(state).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });

    test('handles corrupted JSON data by returning defaults', async () => {
      // Manually set corrupted data
      mockContext.workspaceState.get = jest.fn().mockReturnValue('{ invalid json');

      const state = await stateManager.loadState();

      expect(state).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });

    test('handles invalid state structure by returning defaults', async () => {
      // Save invalid state structure
      mockContext.workspaceState.get = jest.fn().mockReturnValue(
        JSON.stringify({ invalid: 'structure' })
      );

      const state = await stateManager.loadState();

      expect(state).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });

    test('validates panelVisible is boolean', async () => {
      mockContext.workspaceState.get = jest.fn().mockReturnValue(
        JSON.stringify({
          panelVisible: 'true', // string instead of boolean
          panelPosition: PanelPosition.Sidebar,
        })
      );

      const state = await stateManager.loadState();

      expect(state).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });

    test('validates panelPosition is valid enum value', async () => {
      mockContext.workspaceState.get = jest.fn().mockReturnValue(
        JSON.stringify({
          panelVisible: true,
          panelPosition: 999, // invalid enum value
        })
      );

      const state = await stateManager.loadState();

      expect(state).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });

    test('validates optional currentUrl is string', async () => {
      mockContext.workspaceState.get = jest.fn().mockReturnValue(
        JSON.stringify({
          panelVisible: true,
          panelPosition: PanelPosition.Sidebar,
          currentUrl: 12345, // number instead of string
        })
      );

      const state = await stateManager.loadState();

      expect(state).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });

    test('validates optional lastBreakTimestamp is number', async () => {
      mockContext.workspaceState.get = jest.fn().mockReturnValue(
        JSON.stringify({
          panelVisible: true,
          panelPosition: PanelPosition.Sidebar,
          lastBreakTimestamp: '1234567890', // string instead of number
        })
      );

      const state = await stateManager.loadState();

      expect(state).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });
  });

  describe('clearState', () => {
    test('clears workspace state', async () => {
      const state: WorkspaceState = {
        currentUrl: 'https://example.com',
        panelVisible: true,
        panelPosition: PanelPosition.EditorColumn,
      };

      await stateManager.saveState(state);
      await stateManager.clearState();

      expect(mockContext.workspaceState.update).toHaveBeenCalledWith(
        'vsfeed.workspaceState',
        undefined
      );

      // Verify state is actually cleared
      const loadedState = await stateManager.loadState();
      expect(loadedState).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });

    test('throws error on clear failure', async () => {
      mockContext.workspaceState.update = jest.fn().mockRejectedValue(new Error('Clear failed'));

      await expect(stateManager.clearState()).rejects.toThrow('Clear failed');
    });
  });

  describe('edge cases', () => {
    test('handles null state data', async () => {
      mockContext.workspaceState.get = jest.fn().mockReturnValue(null);

      const state = await stateManager.loadState();

      expect(state).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });

    test('handles undefined state data', async () => {
      mockContext.workspaceState.get = jest.fn().mockReturnValue(undefined);

      const state = await stateManager.loadState();

      expect(state).toEqual({
        panelVisible: false,
        panelPosition: PanelPosition.Sidebar,
      });
    });

    test('preserves all optional fields when present and valid', async () => {
      const state: WorkspaceState = {
        currentUrl: 'https://example.com',
        panelVisible: true,
        panelPosition: PanelPosition.EditorColumn,
        lastBreakTimestamp: 1234567890,
        authCookies: { sessionId: 'abc123' },
      };

      await stateManager.saveState(state);
      const loadedState = await stateManager.loadState();

      expect(loadedState).toEqual(state);
    });

    test('handles empty authCookies object', async () => {
      const state: WorkspaceState = {
        panelVisible: true,
        panelPosition: PanelPosition.Sidebar,
        authCookies: {},
      };

      await stateManager.saveState(state);
      const loadedState = await stateManager.loadState();

      expect(loadedState).toEqual(state);
    });
  });
});

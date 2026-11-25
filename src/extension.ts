import * as vscode from 'vscode';
import { BrowserManager, PanelPosition } from './components/BrowserManager';
import { ConfigurationManager, PlatformShortcut } from './components/ConfigurationManager';
import { StateManager } from './components/StateManager';
import { FocusController } from './components/FocusController';
import { ActivityMonitor } from './components/ActivityMonitor';

interface StoredShortcut extends PlatformShortcut {
  id: string;
}

const CUSTOM_SHORTCUTS_KEY = 'vsfeed.customShortcuts';

// Global instances
let browserManager: BrowserManager;
let configManager: ConfigurationManager;
let stateManager: StateManager;
let focusController: FocusController;
let activityMonitor: ActivityMonitor;
let extensionContext: vscode.ExtensionContext;
let suppressSessionCompletion = false;
let activeDurationMinutes = 15;
let closeTimer: ReturnType<typeof setTimeout> | undefined;

function syncSession(): void {
  browserManager.postMessageToWebView({ type: 'sessionState', active: focusController.isActive(), remaining: focusController.getRemainingTime(), duration: activeDurationMinutes });
}

function startBreak(minutes: number): void {
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 60) { return; }
  if (closeTimer) { clearTimeout(closeTimer); closeTimer = undefined; }
  suppressSessionCompletion = true;
  focusController.endSession();
  suppressSessionCompletion = false;
  activeDurationMinutes = minutes;
  browserManager.postMessageToWebView({ type: 'removeBlur' });
  focusController.startSession(minutes);
  syncSession();
}

/**
 * Extension activation function
 * Requirements: 8.4, 16.1
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('VSFeed extension is now active');
  extensionContext = context;

  // Initialize ConfigurationManager
  configManager = new ConfigurationManager();

  // Initialize StateManager with extension context
  stateManager = new StateManager(context);

  // Create BrowserManager instance
  browserManager = new BrowserManager(context);

  // Create FocusController instance
  focusController = new FocusController();

  // Create ActivityMonitor instance
  activityMonitor = new ActivityMonitor();

  // Wire components together (Task 16.3)
  wireComponents();

  // Register all commands (Task 15.1)
  registerCommands(context);

  // Restore workspace state on activation
  await restoreWorkspaceState();

  // Start activity monitoring
  activityMonitor.startMonitoring();

  console.log('VSFeed extension activated successfully');
}

/**
 * Extension deactivation function
 * Requirements: 8.1
 */
export async function deactivate() {
  console.log('VSFeed extension is now deactivating');

  if (closeTimer) { clearTimeout(closeTimer); }

  // Save current workspace state
  if (browserManager && stateManager) {
    await stateManager.saveState({
      currentUrl: browserManager.getCurrentUrl(),
      panelVisible: browserManager.isVisible(),
      panelPosition: PanelPosition.Sidebar,
      lastBreakTimestamp: activityMonitor?.getActivityState().lastBreakTime
    });
  }

  // Dispose all components
  if (focusController) {
    focusController.dispose();
  }

  if (activityMonitor) {
    activityMonitor.dispose();
  }

  if (browserManager) {
    browserManager.disposePanel();
  }

  console.log('VSFeed extension deactivated');
}

/**
 * Wire all components together
 * Requirements: 16.3
 */
function wireComponents(): void {
  const initialConfig = configManager.getConfig();

  // Connect Focus Controller to Activity Monitor for pause/resume
  focusController.setActivityMonitor(activityMonitor);
  focusController.setActivityPausingEnabled(initialConfig.focusMode.enableActivityPausing);

  // Apply initial configuration to browser/activity state
  browserManager.setPlatformShortcuts(getEffectiveShortcuts());
  activityMonitor.setBreakSuggestionsEnabled(initialConfig.breakSuggestions.enabled);
  activityMonitor.setBreakSuggestionThreshold(initialConfig.breakSuggestions.codingThresholdMinutes);

  // Connect Configuration Manager to all components for settings updates
  extensionContext.subscriptions.push(configManager.onConfigurationChanged(() => {
    const config = configManager.getConfig();

    // Update Focus Controller settings
    focusController.setActivityPausingEnabled(config.focusMode.enableActivityPausing);

    // Update Activity Monitor settings
    activityMonitor.setBreakSuggestionsEnabled(config.breakSuggestions.enabled);
    activityMonitor.setBreakSuggestionThreshold(config.breakSuggestions.codingThresholdMinutes);

    // Update shortcut buttons in the browser panel
    browserManager.setPlatformShortcuts(getEffectiveShortcuts());
  }));

  // Connect Focus Controller to Browser Manager for panel control
  focusController.onTimerTick((remaining) => {
    const total = activeDurationMinutes * 60;

    // Send timer update to WebView
    browserManager.postMessageToWebView({
      type: 'updateTimer',
      remaining: remaining,
      total: total
    });
  });

  focusController.onWarningThreshold(() => {
    // Send warning to WebView
    browserManager.postMessageToWebView({
      type: 'showWarning'
    });
  });

  focusController.onSessionEnd(async () => {
    syncSession();
    if (suppressSessionCompletion) { return; }
    const config = configManager.getConfig();

    // Apply blur effect if enabled
    if (config.focusMode.enableBlurEffect) {
      browserManager.postMessageToWebView({
        type: 'applyBlur'
      });

      // Show overlay message
      browserManager.postMessageToWebView({
        type: 'showOverlay',
        title: 'Resume Coding',
        message: 'Your break time is over. Time to get back to work!',
        action: 'resumeCoding',
        buttonLabel: 'Close'
      });
    }

    // Show completion notification
    vscode.window.showInformationMessage('Focus mode session completed!');

    // Update last break timestamp
    activityMonitor.updateLastBreakTime();

    // Hide panel after 2-second delay
    closeTimer = setTimeout(() => {
      closeTimer = undefined;
      browserManager.hidePanel();
    }, 2000);
  });

  // Connect Activity Monitor to Focus Controller for break suggestions
  activityMonitor.onBreakSuggestionThreshold(async () => {
    const result = await vscode.window.showInformationMessage(
      'You\'ve been coding for a while. Would you like to take a break?',
      'Take a Break',
      'Dismiss'
    );

    if (result === 'Take a Break') {
      // Open Browser Panel with Focus Mode
      if (!browserManager.isVisible()) {
        browserManager.createPanel(PanelPosition.Sidebar);
      }
      browserManager.showPanel();

      // Start focus mode with default duration
      const config = configManager.getConfig();
      startBreak(config.focusMode.defaultDurationMinutes);

      // Update last break time
      activityMonitor.updateLastBreakTime();
    }
  });

  browserManager.onWebViewMessage('ready', () => {
    browserManager.setPlatformShortcuts(getEffectiveShortcuts());
    syncSession();
  });
  browserManager.onWebViewMessage('startBreak', message => {
    if (message.type === 'startBreak') { startBreak(message.minutes); }
  });
  browserManager.onWebViewMessage('stopBreak', () => {
    suppressSessionCompletion = true;
    focusController.endSession();
    suppressSessionCompletion = false;
    browserManager.postMessageToWebView({ type: 'removeBlur' });
    syncSession();
  });
  browserManager.onWebViewMessage('openSettings', message => {
    if (message.type === 'openSettings') {
      void vscode.commands.executeCommand('workbench.action.openSettings', message.section === 'browser' ? 'workbench.browser' : '@ext:PrathameshNikam.vsfeed');
    }
  });

  // Set up message passing between extension and WebView
  browserManager.onWebViewMessage('navigationComplete', (message) => {
    if (message.type === 'navigationComplete') {
      // Save state when navigation completes
      stateManager.saveState({
        currentUrl: message.url,
        panelVisible: browserManager.isVisible(),
        panelPosition: PanelPosition.Sidebar,
        lastBreakTimestamp: activityMonitor.getActivityState().lastBreakTime
      });
    }
  });

  browserManager.onWebViewMessage('userAction', (message) => {
    if (message.type === 'userAction') {
      if (message.action === 'endSession') {
        // User manually ended session
        focusController.endSession();
      } else if (message.action === 'resumeCoding') {
        // User dismissed overlay
        browserManager.postMessageToWebView({
          type: 'removeBlur'
        });
        browserManager.hidePanel();
      } else if (message.action === 'openExternal') {
        const externalUrl = message.url ?? browserManager.getCurrentUrl();
        if (externalUrl) {
          vscode.env.openExternal(vscode.Uri.parse(externalUrl));
        }
      }
    }
  });

  browserManager.onWebViewMessage('navigationFailed', (message) => {
    if (message.type === 'navigationFailed') {
      vscode.window.showErrorMessage(
        `Failed to load page: ${message.error}`,
        'Retry',
        'Report Issue'
      ).then(selection => {
        if (selection === 'Retry') {
          const currentUrl = browserManager.getCurrentUrl();
          if (currentUrl) {
            browserManager.navigateToUrl(currentUrl);
          }
        } else if (selection === 'Report Issue') {
          vscode.env.openExternal(vscode.Uri.parse('https://github.com/Prathmesh333/vsfeed/issues'));
        }
      });
    }
  });

  browserManager.onWebViewMessage('saveShortcut', (message) => {
    if (message.type !== 'saveShortcut') {
      return;
    }

    void saveCustomShortcut(message.shortcut, message.shortcutId).catch(() => {
      browserManager.postMessageToWebView({ type: 'showOverlay', title: 'Save failed', message: 'Could not save this site. Please try again.' });
    });
  });

  browserManager.onWebViewMessage('removeShortcut', (message) => {
    if (message.type !== 'removeShortcut') {
      return;
    }

    void removeCustomShortcut(message.shortcutId).catch(() => {
      browserManager.postMessageToWebView({ type: 'showOverlay', title: 'Remove failed', message: 'Could not remove this site. Please try again.' });
    });
  });
}

function openAddShortcutModal(): void {
  if (!browserManager.isVisible()) {
    browserManager.createPanel(PanelPosition.Sidebar);
  }

  browserManager.showPanel();
  browserManager.openAddShortcutModal(browserManager.getCurrentUrl());
}

function loadCustomShortcuts(): StoredShortcut[] {
  const stored = extensionContext.globalState.get<StoredShortcut[]>(CUSTOM_SHORTCUTS_KEY, []);

  if (!Array.isArray(stored)) {
    return [];
  }

  return stored.filter((shortcut) => Boolean(shortcut && shortcut.id && shortcut.name && shortcut.url));
}

async function persistCustomShortcuts(shortcuts: StoredShortcut[]): Promise<void> {
  await extensionContext.globalState.update(CUSTOM_SHORTCUTS_KEY, shortcuts);
}

function getEffectiveShortcuts(): PlatformShortcut[] {
  const configuredShortcuts = configManager.getConfig().platformShortcuts.map((shortcut) => ({
    ...shortcut,
    isRemovable: false,
  }));
  const customShortcuts = loadCustomShortcuts().map((shortcut) => ({
    ...shortcut,
    isRemovable: true,
  }));

  return [...configuredShortcuts, ...customShortcuts];
}

function createShortcutId(): string {
  return `shortcut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function saveCustomShortcut(shortcut: PlatformShortcut, shortcutId?: string): Promise<void> {
  if (!shortcut || typeof shortcut.name !== 'string' || typeof shortcut.url !== 'string' || typeof shortcut.useMobileUrl !== 'boolean') { return; }
  const normalizedName = shortcut.name.trim();
  const normalizedUrl = shortcut.url.trim();

  if (!normalizedName || !normalizedUrl) {
    browserManager.postMessageToWebView({
      type: 'showOverlay',
      title: 'Save Failed',
      message: 'Both a name and a URL are required to save quick access.',
      buttonLabel: 'Dismiss'
    });
    return;
  }

  try {
    const url = new URL(normalizedUrl);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Invalid protocol');
    }
  } catch {
    browserManager.postMessageToWebView({
      type: 'showOverlay',
      title: 'Save Failed',
      message: 'Enter a valid http or https URL.',
      buttonLabel: 'Dismiss'
    });
    return;
  }

  const customShortcuts = loadCustomShortcuts();
  const entry: StoredShortcut = {
    id: shortcutId ?? createShortcutId(), name: normalizedName, url: normalizedUrl, useMobileUrl: shortcut.useMobileUrl
  };
  if (shortcutId) {
    const index = customShortcuts.findIndex(item => item.id === shortcutId);
    if (index < 0) { return; }
    customShortcuts[index] = entry;
  } else { customShortcuts.push(entry); }

  await persistCustomShortcuts(customShortcuts);
  browserManager.setPlatformShortcuts(getEffectiveShortcuts());
}

async function removeCustomShortcut(shortcutId: string): Promise<void> {
  const customShortcuts = loadCustomShortcuts();
  const filteredShortcuts = customShortcuts.filter((shortcut) => shortcut.id !== shortcutId);

  await persistCustomShortcuts(filteredShortcuts);
  browserManager.setPlatformShortcuts(getEffectiveShortcuts());
}

/**
 * Register all extension commands
 * Requirements: 15.1
 */
function registerCommands(context: vscode.ExtensionContext): void {
  // Command to toggle Browser_Panel visibility
  const togglePanelCommand = vscode.commands.registerCommand(
    'vsfeed.togglePanel',
    () => {
      if (browserManager.isVisible()) {
        browserManager.hidePanel();
      } else {
        if (!browserManager.isVisible()) {
          browserManager.createPanel(PanelPosition.Sidebar);
        }
        browserManager.showPanel();
      }
    }
  );

  // Command to activate Focus_Mode
  const activateFocusModeCommand = vscode.commands.registerCommand(
    'vsfeed.activateFocusMode',
    () => {
      // Ensure panel is visible
      if (!browserManager.isVisible()) {
        browserManager.createPanel(PanelPosition.Sidebar);
      }
      browserManager.showPanel();

      // Start focus mode with default duration
      const config = configManager.getConfig();
      startBreak(config.focusMode.defaultDurationMinutes);

      vscode.window.showInformationMessage(
        `Focus mode started for ${config.focusMode.defaultDurationMinutes} minutes`
      );
    }
  );

  // Command to close Browser_Panel
  const closePanelCommand = vscode.commands.registerCommand(
    'vsfeed.closePanel',
    () => {
      browserManager.hidePanel();
    }
  );

  // Command to navigate back
  const navigateBackCommand = vscode.commands.registerCommand(
    'vsfeed.navigateBack',
    () => {
      if (browserManager.canNavigateBack()) {
        browserManager.navigateBack();
      } else {
        vscode.window.showInformationMessage('No previous page in history');
      }
    }
  );

  // Command to navigate forward
  const navigateForwardCommand = vscode.commands.registerCommand(
    'vsfeed.navigateForward',
    () => {
      if (browserManager.canNavigateForward()) {
        browserManager.navigateForward();
      } else {
        vscode.window.showInformationMessage('No next page in history');
      }
    }
  );

  // Command to add custom shortcut
  const addCustomShortcutCommand = vscode.commands.registerCommand(
    'vsfeed.addCustomShortcut',
    async () => {
      openAddShortcutModal();
    }
  );

  // Command to remove custom shortcut
  const removeCustomShortcutCommand = vscode.commands.registerCommand(
    'vsfeed.removeCustomShortcut',
    async () => {
      const shortcuts = loadCustomShortcuts();

      if (shortcuts.length === 0) {
        vscode.window.showInformationMessage('No custom quick-access items to remove');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        shortcuts.map((shortcut) => ({
          label: shortcut.name,
          description: shortcut.url,
          id: shortcut.id,
        })),
        { placeHolder: 'Select quick access item to remove' }
      );

      if (!selected) {
        return;
      }

      await removeCustomShortcut(selected.id);
      vscode.window.showInformationMessage(`Removed shortcut: ${selected.label}`);
    }
  );

  // Command to reset extension state
  const resetStateCommand = vscode.commands.registerCommand(
    'vsfeed.resetState',
    async () => {
      const result = await vscode.window.showWarningMessage(
        'This will reset all extension state including saved URLs and settings. Continue?',
        'Reset State',
        'Cancel'
      );

      if (result === 'Reset State') {
        await stateManager.clearState();
        browserManager.disposePanel();
        vscode.window.showInformationMessage('Extension state reset successfully');
      }
    }
  );

  // Legacy command for backward compatibility
  const openPanelCommand = vscode.commands.registerCommand(
    'embeddedBrowser.openPanel',
    () => {
      vscode.commands.executeCommand('vsfeed.togglePanel');
    }
  );

  const startFocusModeCommand = vscode.commands.registerCommand(
    'embeddedBrowser.startFocusMode',
    () => {
      vscode.commands.executeCommand('vsfeed.activateFocusMode');
    }
  );

  // Register all commands
  context.subscriptions.push(
    togglePanelCommand,
    activateFocusModeCommand,
    closePanelCommand,
    navigateBackCommand,
    navigateForwardCommand,
    addCustomShortcutCommand,
    removeCustomShortcutCommand,
    resetStateCommand,
    openPanelCommand,
    startFocusModeCommand
  );
}

/**
 * Restore workspace state on activation
 * Requirements: 8.4
 */
async function restoreWorkspaceState(): Promise<void> {
  const state = await stateManager.loadState();

  // Restore panel if it was visible
  if (state.panelVisible && state.currentUrl) {
    browserManager.createPanel(state.panelPosition);
    browserManager.navigateToUrl(state.currentUrl);
    browserManager.showPanel();
  }

  // Restore last break timestamp
  if (state.lastBreakTimestamp) {
    const activityState = activityMonitor.getActivityState();
    activityState.lastBreakTime = state.lastBreakTimestamp;
  }
}

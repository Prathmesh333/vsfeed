
export interface WebviewShortcut {
  id?: string;
  name: string;
  url: string;
  isRemovable?: boolean;
  savedUrl?: string;
  useMobileUrl?: boolean;
}

export interface LaunchEntry { url: string; timestamp: number; }
export interface DashboardPreferences { groups: Record<string, string>; pinned: string[]; }

// Extension -> WebView messages
export type ExtensionMessage =
  | { type: 'dashboardState'; history: LaunchEntry[]; preferences: DashboardPreferences }
  | { type: 'sessionState'; active: boolean; remaining: number; duration: number }
  | { type: 'updateTimer'; remaining: number; total: number }
  | { type: 'showWarning' }
  | { type: 'applyBlur' }
  | { type: 'removeBlur' }
  | {
      type: 'showOverlay';
      message: string;
      title?: string;
      action?: 'dismissOverlay' | 'resumeCoding' | 'openExternal';
      buttonLabel?: string;
    }
  | { type: 'showAddShortcutModal'; initialUrl?: string }
  | { type: 'updateShortcuts'; shortcuts: WebviewShortcut[] }
  | { type: 'navigate'; url: string }
  | {
      type: 'updateNavigationState';
      currentUrl: string;
      canNavigateBack: boolean;
      canNavigateForward: boolean;
      isLaunching: boolean;
    };

// WebView -> Extension messages
export type WebViewMessage =
  | { type: 'ready' }
  | { type: 'clearHistory' }
  | { type: 'deleteHistory'; timestamp: number }
  | { type: 'savePreferences'; preferences: DashboardPreferences }
  | { type: 'startBreak'; minutes: number }
  | { type: 'stopBreak' }
  | { type: 'openSettings'; section: 'vsfeed' | 'browser' }
  | { type: 'openUrl'; url: string }
  | { type: 'navigateBack' }
  | { type: 'navigateForward' }
  | {
      type: 'saveShortcut';
      shortcutId?: string;
      shortcut: {
        name: string;
        url: string;
        useMobileUrl: boolean;
      };
    }
  | { type: 'removeShortcut'; shortcutId: string }
  | { type: 'navigationComplete'; url: string }
  | { type: 'navigationFailed'; error: string }
  | {
      type: 'userAction';
      action: 'endSession' | 'resumeCoding' | 'openExternal';
      url?: string;
    };

import { FilterRule } from '../components/ConfigurationManager';

export interface WebviewShortcut {
  id?: string;
  name: string;
  url: string;
  isRemovable?: boolean;
}

// Extension -> WebView messages
export type ExtensionMessage =
  | { type: 'applyContentFilter'; rules: FilterRule[] }
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
  | { type: 'openUrl'; url: string }
  | { type: 'navigateBack' }
  | { type: 'navigateForward' }
  | {
      type: 'saveShortcut';
      shortcut: {
        name: string;
        url: string;
        useMobileUrl: boolean;
      };
    }
  | { type: 'removeShortcut'; shortcutId: string }
  | { type: 'navigationComplete'; url: string }
  | { type: 'navigationFailed'; error: string }
  | { type: 'filterApplied'; elementCount: number }
  | {
      type: 'userAction';
      action: 'endSession' | 'resumeCoding' | 'openExternal';
      url?: string;
    };

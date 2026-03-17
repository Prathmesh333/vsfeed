import * as vscode from 'vscode';
import { ExtensionMessage, WebViewMessage, WebviewShortcut } from '../utils/messageProtocol';

export enum PanelPosition {
  Sidebar,
  EditorColumn
}

export interface PlatformShortcut {
  id?: string;
  name: string;
  url: string;
  useMobileUrl: boolean;
  isRemovable?: boolean;
}

const DEFAULT_PLATFORM_SHORTCUTS: PlatformShortcut[] = [
  {
    name: 'Instagram',
    url: 'https://www.instagram.com',
    useMobileUrl: true,
  },
  {
    name: 'Twitter/X',
    url: 'https://twitter.com',
    useMobileUrl: true,
  },
  {
    name: 'Reddit',
    url: 'https://www.reddit.com',
    useMobileUrl: true,
  },
  {
    name: 'YouTube Shorts',
    url: 'https://www.youtube.com/shorts',
    useMobileUrl: true,
  },
  {
    name: 'Hacker News',
    url: 'https://news.ycombinator.com',
    useMobileUrl: false,
  },
];

export class BrowserManager {
  private panel?: vscode.WebviewPanel;
  private currentUrl?: string;
  private currentPosition: PanelPosition = PanelPosition.Sidebar;
  private messageHandlers: Map<string, (message: WebViewMessage) => void> = new Map();
  private navigationHistory: string[] = [];
  private historyIndex: number = -1;
  private isLaunching: boolean = false;
  private platformShortcuts: PlatformShortcut[] = this.cloneShortcuts(DEFAULT_PLATFORM_SHORTCUTS);

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Create a new WebView panel with specified position
   * Requirements: 1.1, 1.2, 1.3
   */
  createPanel(position: PanelPosition): vscode.WebviewPanel {
    if (this.panel) {
      this.panel.dispose();
    }

    this.currentPosition = position;

    const viewColumn =
      position === PanelPosition.Sidebar ? vscode.ViewColumn.One : vscode.ViewColumn.Two;

    this.panel = vscode.window.createWebviewPanel(
      'vsfeedBrowser',
      'VSFeed Launcher',
      viewColumn,
      {
        enableScripts: true,
        retainContextWhenHidden: false,
        localResourceRoots: [
          this.context.extensionUri,
          vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        ]
      }
    );

    this.panel.onDidDispose(() => {
      this.isLaunching = false;
      this.panel = undefined;
    });

    this.panel.webview.onDidReceiveMessage(
      (message: WebViewMessage) => {
        this.handleWebViewMessage(message);
      },
      undefined,
      this.context.subscriptions
    );

    this.panel.webview.html = this.getWebviewContent(this.panel.webview);
    this.syncNavigationState();

    return this.panel;
  }

  /**
   * Show the panel if it exists
   * Requirements: 1.2
   */
  showPanel(): void {
    if (this.panel) {
      this.panel.reveal();
    }
  }

  /**
   * Hide the panel if it exists
   * Requirements: 1.2
   */
  hidePanel(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }
  }

  /**
   * Dispose the panel and clean up resources
   * Requirements: 1.3
   */
  disposePanel(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }

    this.currentUrl = undefined;
    this.navigationHistory = [];
    this.historyIndex = -1;
    this.isLaunching = false;
  }

  /**
   * Navigate to a URL with validation
   * Requirements: 1.4, 9.5, 9.6
   */
  navigateToUrl(url: string): void {
    if (!this.panel) {
      throw new Error('Panel not created. Call createPanel() first.');
    }

    if (!this.isValidUrl(url)) {
      this.currentUrl = url;
      this.isLaunching = false;
      this.syncNavigationState();
      const errorMessage = `Invalid URL: ${url}`;

      this.postMessageToWebView({
        type: 'showOverlay',
        title: 'Invalid URL',
        message: errorMessage,
        action: 'dismissOverlay',
        buttonLabel: 'Dismiss'
      });

      this.handleWebViewMessage({
        type: 'navigationFailed',
        error: errorMessage
      });
      return;
    }

    this.currentUrl = url;

    if (this.historyIndex < this.navigationHistory.length - 1) {
      this.navigationHistory = this.navigationHistory.slice(0, this.historyIndex + 1);
    }

    this.navigationHistory.push(url);
    this.historyIndex = this.navigationHistory.length - 1;

    this.launchUrl(url);
  }

  /**
   * Navigate back in browser history
   * Requirements: 9.5
   */
  navigateBack(): void {
    if (!this.panel) {
      throw new Error('Panel not created. Call createPanel() first.');
    }

    if (this.historyIndex > 0) {
      this.historyIndex--;
      const url = this.navigationHistory[this.historyIndex];
      this.currentUrl = url;
      this.launchUrl(url);
    }
  }

  /**
   * Navigate forward in browser history
   * Requirements: 9.6
   */
  navigateForward(): void {
    if (!this.panel) {
      throw new Error('Panel not created. Call createPanel() first.');
    }

    if (this.historyIndex < this.navigationHistory.length - 1) {
      this.historyIndex++;
      const url = this.navigationHistory[this.historyIndex];
      this.currentUrl = url;
      this.launchUrl(url);
    }
  }

  /**
   * Validate URL format
   * Requirements: 1.4
   */
  private isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Update iframe src in WebView
   * Requirements: 1.4
   */
  private launchUrl(url: string): void {
    this.isLaunching = true;
    this.postMessageToWebView({
      type: 'navigate',
      url
    });
    this.syncNavigationState();
    this.openInBuiltInBrowser(url);
  }

  private openInBuiltInBrowser(url: string): void {
    const integratedBrowserCommand = 'workbench.action.browser.open';
    const fallbackBrowserCommand = 'simpleBrowser.show';

    void (async () => {
      try {
        try {
          await vscode.commands.executeCommand(integratedBrowserCommand, url);
        } catch {
          await vscode.commands.executeCommand(fallbackBrowserCommand, url);
        }

        await this.keepOpenedBrowserTab();
        this.isLaunching = false;
        this.syncNavigationState();

        this.handleWebViewMessage({
          type: 'navigationComplete',
          url
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error
          ? error.message
          : `Unable to open built-in browser for ${url}`;

        this.isLaunching = false;
        this.syncNavigationState();

        this.postMessageToWebView({
          type: 'showOverlay',
          title: 'Open Failed',
          message: errorMessage,
          action: 'dismissOverlay',
          buttonLabel: 'Dismiss'
        });

        this.handleWebViewMessage({
          type: 'navigationFailed',
          error: errorMessage
        });
      }
    })();
  }

  private async keepOpenedBrowserTab(): Promise<void> {
    try {
      await vscode.commands.executeCommand('workbench.action.keepEditor');
    } catch {
      try {
        await vscode.commands.executeCommand('workbench.action.pinEditor');
      } catch {
        // Best effort only. Older VS Code builds may not expose these commands.
      }
    }
  }

  /**
   * Check if panel is visible
   * Requirements: 1.5
   */
  isVisible(): boolean {
    return this.panel !== undefined && this.panel.visible;
  }

  /**
   * Get current URL
   * Requirements: 1.5
   */
  getCurrentUrl(): string | undefined {
    return this.currentUrl;
  }

  /**
   * Check if can navigate back
   * Requirements: 9.5
   */
  canNavigateBack(): boolean {
    return this.historyIndex > 0;
  }

  /**
   * Check if can navigate forward
   * Requirements: 9.6
   */
  canNavigateForward(): boolean {
    return this.historyIndex < this.navigationHistory.length - 1;
  }

  /**
   * Update the shortcuts shown on the welcome screen
   */
  setPlatformShortcuts(shortcuts: PlatformShortcut[]): void {
    this.platformShortcuts =
      shortcuts.length > 0
        ? this.cloneShortcuts(shortcuts)
        : this.cloneShortcuts(DEFAULT_PLATFORM_SHORTCUTS);

    if (this.panel) {
      this.postMessageToWebView({
        type: 'updateShortcuts',
        shortcuts: this.getWebviewShortcuts()
      });
    }
  }

  /**
   * Launch a platform shortcut
   * Requirements: 6.1, 6.2
   */
  launchPlatform(platform: PlatformShortcut): void {
    const url = platform.useMobileUrl ? this.getMobileUrl(platform.url) : platform.url;
    this.navigateToUrl(url);
  }

  /**
   * Get mobile-optimized URL
   */
  private getMobileUrl(url: string): string {
    try {
      const urlObj = new URL(url);

      if (urlObj.hostname.includes('instagram.com')) {
        return url;
      }

      if (urlObj.hostname.includes('twitter.com') || urlObj.hostname.includes('x.com')) {
        return url.replace('twitter.com', 'mobile.twitter.com').replace('x.com', 'mobile.x.com');
      }

      if (urlObj.hostname.includes('reddit.com')) {
        return url
          .replace('://www.reddit.com', '://m.reddit.com')
          .replace('://reddit.com', '://m.reddit.com');
      }

      if (urlObj.hostname.includes('youtube.com')) {
        return url
          .replace('://www.youtube.com', '://m.youtube.com')
          .replace('://youtube.com', '://m.youtube.com');
      }

      return url;
    } catch {
      return url;
    }
  }

  private getWebviewShortcuts(): WebviewShortcut[] {
    return this.platformShortcuts.map((shortcut) => {
      const webviewShortcut: WebviewShortcut = {
        name: shortcut.name,
        url: shortcut.useMobileUrl ? this.getMobileUrl(shortcut.url) : shortcut.url,
      };

      if (shortcut.id) {
        webviewShortcut.id = shortcut.id;
      }

      if (shortcut.isRemovable) {
        webviewShortcut.isRemovable = true;
      }

      return webviewShortcut;
    });
  }

  /**
   * Get WebView HTML content
   */
  private getWebviewContent(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, 'media', 'browserWebview.js')
    );
    const shortcutsJson = this.escapeForInlineJson(JSON.stringify(this.getWebviewShortcuts()));

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; frame-src https: http:; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource};">
      <title>VSFeed Launcher</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          width: 100%;
          height: 100vh;
          overflow: hidden;
          background-color: #1e1e1e;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        #browser-iframe {
          width: 100%;
          height: 100%;
          border: none;
          display: block;
        }

        #welcome-screen {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background-color: #1e1e1e;
          color: #cccccc;
          padding: 24px;
        }

        #welcome-screen.hidden {
          display: none;
        }

        .welcome-title {
          font-size: 32px;
          font-weight: 600;
          margin-bottom: 16px;
          color: #ffffff;
          text-align: center;
        }

        .welcome-subtitle {
          font-size: 16px;
          margin-bottom: 16px;
          color: #888888;
          text-align: center;
        }

        .browser-note {
          font-size: 14px;
          color: #9da3ad;
          text-align: center;
          max-width: 580px;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .launcher-toolbar {
          width: 100%;
          max-width: 760px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
        }

        .navigation-buttons {
          display: flex;
          gap: 8px;
        }

        .nav-button,
        .shortcut-button,
        .add-shortcut-button,
        .go-button,
        .overlay-button {
          transition: all 0.2s;
        }

        .nav-button,
        .add-shortcut-button {
          background-color: #252526;
          color: #cccccc;
          border: 1px solid #3e3e42;
          padding: 10px 16px;
          font-size: 13px;
          border-radius: 4px;
          cursor: pointer;
        }

        .nav-button:hover:not(:disabled),
        .add-shortcut-button:hover:not(:disabled) {
          border-color: #007acc;
          color: #ffffff;
        }

        .shortcuts-header {
          width: 100%;
          max-width: 760px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .shortcuts-heading {
          font-size: 14px;
          font-weight: 600;
          color: #f3f4f6;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }

        .shortcuts-container {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          justify-content: center;
          max-width: 760px;
        }

        .shortcut-card {
          position: relative;
          display: flex;
        }

        .shortcut-button {
          background-color: #2d2d30;
          color: #cccccc;
          border: 1px solid #3e3e42;
          padding: 16px 24px;
          font-size: 14px;
          border-radius: 6px;
          cursor: pointer;
          min-width: 140px;
        }

        .shortcut-button:hover:not(:disabled) {
          background-color: #3e3e42;
          border-color: #007acc;
          color: #ffffff;
        }

        .shortcut-remove-button {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          border: 1px solid #5a2020;
          background-color: #2f1616;
          color: #f8b4b4;
          font-size: 14px;
          line-height: 1;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .shortcut-remove-button:hover {
          background-color: #4a1f1f;
          border-color: #d14343;
          color: #ffffff;
        }

        .url-input-container {
          display: flex;
          gap: 8px;
          width: 100%;
          flex: 1;
        }

        .url-input {
          flex: 1;
          background-color: #2d2d30;
          color: #cccccc;
          border: 1px solid #3e3e42;
          padding: 10px 16px;
          font-size: 14px;
          border-radius: 4px;
          outline: none;
        }

        .url-input:focus {
          border-color: #007acc;
        }

        .go-button {
          background-color: #007acc;
          color: #ffffff;
          border: none;
          padding: 10px 24px;
          font-size: 14px;
          border-radius: 4px;
          cursor: pointer;
        }

        .go-button:hover:not(:disabled) {
          background-color: #005a9e;
        }

        .nav-button:disabled,
        .shortcut-button:disabled,
        .add-shortcut-button:disabled,
        .go-button:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .launcher-status {
          margin-top: 16px;
          min-height: 20px;
          font-size: 13px;
          color: #7f8793;
          text-align: center;
          max-width: 720px;
        }

        .shortcut-modal-backdrop {
          position: fixed;
          inset: 0;
          display: none;
          align-items: center;
          justify-content: center;
          background-color: rgba(0, 0, 0, 0.74);
          z-index: 1001;
          padding: 24px;
        }

        .shortcut-modal-backdrop.visible {
          display: flex;
        }

        .shortcut-modal {
          width: 100%;
          max-width: 460px;
          background-color: #1f1f21;
          border: 1px solid #3e3e42;
          border-radius: 10px;
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
          padding: 20px;
        }

        .shortcut-modal-title {
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 8px;
        }

        .shortcut-modal-text {
          font-size: 13px;
          color: #9da3ad;
          line-height: 1.5;
          margin-bottom: 16px;
        }

        .shortcut-modal-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-bottom: 14px;
        }

        .shortcut-modal-label {
          font-size: 12px;
          font-weight: 600;
          color: #d1d5db;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .shortcut-modal-input {
          width: 100%;
          background-color: #2d2d30;
          color: #f3f4f6;
          border: 1px solid #3e3e42;
          border-radius: 6px;
          padding: 10px 12px;
          font-size: 14px;
          outline: none;
        }

        .shortcut-modal-input:focus {
          border-color: #007acc;
        }

        .shortcut-modal-checkbox {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 16px;
          color: #d1d5db;
          font-size: 13px;
        }

        .shortcut-modal-checkbox input {
          accent-color: #007acc;
        }

        .shortcut-modal-error {
          min-height: 18px;
          font-size: 12px;
          color: #fca5a5;
          margin-bottom: 12px;
        }

        .shortcut-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .shortcut-modal-cancel,
        .shortcut-modal-save {
          border-radius: 6px;
          padding: 10px 16px;
          font-size: 13px;
          cursor: pointer;
          border: 1px solid #3e3e42;
        }

        .shortcut-modal-cancel {
          background-color: #252526;
          color: #d1d5db;
        }

        .shortcut-modal-save {
          background-color: #007acc;
          border-color: #007acc;
          color: #ffffff;
        }

        .shortcut-modal-cancel:hover,
        .shortcut-modal-save:hover {
          filter: brightness(1.05);
        }

        #overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0.82);
          display: none;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 24px;
        }

        #overlay.visible {
          display: flex;
        }

        #timer-display {
          position: fixed;
          top: 10px;
          right: 10px;
          background-color: rgba(30, 30, 30, 0.9);
          color: #cccccc;
          padding: 8px 16px;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          z-index: 999;
          display: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        #timer-display.visible {
          display: block;
        }

        #timer-display.warning {
          background-color: rgba(255, 165, 0, 0.9);
          color: #000000;
        }

        .overlay-content {
          text-align: center;
          color: #ffffff;
          max-width: 420px;
        }

        .overlay-content h2 {
          font-size: 24px;
          margin-bottom: 16px;
        }

        .overlay-content p {
          font-size: 16px;
          margin-bottom: 24px;
          line-height: 1.5;
        }

        .overlay-button {
          background-color: #007acc;
          color: #ffffff;
          border: none;
          padding: 10px 20px;
          font-size: 14px;
          border-radius: 4px;
          cursor: pointer;
        }

        .overlay-button:hover {
          background-color: #005a9e;
        }

        .blur-effect {
          filter: blur(8px);
          pointer-events: none;
        }

        @media (max-width: 720px) {
          #welcome-screen {
            justify-content: flex-start;
            padding-top: 48px;
          }

          .launcher-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .navigation-buttons {
            width: 100%;
          }

          .nav-button,
          .add-shortcut-button {
            flex: 1;
          }

          .shortcuts-header {
            flex-direction: column;
            gap: 12px;
            align-items: stretch;
          }
        }
      </style>
    </head>
    <body>
      <div id="welcome-screen">
        <h1 class="welcome-title">VSFeed Launcher</h1>
        <p class="welcome-subtitle">A controlled social feed for waiting moments in development</p>
        <p class="browser-note">Stay inside VS Code, open sites in integrated-browser tabs, save your own shortcuts, and keep scrolling bounded with focus-mode controls.</p>

        <div class="launcher-toolbar">
          <div class="navigation-buttons">
            <button type="button" class="nav-button" id="back-button" title="Open the previous URL from VSFeed history">Back</button>
            <button type="button" class="nav-button" id="forward-button" title="Open the next URL from VSFeed history">Forward</button>
          </div>

          <div class="url-input-container">
            <input type="text" class="url-input" id="url-input" placeholder="Enter a URL (e.g., https://example.com)" />
            <button class="go-button" id="go-button">Go</button>
          </div>
        </div>

        <div class="shortcuts-header">
          <div class="shortcuts-heading">Quick Sites</div>
          <button type="button" class="add-shortcut-button" id="add-shortcut-button" title="Add a new website shortcut">+</button>
        </div>

        <div class="shortcuts-container" id="shortcuts-container"></div>
        <div class="launcher-status" id="launcher-status">Each launch opens a new integrated-browser tab.</div>
      </div>

      <div class="shortcut-modal-backdrop" id="shortcut-modal-backdrop">
        <div class="shortcut-modal" role="dialog" aria-modal="true" aria-labelledby="shortcut-modal-title">
          <h2 class="shortcut-modal-title" id="shortcut-modal-title">Save Quick Access</h2>
          <p class="shortcut-modal-text">Create a bookmark-like shortcut that stays inside VSFeed for quick access later.</p>

          <div class="shortcut-modal-field">
            <label class="shortcut-modal-label" for="shortcut-name-input">Name</label>
            <input class="shortcut-modal-input" id="shortcut-name-input" type="text" placeholder="e.g., GitHub" />
          </div>

          <div class="shortcut-modal-field">
            <label class="shortcut-modal-label" for="shortcut-url-input">URL</label>
            <input class="shortcut-modal-input" id="shortcut-url-input" type="text" placeholder="https://example.com" />
          </div>

          <label class="shortcut-modal-checkbox">
            <input id="shortcut-mobile-toggle" type="checkbox" />
            <span>Prefer mobile URL when VSFeed supports a mobile version</span>
          </label>

          <div class="shortcut-modal-error" id="shortcut-modal-error"></div>

          <div class="shortcut-modal-actions">
            <button type="button" class="shortcut-modal-cancel" id="shortcut-cancel-button">Cancel</button>
            <button type="button" class="shortcut-modal-save" id="shortcut-save-button">Save</button>
          </div>
        </div>
      </div>

      <iframe id="browser-iframe" sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" style="display: none;"></iframe>

      <div id="timer-display"></div>

      <div id="overlay">
        <div class="overlay-content">
          <h2 id="overlay-title">Resume Coding</h2>
          <p id="overlay-message">Your break time is over. Time to get back to work!</p>
          <button class="overlay-button" id="overlay-button">Close</button>
        </div>
      </div>

      <script id="vsfeed-shortcuts-data" type="application/json">${shortcutsJson}</script>
      <script src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  private escapeForInlineJson(value: string): string {
    return value
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
  }

  private cloneShortcuts(shortcuts: PlatformShortcut[]): PlatformShortcut[] {
    return shortcuts.map((shortcut) => ({ ...shortcut }));
  }

  /**
   * Send message to WebView
   * Requirements: 1.4
   */
  postMessageToWebView(message: ExtensionMessage): void {
    if (this.panel) {
      this.panel.webview.postMessage(message);
    }
  }

  openAddShortcutModal(initialUrl?: string): void {
    if (!this.panel) {
      return;
    }

    setTimeout(() => {
      this.postMessageToWebView({
        type: 'showAddShortcutModal',
        initialUrl,
      });
    }, 50);
  }

  private syncNavigationState(): void {
    this.postMessageToWebView({
      type: 'updateNavigationState',
      currentUrl: this.currentUrl ?? '',
      canNavigateBack: this.canNavigateBack(),
      canNavigateForward: this.canNavigateForward(),
      isLaunching: this.isLaunching,
    });
  }

  /**
   * Handle messages from WebView
   * Requirements: 1.4
   */
  private handleWebViewMessage(message: WebViewMessage): void {
    if (message.type === 'openUrl') {
      this.navigateToUrl(message.url);
      return;
    }

    if (message.type === 'navigateBack') {
      this.navigateBack();
      return;
    }

    if (message.type === 'navigateForward') {
      this.navigateForward();
      return;
    }

    if (message.type === 'saveShortcut' || message.type === 'removeShortcut') {
      const handler = this.messageHandlers.get(message.type);
      if (handler) {
        handler(message);
      }
      return;
    }

    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      handler(message);
    }
  }

  /**
   * Register a message handler
   * Requirements: 1.4
   */
  onWebViewMessage(type: string, handler: (message: WebViewMessage) => void): void {
    this.messageHandlers.set(type, handler);
  }
}

import * as vscode from 'vscode';
import { dashboardHtml } from '../views/dashboard';
import { ExtensionMessage, WebViewMessage, WebviewShortcut, LaunchEntry, DashboardPreferences } from '../utils/messageProtocol';

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

    this.panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, 'media', 'vsfeed-icon.png');

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
   * Launch a URL in the host integrated browser
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
        await this.recordLaunch(url);
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
        savedUrl: shortcut.url,
        useMobileUrl: shortcut.useMobileUrl,
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

    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, 'media', 'dashboard.css'));
    return dashboardHtml(webview.cspSource, String(scriptUri), String(styleUri), shortcutsJson);
  }

  private dashboardWrite: Promise<void> = Promise.resolve();

  private readHistory(): LaunchEntry[] {
    const entries = this.context.globalState.get<LaunchEntry[]>('vsfeed.launchHistory', []);
    return Array.isArray(entries) ? entries.filter(entry => entry && this.isValidUrl(entry.url) && Number.isFinite(entry.timestamp)).slice(0, 200) : [];
  }

  private readPreferences(): DashboardPreferences {
    const value = this.context.globalState.get<DashboardPreferences>('vsfeed.dashboardPreferences');
    return { groups: value?.groups ?? {}, pinned: Array.isArray(value?.pinned) ? value.pinned : [] };
  }

  private sendDashboardState(): void {
    this.postMessageToWebView({ type: 'dashboardState', history: this.readHistory(), preferences: this.readPreferences() });
  }

  private enqueueDashboardWrite(write: () => Promise<void>): Promise<void> {
    const next = this.dashboardWrite.then(write);
    this.dashboardWrite = next.catch(() => undefined);
    return next;
  }

  private recordLaunch(url: string): Promise<void> {
    return this.enqueueDashboardWrite(async () => {
      const history = this.readHistory();
      const timestamp = Math.max(Date.now(), (history[0]?.timestamp ?? 0) + 1);
      await this.context.globalState.update('vsfeed.launchHistory', [{ url, timestamp }, ...history].slice(0, 200));
      this.sendDashboardState();
    }).catch(() => { /* A storage failure must not report a successful browser launch as failed. */ });
  }

  private updateDashboard(message: WebViewMessage): Promise<void> {
    return this.enqueueDashboardWrite(async () => {
      if (message.type === 'clearHistory' || message.type === 'deleteHistory') {
        await this.context.globalState.update('vsfeed.launchHistory', message.type === 'clearHistory' ? [] : this.readHistory().filter(entry => entry.timestamp !== message.timestamp));
      } else if (message.type === 'savePreferences') {
        const input = message.preferences;
        if (!input || !Array.isArray(input.pinned) || !input.groups || typeof input.groups !== 'object') { return; }
        const groups: Record<string, string> = Object.create(null);
        Object.entries(input.groups).slice(0, 500).forEach(([key, value]) => {
          if (this.isValidUrl(key) && ['Social', 'Dev', 'Reading'].includes(value)) { groups[key] = value; }
        });
        await this.context.globalState.update('vsfeed.dashboardPreferences', {
          groups, pinned: input.pinned.filter(url => typeof url === 'string' && this.isValidUrl(url)).slice(0, 500)
        });
      }
      this.sendDashboardState();
    });
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
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') { return; }
    if (message.type === 'ready') { this.syncNavigationState(); this.sendDashboardState(); }
    if (message.type === 'clearHistory' || message.type === 'deleteHistory' || message.type === 'savePreferences') {
      void this.updateDashboard(message).catch(() => this.postMessageToWebView({
        type: 'showOverlay', title: 'Unable to save', message: 'Your changes could not be saved. Please try again.'
      }));
      return;
    }

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

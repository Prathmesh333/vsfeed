import { BrowserManager, PanelPosition, PlatformShortcut } from './BrowserManager';
import { MockExtensionContext, ViewColumn } from '../__mocks__/vscode';
import { ExtensionMessage, WebViewMessage } from '../utils/messageProtocol';
import * as vscode from 'vscode';

describe('BrowserManager', () => {
  let browserManager: BrowserManager;
  let mockContext: MockExtensionContext;

  beforeEach(() => {
    mockContext = new MockExtensionContext();
    browserManager = new BrowserManager(mockContext as any);
    jest.clearAllMocks();
  });

  describe('createPanel', () => {
    test('creates panel with sidebar position', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'vsfeedBrowser',
        'VSFeed Launcher',
        ViewColumn.One,
        expect.objectContaining({
          enableScripts: true,
          retainContextWhenHidden: false,
        })
      );
      expect(panel).toBeDefined();
    });

    test('creates panel with editor column position', () => {
      const panel = browserManager.createPanel(PanelPosition.EditorColumn);

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        'vsfeedBrowser',
        'VSFeed Launcher',
        ViewColumn.Two,
        expect.objectContaining({
          enableScripts: true,
          retainContextWhenHidden: false,
        })
      );
      expect(panel).toBeDefined();
    });

    test('disposes existing panel before creating new one', () => {
      const panel1 = browserManager.createPanel(PanelPosition.Sidebar);
      const disposeSpy = jest.spyOn(panel1, 'dispose');

      const panel2 = browserManager.createPanel(PanelPosition.EditorColumn);

      expect(disposeSpy).toHaveBeenCalled();
      expect(panel2).toBeDefined();
    });

    test('sets up disposal handler', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      
      expect(panel.onDidDispose).toBeDefined();
      
      // Trigger disposal
      panel.dispose();
      
      // Panel should be cleared internally
      expect(browserManager.isVisible()).toBe(false);
    });

    test('sets initial HTML content', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      
      expect(panel.webview.html).toContain('VSFeed Launcher');
      expect(panel.webview.html).toContain('<!DOCTYPE html>');
    });

    test('includes extension URI in localResourceRoots', () => {
      browserManager.createPanel(PanelPosition.Sidebar);

      expect(vscode.window.createWebviewPanel).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.any(Number),
        expect.objectContaining({
          localResourceRoots: expect.arrayContaining([mockContext.extensionUri]),
        })
      );
    });
  });

  describe('showPanel', () => {
    test('reveals panel if it exists', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const revealSpy = jest.spyOn(panel, 'reveal');

      browserManager.showPanel();

      expect(revealSpy).toHaveBeenCalled();
    });

    test('does nothing if panel does not exist', () => {
      // Should not throw
      expect(() => browserManager.showPanel()).not.toThrow();
    });
  });

  describe('hidePanel', () => {
    test('disposes panel if it exists', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const disposeSpy = jest.spyOn(panel, 'dispose');

      browserManager.hidePanel();

      expect(disposeSpy).toHaveBeenCalled();
      expect(browserManager.isVisible()).toBe(false);
    });

    test('does nothing if panel does not exist', () => {
      // Should not throw
      expect(() => browserManager.hidePanel()).not.toThrow();
    });
  });

  describe('disposePanel', () => {
    test('disposes panel and clears URL', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      browserManager.navigateToUrl('https://example.com');
      const disposeSpy = jest.spyOn(panel, 'dispose');

      browserManager.disposePanel();

      expect(disposeSpy).toHaveBeenCalled();
      expect(browserManager.isVisible()).toBe(false);
      expect(browserManager.getCurrentUrl()).toBeUndefined();
    });

    test('does nothing if panel does not exist', () => {
      // Should not throw
      expect(() => browserManager.disposePanel()).not.toThrow();
    });

    test('clears current URL even if panel does not exist', () => {
      browserManager.disposePanel();
      
      expect(browserManager.getCurrentUrl()).toBeUndefined();
    });
  });

  describe('navigateToUrl', () => {
    test('sets current URL when panel exists', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      
      expect(browserManager.getCurrentUrl()).toBe('https://example.com');
    });

    test('throws error if panel does not exist', () => {
      expect(() => browserManager.navigateToUrl('https://example.com')).toThrow(
        'Panel not created. Call createPanel() first.'
      );
    });
  });

  describe('navigateBack', () => {
    test('does not throw when panel exists', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      // Should not throw (implementation is placeholder)
      expect(() => browserManager.navigateBack()).not.toThrow();
    });

    test('throws error if panel does not exist', () => {
      expect(() => browserManager.navigateBack()).toThrow(
        'Panel not created. Call createPanel() first.'
      );
    });
  });

  describe('navigateForward', () => {
    test('does not throw when panel exists', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      // Should not throw (implementation is placeholder)
      expect(() => browserManager.navigateForward()).not.toThrow();
    });

    test('throws error if panel does not exist', () => {
      expect(() => browserManager.navigateForward()).toThrow(
        'Panel not created. Call createPanel() first.'
      );
    });
  });

  describe('isVisible', () => {
    test('returns true when panel exists and is visible', () => {
      browserManager.createPanel(PanelPosition.Sidebar);

      expect(browserManager.isVisible()).toBe(true);
    });

    test('returns false when panel exists but is not visible', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      // Simulate panel being hidden by disposing it
      panel.dispose();

      expect(browserManager.isVisible()).toBe(false);
    });

    test('returns false when panel does not exist', () => {
      expect(browserManager.isVisible()).toBe(false);
    });
  });

  describe('getCurrentUrl', () => {
    test('returns current URL when set', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      browserManager.navigateToUrl('https://example.com');

      expect(browserManager.getCurrentUrl()).toBe('https://example.com');
    });

    test('returns undefined when no URL is set', () => {
      expect(browserManager.getCurrentUrl()).toBeUndefined();
    });

    test('returns undefined after disposal', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      browserManager.navigateToUrl('https://example.com');
      browserManager.disposePanel();

      expect(browserManager.getCurrentUrl()).toBeUndefined();
    });
  });

  describe('launchPlatform', () => {
    test('navigates to platform URL without mobile optimization', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      const platform: PlatformShortcut = {
        name: 'Example',
        url: 'https://example.com',
        useMobileUrl: false,
      };

      browserManager.launchPlatform(platform);

      expect(browserManager.getCurrentUrl()).toBe('https://example.com');
    });

    test('navigates to mobile-optimized URL for Twitter', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      const platform: PlatformShortcut = {
        name: 'Twitter',
        url: 'https://twitter.com',
        useMobileUrl: true,
      };

      browserManager.launchPlatform(platform);

      expect(browserManager.getCurrentUrl()).toBe('https://mobile.twitter.com');
    });

    test('navigates to mobile-optimized URL for Reddit', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      const platform: PlatformShortcut = {
        name: 'Reddit',
        url: 'https://www.reddit.com',
        useMobileUrl: true,
      };

      browserManager.launchPlatform(platform);

      expect(browserManager.getCurrentUrl()).toBe('https://m.reddit.com');
    });

    test('keeps Instagram URL unchanged for mobile', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      const platform: PlatformShortcut = {
        name: 'Instagram',
        url: 'https://instagram.com',
        useMobileUrl: true,
      };

      browserManager.launchPlatform(platform);

      expect(browserManager.getCurrentUrl()).toBe('https://instagram.com');
    });

    test('navigates to mobile-optimized URL for YouTube Shorts', () => {
      browserManager.createPanel(PanelPosition.Sidebar);

      const platform: PlatformShortcut = {
        name: 'YouTube Shorts',
        url: 'https://www.youtube.com/shorts',
        useMobileUrl: true,
      };

      browserManager.launchPlatform(platform);

      expect(browserManager.getCurrentUrl()).toBe('https://m.youtube.com/shorts');
    });

    test('handles invalid URLs gracefully', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      const platform: PlatformShortcut = {
        name: 'Invalid',
        url: 'not-a-valid-url',
        useMobileUrl: true,
      };

      // Should not throw
      expect(() => browserManager.launchPlatform(platform)).not.toThrow();
      expect(browserManager.getCurrentUrl()).toBe('not-a-valid-url');
    });
  });

  describe('edge cases', () => {
    test('handles rapid panel creation and disposal', () => {
      for (let i = 0; i < 10; i++) {
        browserManager.createPanel(PanelPosition.Sidebar);
        browserManager.disposePanel();
      }

      expect(browserManager.isVisible()).toBe(false);
    });

    test('handles multiple show calls', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const revealSpy = jest.spyOn(panel, 'reveal');

      browserManager.showPanel();
      browserManager.showPanel();
      browserManager.showPanel();

      expect(revealSpy).toHaveBeenCalledTimes(3);
    });

    test('handles multiple hide calls', () => {
      browserManager.createPanel(PanelPosition.Sidebar);

      browserManager.hidePanel();
      browserManager.hidePanel(); // Should not throw

      expect(browserManager.isVisible()).toBe(false);
    });

    test('panel positioning switches correctly', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      expect(vscode.window.createWebviewPanel).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        ViewColumn.One,
        expect.any(Object)
      );

      browserManager.createPanel(PanelPosition.EditorColumn);
      expect(vscode.window.createWebviewPanel).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        ViewColumn.Two,
        expect.any(Object)
      );
    });
  });

  describe('navigation functionality', () => {
    test('navigates to valid URL and updates history', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      
      expect(browserManager.getCurrentUrl()).toBe('https://example.com');
      expect(browserManager.canNavigateBack()).toBe(false);
      expect(browserManager.canNavigateForward()).toBe(false);
    });

    test('builds navigation history with multiple URLs', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      browserManager.navigateToUrl('https://example.org');
      browserManager.navigateToUrl('https://example.net');
      
      expect(browserManager.getCurrentUrl()).toBe('https://example.net');
      expect(browserManager.canNavigateBack()).toBe(true);
      expect(browserManager.canNavigateForward()).toBe(false);
    });

    test('navigates back through history', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      browserManager.navigateToUrl('https://example.org');
      browserManager.navigateToUrl('https://example.net');
      
      browserManager.navigateBack();
      expect(browserManager.getCurrentUrl()).toBe('https://example.org');
      expect(browserManager.canNavigateBack()).toBe(true);
      expect(browserManager.canNavigateForward()).toBe(true);
      
      browserManager.navigateBack();
      expect(browserManager.getCurrentUrl()).toBe('https://example.com');
      expect(browserManager.canNavigateBack()).toBe(false);
      expect(browserManager.canNavigateForward()).toBe(true);
    });

    test('navigates forward through history', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      browserManager.navigateToUrl('https://example.org');
      browserManager.navigateBack();
      
      browserManager.navigateForward();
      expect(browserManager.getCurrentUrl()).toBe('https://example.org');
      expect(browserManager.canNavigateBack()).toBe(true);
      expect(browserManager.canNavigateForward()).toBe(false);
    });

    test('clears forward history when navigating to new URL', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      browserManager.navigateToUrl('https://example.org');
      browserManager.navigateBack();
      
      // Navigate to new URL should clear forward history
      browserManager.navigateToUrl('https://example.net');
      
      expect(browserManager.getCurrentUrl()).toBe('https://example.net');
      expect(browserManager.canNavigateForward()).toBe(false);
    });

    test('does not navigate back when at beginning of history', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      const initialUrl = browserManager.getCurrentUrl();
      
      browserManager.navigateBack();
      
      // Should stay at same URL
      expect(browserManager.getCurrentUrl()).toBe(initialUrl);
    });

    test('does not navigate forward when at end of history', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      browserManager.navigateToUrl('https://example.org');
      const currentUrl = browserManager.getCurrentUrl();
      
      browserManager.navigateForward();
      
      // Should stay at same URL
      expect(browserManager.getCurrentUrl()).toBe(currentUrl);
    });

    test('validates URL format', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('invalid-url');
      
      // Should still set URL but send error message
      expect(browserManager.getCurrentUrl()).toBe('invalid-url');
    });

    test('rejects non-http/https protocols', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('ftp://example.com');
      
      // Should set URL but send error message
      expect(browserManager.getCurrentUrl()).toBe('ftp://example.com');
    });

    test('sends navigate message to WebView', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const postMessageSpy = jest.spyOn(panel.webview, 'postMessage');
      
      browserManager.navigateToUrl('https://example.com');
      
      // Should send navigate message
      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'navigate',
          url: 'https://example.com'
        })
      );
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.browser.open',
        'https://example.com'
      );
    });

    test('pins the opened browser tab so future launches open in a new tab', (done) => {
      browserManager.createPanel(PanelPosition.Sidebar);

      browserManager.navigateToUrl('https://example.com');

      setTimeout(() => {
        expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
          'workbench.action.keepEditor'
        );
        done();
      }, 150);
    });

    test('sends navigationComplete message after navigation', (done) => {
      browserManager.createPanel(PanelPosition.Sidebar);
      const handler = jest.fn();
      
      browserManager.onWebViewMessage('navigationComplete', handler);
      browserManager.navigateToUrl('https://example.com');
      
      // Wait for async navigationComplete message
      setTimeout(() => {
        expect(handler).toHaveBeenCalledWith({
          type: 'navigationComplete',
          url: 'https://example.com'
        });
        done();
      }, 150);
    });

    test('sends navigationFailed message for invalid URLs', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      const handler = jest.fn();
      
      browserManager.onWebViewMessage('navigationFailed', handler);
      browserManager.navigateToUrl('invalid-url');
      
      expect(handler).toHaveBeenCalledWith({
        type: 'navigationFailed',
        error: 'Invalid URL: invalid-url'
      });
    });

    test('clears navigation history on disposal', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      browserManager.navigateToUrl('https://example.org');
      
      browserManager.disposePanel();
      
      expect(browserManager.canNavigateBack()).toBe(false);
      expect(browserManager.canNavigateForward()).toBe(false);
    });

    test('throws error when navigating without panel', () => {
      expect(() => browserManager.navigateToUrl('https://example.com')).toThrow(
        'Panel not created. Call createPanel() first.'
      );
      
      expect(() => browserManager.navigateBack()).toThrow(
        'Panel not created. Call createPanel() first.'
      );
      
      expect(() => browserManager.navigateForward()).toThrow(
        'Panel not created. Call createPanel() first.'
      );
    });

    test('handles concurrent navigation requests', () => {
      browserManager.createPanel(PanelPosition.Sidebar);
      
      browserManager.navigateToUrl('https://example.com');
      browserManager.navigateToUrl('https://example.org');
      browserManager.navigateToUrl('https://example.net');
      
      // Last navigation should win
      expect(browserManager.getCurrentUrl()).toBe('https://example.net');
    });
  });

  describe('message passing', () => {
    test('sends messages to WebView', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const postMessageSpy = jest.spyOn(panel.webview, 'postMessage');

      const message: ExtensionMessage = {
        type: 'updateTimer',
        remaining: 300,
        total: 600
      };

      browserManager.postMessageToWebView(message);

      expect(postMessageSpy).toHaveBeenCalledWith(message);
    });

    test('does not throw when sending message without panel', () => {
      const message: ExtensionMessage = {
        type: 'showWarning'
      };

      expect(() => browserManager.postMessageToWebView(message)).not.toThrow();
    });

    test('registers and handles WebView messages', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const handler = jest.fn();

      browserManager.onWebViewMessage('navigationComplete', handler);

      const message: WebViewMessage = {
        type: 'navigationComplete',
        url: 'https://example.com'
      };

      // Simulate message from WebView
      const messageCallback = (panel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
      messageCallback(message);

      expect(handler).toHaveBeenCalledWith(message);
    });

    test('opens URLs requested from the webview', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const messageCallback = (panel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];

      messageCallback({
        type: 'openUrl',
        url: 'https://example.com'
      });

      expect(browserManager.getCurrentUrl()).toBe('https://example.com');
      expect(vscode.commands.executeCommand).toHaveBeenCalledWith(
        'workbench.action.browser.open',
        'https://example.com'
      );

      messageCallback({
        type: 'openUrl',
        url: 'https://example.org'
      });

      expect(browserManager.getCurrentUrl()).toBe('https://example.org');
      expect(browserManager.canNavigateBack()).toBe(true);
    });

    test('handles navigation button messages from the webview', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const messageCallback = (panel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];

      messageCallback({
        type: 'openUrl',
        url: 'https://example.com'
      });

      messageCallback({
        type: 'openUrl',
        url: 'https://example.org'
      });

      messageCallback({
        type: 'navigateBack'
      });

      expect(browserManager.getCurrentUrl()).toBe('https://example.com');

      messageCallback({
        type: 'navigateForward'
      });

      expect(browserManager.getCurrentUrl()).toBe('https://example.org');
    });

    test('handles multiple message handlers', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      browserManager.onWebViewMessage('navigationComplete', handler1);
      browserManager.onWebViewMessage('filterApplied', handler2);

      const message1: WebViewMessage = {
        type: 'navigationComplete',
        url: 'https://example.com'
      };

      const message2: WebViewMessage = {
        type: 'filterApplied',
        elementCount: 5
      };

      const messageCallback = (panel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
      messageCallback(message1);
      messageCallback(message2);

      expect(handler1).toHaveBeenCalledWith(message1);
      expect(handler2).toHaveBeenCalledWith(message2);
    });

    test('ignores messages without registered handlers', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);

      const message: WebViewMessage = {
        type: 'navigationComplete',
        url: 'https://example.com'
      };

      const messageCallback = (panel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
      
      // Should not throw
      expect(() => messageCallback(message)).not.toThrow();
    });

    test('HTML content includes iframe for web content', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      
      expect(panel.webview.html).toContain('<iframe id="browser-iframe"');
      expect(panel.webview.html).toContain('sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"');
    });

    test('HTML content includes overlay div', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      
      expect(panel.webview.html).toContain('<div id="overlay">');
      expect(panel.webview.html).toContain('overlay-content');
    });

    test('HTML content includes timer display', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      
      expect(panel.webview.html).toContain('<div id="timer-display">');
    });

    test('HTML content includes CSP allowing external content', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      
      expect(panel.webview.html).toContain('Content-Security-Policy');
      expect(panel.webview.html).toContain('frame-src https: http:');
    });

    test('HTML content includes message handling script', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      
      expect(panel.webview.html).toContain('browserWebview.js');
      expect(panel.webview.html).toContain('vsfeed-shortcuts-data');
      expect(panel.webview.html).toContain('shortcuts-container');
      expect(panel.webview.html).toContain('back-button');
      expect(panel.webview.html).toContain('forward-button');
      expect(panel.webview.html).toContain('add-shortcut-button');
      expect(panel.webview.html).toContain('shortcut-modal-backdrop');
      expect(panel.webview.html).toContain('shortcut-save-button');
      expect(panel.webview.html).toContain('YouTube Shorts');
    });

    test('updates shortcuts in an active webview', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const postMessageSpy = jest.spyOn(panel.webview, 'postMessage');

      browserManager.setPlatformShortcuts([
        {
          name: 'Example',
          url: 'https://example.com',
          useMobileUrl: false,
        },
      ]);

      expect(postMessageSpy).toHaveBeenCalledWith({
        type: 'updateShortcuts',
        shortcuts: [
          {
            name: 'Example',
            url: 'https://example.com',
          },
        ],
      });
    });

    test('includes removable metadata for custom quick access items', () => {
      const panel = browserManager.createPanel(PanelPosition.Sidebar);
      const postMessageSpy = jest.spyOn(panel.webview, 'postMessage');

      browserManager.setPlatformShortcuts([
        {
          id: 'shortcut-1',
          name: 'Docs',
          url: 'https://example.com',
          useMobileUrl: false,
          isRemovable: true,
        },
      ]);

      expect(postMessageSpy).toHaveBeenCalledWith({
        type: 'updateShortcuts',
        shortcuts: [
          {
            id: 'shortcut-1',
            name: 'Docs',
            url: 'https://example.com',
            isRemovable: true,
          },
        ],
      });
    });
  });
});

import * as vscode from 'vscode';
import { BrowserManager, PanelPosition } from './BrowserManager';
import { MockExtensionContext } from '../__mocks__/vscode';
import { WebViewMessage } from '../utils/messageProtocol';

const settle = () => new Promise<void>(resolve => setImmediate(resolve));

describe('Compact Dock persistence', () => {
  let context: MockExtensionContext;
  let manager: BrowserManager;
  let receive: (message: WebViewMessage) => void;
  beforeEach(() => {
    jest.clearAllMocks();
    MockExtensionContext.clearStorage();
    context = new MockExtensionContext();
    manager = new BrowserManager(context as unknown as vscode.ExtensionContext);
    const panel = manager.createPanel(PanelPosition.Sidebar);
    receive = (panel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    (vscode.commands.executeCommand as jest.Mock).mockResolvedValue(undefined);
  });
  afterEach(() => manager.disposePanel());

  test('records successful launches and restores them in a new manager', async () => {
    manager.navigateToUrl('https://example.com');
    await settle();
    expect(context.globalState.get('vsfeed.launchHistory')).toEqual([
      { url: 'https://example.com', timestamp: expect.any(Number) }
    ]);
    const restored = new BrowserManager(context as unknown as vscode.ExtensionContext);
    const panel = restored.createPanel(PanelPosition.Sidebar);
    const ready = (panel.webview.onDidReceiveMessage as jest.Mock).mock.calls[0][0];
    ready({ type: 'ready' });
    expect(panel.webview.postMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'dashboardState', history: [{ url: 'https://example.com', timestamp: expect.any(Number) }]
    }));
    restored.disposePanel();
  });

  test('does not record a failed browser launch', async () => {
    (vscode.commands.executeCommand as jest.Mock).mockRejectedValue(new Error('Unavailable'));
    manager.navigateToUrl('https://example.com');
    await settle();
    expect(context.globalState.get('vsfeed.launchHistory', [])).toEqual([]);
  });

  test('retains only 200 launches', async () => {
    await context.globalState.update('vsfeed.launchHistory', Array.from({ length: 200 }, (_, i) => ({ url: 'https://example.com/' + i, timestamp: 1000 - i })));
    manager.navigateToUrl('https://new.example.com');
    await settle();
    const entries = context.globalState.get('vsfeed.launchHistory');
    expect(entries).toHaveLength(200);
    expect(entries[0].url).toBe('https://new.example.com');
  });

  test('serializes delete and clear operations', async () => {
    await context.globalState.update('vsfeed.launchHistory', [{ url: 'https://example.com', timestamp: 1 }, { url: 'https://other.example', timestamp: 2 }]);
    receive({ type: 'deleteHistory', timestamp: 1 });
    await settle();
    expect(context.globalState.get('vsfeed.launchHistory')).toEqual([{ url: 'https://other.example', timestamp: 2 }]);
    receive({ type: 'clearHistory' });
    await settle();
    expect(context.globalState.get('vsfeed.launchHistory')).toEqual([]);
  });

  test('validates saved collections and pin URLs at the host boundary', async () => {
    receive({ type: 'savePreferences', preferences: {
      groups: { 'https://example.com': 'Dev', 'https://other.example': 'Invalid' },
      pinned: ['https://example.com', 'javascript:alert(1)']
    } });
    await settle();
    expect(context.globalState.get('vsfeed.dashboardPreferences')).toEqual({
      groups: { 'https://example.com': 'Dev' }, pinned: ['https://example.com']
    });
  });

  test('storage failure does not turn a successful launch into a navigation failure', async () => {
    const failed = jest.fn(); manager.onWebViewMessage('navigationFailed', failed);
    context.globalState.update.mockRejectedValueOnce(new Error('Storage unavailable'));
    manager.navigateToUrl('https://example.com');
    await settle();
    expect(failed).not.toHaveBeenCalled();
  });
});

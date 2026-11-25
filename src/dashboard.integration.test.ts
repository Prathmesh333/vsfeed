import * as vscode from 'vscode';
import { activate, deactivate } from './extension';
import { MockExtensionContext } from './__mocks__/vscode';

// Exercise the real host wiring rather than testing only the timer in isolation.
describe('Compact Dock break controls', () => {
  beforeEach(() => { jest.clearAllMocks(); MockExtensionContext.clearStorage(); jest.useFakeTimers(); });
  afterEach(async () => { await deactivate(); jest.useRealTimers(); });

  async function openDashboard() {
    await activate(new MockExtensionContext() as unknown as vscode.ExtensionContext);
    const command = (vscode.commands.registerCommand as jest.Mock).mock.calls.find(call => call[0] === 'vsfeed.togglePanel');
    command[1]();
    const panel = (vscode.window.createWebviewPanel as jest.Mock).mock.results[0].value;
    const receive = panel.webview.onDidReceiveMessage.mock.calls[0][0];
    return { panel, receive };
  }

  test('restarting a break does not schedule closure of the new session', async () => {
    const { panel, receive } = await openDashboard();
    receive({ type: 'startBreak', minutes: 5 });
    receive({ type: 'startBreak', minutes: 10 });
    jest.advanceTimersByTime(3000);
    expect(panel.visible).toBe(true);
    expect(panel.webview.postMessage).toHaveBeenCalledWith({ type: 'sessionState', active: true, remaining: 600, duration: 10 });
  });

  test('manual end keeps the launcher open and clears the timer', async () => {
    const { panel, receive } = await openDashboard();
    receive({ type: 'startBreak', minutes: 5 });
    receive({ type: 'stopBreak' });
    jest.advanceTimersByTime(3000);
    expect(panel.visible).toBe(true);
    expect(panel.webview.postMessage).toHaveBeenCalledWith({ type: 'sessionState', active: false, remaining: 0, duration: 5 });
  });
});

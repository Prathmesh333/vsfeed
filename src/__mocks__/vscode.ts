// Mock vscode module for testing

// Mock storage for workspace state
const workspaceStateStorage = new Map<string, any>();
const globalStateStorage = new Map<string, any>();

export const workspace = {
  getConfiguration: jest.fn(() => ({
    get: jest.fn((key: string, defaultValue?: any) => defaultValue),
  })),
  onDidChangeConfiguration: jest.fn(() => ({
    dispose: jest.fn(),
  })),
  onDidChangeTextDocument: jest.fn(() => ({
    dispose: jest.fn(),
  })),
};

export enum ViewColumn {
  One = 1,
  Two = 2,
  Three = 3,
}

export class MockWebviewPanel {
  visible: boolean = true;
  public webview: any;
  private disposeCallback?: () => void;

  constructor(
    public viewType: string,
    public title: string,
    public viewColumn: ViewColumn,
    public options: any
  ) {
    this.webview = {
      html: '',
      cspSource: 'vscode-webview://mock',
      asWebviewUri: jest.fn((uri: Uri) => uri),
      postMessage: jest.fn(),
      onDidReceiveMessage: jest.fn(),
    };
  }

  reveal() {
    this.visible = true;
  }

  dispose() {
    this.visible = false;
    if (this.disposeCallback) {
      this.disposeCallback();
    }
  }

  onDidDispose(callback: () => void) {
    this.disposeCallback = callback;
    return new Disposable(() => {
      this.disposeCallback = undefined;
    });
  }
}

export const window = {
  showErrorMessage: jest.fn(),
  showInformationMessage: jest.fn(),
  showInputBox: jest.fn(),
  showQuickPick: jest.fn(),
  showWarningMessage: jest.fn(),
  createWebviewPanel: jest.fn((viewType: string, title: string, viewColumn: ViewColumn, options: any) => {
    return new MockWebviewPanel(viewType, title, viewColumn, options);
  }),
  onDidChangeActiveTextEditor: jest.fn(() => ({
    dispose: jest.fn(),
  })),
  onDidChangeWindowState: jest.fn(() => ({
    dispose: jest.fn(),
  })),
};

export const commands = {
  executeCommand: jest.fn(() => Promise.resolve()),
  getCommands: jest.fn(() => Promise.resolve([
    'workbench.action.browser.open',
    'simpleBrowser.show',
    'workbench.action.keepEditor',
    'workbench.action.pinEditor',
  ])),
  registerCommand: jest.fn(() => ({
    dispose: jest.fn(),
  })),
};

export class Disposable {
  constructor(private callback: () => void) {}
  dispose() {
    this.callback();
  }
}

export class EventEmitter<T> {
  private listeners: Array<(e: T) => void> = [];

  get event() {
    return (listener: (e: T) => void) => {
      this.listeners.push(listener);
      return new Disposable(() => {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
          this.listeners.splice(index, 1);
        }
      });
    };
  }

  fire(data: T): void {
    this.listeners.forEach(listener => listener(data));
  }

  dispose(): void {
    this.listeners = [];
  }
}

export class Uri {
  static file(path: string): Uri {
    return new Uri(path);
  }

  static parse(value: string): Uri {
    return new Uri(value);
  }

  static joinPath(base: Uri, ...pathSegments: string[]): Uri {
    const basePath = base.path.replace(/[\\/]+$/, '');
    const joinedPath = pathSegments
      .map(segment => segment.replace(/^[\\/]+|[\\/]+$/g, ''))
      .filter(Boolean)
      .join('/');

    return new Uri(joinedPath ? `${basePath}/${joinedPath}` : basePath);
  }

  constructor(public path: string) {}

  toString(): string {
    return this.path;
  }
}

// Mock ExtensionContext for testing
export class MockExtensionContext {
  extensionUri = Uri.parse('file:///mock/extension/path');
  subscriptions: Disposable[] = [];
  
  workspaceState = {
    get: jest.fn((key: string) => workspaceStateStorage.get(key)),
    update: jest.fn((key: string, value: any) => {
      if (value === undefined) {
        workspaceStateStorage.delete(key);
      } else {
        workspaceStateStorage.set(key, value);
      }
      return Promise.resolve();
    }),
  };

  globalState = {
    get: jest.fn((key: string, defaultValue?: any) => {
      return globalStateStorage.has(key) ? globalStateStorage.get(key) : defaultValue;
    }),
    update: jest.fn((key: string, value: any) => {
      if (value === undefined) {
        globalStateStorage.delete(key);
      } else {
        globalStateStorage.set(key, value);
      }
      return Promise.resolve();
    }),
  };

  // Clear storage between tests
  static clearStorage() {
    workspaceStateStorage.clear();
    globalStateStorage.clear();
  }
}

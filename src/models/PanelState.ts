import * as vscode from 'vscode';
import { PanelPosition } from '../components/BrowserManager';

export type LoadingState = 'idle' | 'loading' | 'loaded' | 'error';

export interface PanelState {
  panel?: vscode.WebviewPanel;
  currentUrl?: string;
  isVisible: boolean;
  position: PanelPosition;
  loadingState: LoadingState;
  errorMessage?: string;
}

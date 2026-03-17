import * as vscode from 'vscode';

export interface FilterRule {
  domain: string;
  selectors: string[];
}

export interface PlatformShortcut {
  name: string;
  url: string;
  useMobileUrl: boolean;
}

export interface ExtensionConfig {
  focusMode: {
    defaultDurationMinutes: number;
    enableBlurEffect: boolean;
    enableActivityPausing: boolean;
  };
  breakSuggestions: {
    enabled: boolean;
    codingThresholdMinutes: number;
  };
  contentFilter: {
    enabled: boolean;
    customRules: FilterRule[];
  };
  performance: {
    preferMobileUrls: boolean;
    memoryLimitMB: number;
  };
  platformShortcuts: PlatformShortcut[];
}

export class ConfigurationManager {
  private static readonly CONFIG_SECTION = 'vsfeed';

  getConfig(): ExtensionConfig {
    const config = vscode.workspace.getConfiguration(ConfigurationManager.CONFIG_SECTION);

    const extensionConfig: ExtensionConfig = {
      focusMode: {
        defaultDurationMinutes: this.validateNumber(
          config.get<number>('focusMode.defaultDurationMinutes', 15),
          1,
          60,
          15
        ),
        enableBlurEffect: config.get<boolean>('focusMode.enableBlurEffect', true),
        enableActivityPausing: config.get<boolean>('focusMode.enableActivityPausing', true),
      },
      breakSuggestions: {
        enabled: config.get<boolean>('breakSuggestions.enabled', true),
        codingThresholdMinutes: this.validateNumber(
          config.get<number>('breakSuggestions.codingThresholdMinutes', 90),
          30,
          180,
          90
        ),
      },
      contentFilter: {
        enabled: config.get<boolean>('contentFilter.enabled', false),
        customRules: this.validateFilterRules(
          config.get<FilterRule[]>('contentFilter.customRules', [])
        ),
      },
      performance: {
        preferMobileUrls: config.get<boolean>('performance.preferMobileUrls', true),
        memoryLimitMB: this.validateNumber(
          config.get<number>('performance.memoryLimitMB', 200),
          50,
          1000,
          200
        ),
      },
      platformShortcuts: this.validatePlatformShortcuts(
        config.get<PlatformShortcut[]>('platformShortcuts', this.getDefaultShortcuts())
      ),
    };

    return extensionConfig;
  }

  onConfigurationChanged(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(ConfigurationManager.CONFIG_SECTION)) {
        callback();
      }
    });
  }

  private validateNumber(value: number, min: number, max: number, defaultValue: number): number {
    if (typeof value !== 'number' || isNaN(value) || value < min || value > max) {
      vscode.window.showErrorMessage(
        `Invalid configuration value: ${value}. Must be between ${min} and ${max}. Using default: ${defaultValue}`
      );
      return defaultValue;
    }
    return value;
  }

  private validateFilterRules(rules: FilterRule[]): FilterRule[] {
    if (!Array.isArray(rules)) {
      return [];
    }

    return rules.filter((rule) => {
      if (!rule.domain || typeof rule.domain !== 'string') {
        vscode.window.showErrorMessage(
          `Invalid filter rule: domain must be a non-empty string`
        );
        return false;
      }

      if (!Array.isArray(rule.selectors) || rule.selectors.length === 0) {
        vscode.window.showErrorMessage(
          `Invalid filter rule for domain ${rule.domain}: selectors must be a non-empty array`
        );
        return false;
      }

      return true;
    });
  }

  private validatePlatformShortcuts(shortcuts: PlatformShortcut[]): PlatformShortcut[] {
    if (!Array.isArray(shortcuts)) {
      return this.getDefaultShortcuts();
    }

    return shortcuts.filter((shortcut) => {
      if (!shortcut.name || typeof shortcut.name !== 'string') {
        vscode.window.showErrorMessage(
          `Invalid platform shortcut: name must be a non-empty string`
        );
        return false;
      }

      if (!shortcut.url || typeof shortcut.url !== 'string') {
        vscode.window.showErrorMessage(
          `Invalid platform shortcut ${shortcut.name}: url must be a non-empty string`
        );
        return false;
      }

      // Validate URL format
      try {
        new URL(shortcut.url);
      } catch {
        vscode.window.showErrorMessage(
          `Invalid platform shortcut ${shortcut.name}: url must be a valid URL`
        );
        return false;
      }

      return true;
    });
  }

  private getDefaultShortcuts(): PlatformShortcut[] {
    return [
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
  }
}

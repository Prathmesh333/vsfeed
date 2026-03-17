import { ConfigurationManager, ExtensionConfig } from './ConfigurationManager';

describe('ConfigurationManager', () => {
  let configManager: ConfigurationManager;

  beforeEach(() => {
    configManager = new ConfigurationManager();
  });

  test('getConfig returns valid configuration with defaults', () => {
    const config = configManager.getConfig();

    expect(config).toBeDefined();
    expect(config.focusMode).toBeDefined();
    expect(config.breakSuggestions).toBeDefined();
    expect(config.contentFilter).toBeDefined();
    expect(config.performance).toBeDefined();
    expect(config.platformShortcuts).toBeDefined();
  });

  test('getConfig returns default focus mode settings', () => {
    const config = configManager.getConfig();

    expect(config.focusMode.defaultDurationMinutes).toBe(15);
    expect(config.focusMode.enableBlurEffect).toBe(true);
    expect(config.focusMode.enableActivityPausing).toBe(true);
  });

  test('getConfig returns default break suggestion settings', () => {
    const config = configManager.getConfig();

    expect(config.breakSuggestions.enabled).toBe(true);
    expect(config.breakSuggestions.codingThresholdMinutes).toBe(90);
  });

  test('getConfig returns default content filter settings', () => {
    const config = configManager.getConfig();

    expect(config.contentFilter.enabled).toBe(false);
    expect(config.contentFilter.customRules).toEqual([]);
  });

  test('getConfig returns default performance settings', () => {
    const config = configManager.getConfig();

    expect(config.performance.preferMobileUrls).toBe(true);
    expect(config.performance.memoryLimitMB).toBe(200);
  });

  test('getConfig returns default platform shortcuts', () => {
    const config = configManager.getConfig();

    expect(config.platformShortcuts).toHaveLength(5);
    expect(config.platformShortcuts[0].name).toBe('Instagram');
    expect(config.platformShortcuts[1].name).toBe('Twitter/X');
    expect(config.platformShortcuts[2].name).toBe('Reddit');
    expect(config.platformShortcuts[3].name).toBe('YouTube Shorts');
    expect(config.platformShortcuts[4].name).toBe('Hacker News');
  });
});

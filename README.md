# VSFeed

Doomscroll without leaving your code.

VSFeed is a context-aware social feed extension for Visual Studio Code designed specifically for idle moments during development.

Instead of switching to external platforms like Instagram, Reddit, or Twitter (X), VSFeed keeps the user inside the editor and provides a controlled, time-bound scrolling experience through VS Code's integrated browser and a lightweight in-IDE panel.

VSFeed does not aim to replace a browser or eliminate distractions entirely. It reframes unavoidable behavior by containing it inside the development environment, reducing context switching and making it easier to return to work.

The core idea is simple: allow users to scroll while they wait, without breaking their flow.

## Important Note

```text
VSFeed currently relies on VS Code's integrated browser. Some media playback
formats are not fully supported there yet, so YouTube videos, Twitch streams,
and similar platforms may not play reliably inside VSFeed today.

This is a browser-environment limitation rather than a VSFeed-specific bug.
If playback support improves in future VS Code updates, media support in
VSFeed should improve as well.
```

## Overview

VSFeed provides a lightweight social feed panel inside Visual Studio Code for waiting moments in development. It is built to keep the user inside the IDE while briefly engaging with content, then return them to work with minimal friction.

The current implementation uses VS Code's integrated browser plus a dedicated feed panel with shortcuts, history controls, a URL bar, and focus-mode tooling.

## Features

### Context-Aware Intent

VSFeed is designed for the moments when a developer is waiting on builds, tests, AI output, or other development tasks. The goal is to keep those short scrolling sessions inside the IDE instead of forcing a switch to separate apps or browser windows.

### Embedded Feed Workflow

VSFeed keeps a minimal panel inside the editor layout and opens sites in VS Code's integrated browser. The extension currently provides:

- A quick-access feed panel
- One-click shortcuts for common sites
- A URL bar with `Go`
- `Back` and `Forward` controls for VSFeed launch history
- A `+` button for adding custom sites

### Controlled Scrolling

VSFeed is intentionally bounded rather than aggressive:

- Focus mode can limit a scrolling session with a timer
- Warning and blur states help signal when it is time to return
- Workspace state is restored without turning the tool into a full browser replacement

### Workspace Integration

VSFeed integrates directly into the editor:

- Feed panel inside VS Code
- Integrated-browser tabs instead of external browser windows
- Saved shortcut state per workspace
- Keyboard shortcuts for opening the panel and navigating launch history

## Use Case

A developer runs a build, triggers an AI-assisted task, or hits a short waiting period during development. Instead of leaving VS Code, they open VSFeed, scroll briefly, and return to work without the usual context switch into a separate browser session.

## Design Principles

- Stay inside the IDE
- Keep the experience lightweight
- Reduce context switching
- Avoid overly aggressive engagement patterns
- Preserve developer focus

## Technical Approach

VSFeed is built using:

- Visual Studio Code Extension API
- Webview API for the panel UI
- VS Code's integrated browser for site rendering
- Local state management for shortcuts, session state, and navigation history

## Install

For local installation:

1. Run `Extensions: Install from VSIX...` in VS Code
2. Select the latest `vsfeed-*.vsix` file from this project

You can also use:

```powershell
.\install-extension.ps1
```

## Usage

### Open The Feed Panel

- Command Palette: `VSFeed: Toggle Feed Panel`
- Shortcut: `Ctrl+Shift+B` on Windows/Linux, `Cmd+Shift+B` on macOS

### Open A Website

1. Open VSFeed
2. Click a quick-site shortcut or type a URL
3. Press `Go`
4. VSFeed opens the page in a new integrated-browser tab

### Use Launch History

- Click `Back` and `Forward` in the launcher
- Or use `Alt+Left` and `Alt+Right` while the launcher is focused

These controls replay VSFeed's own launch history. They do not control the internal history of an already-open browser tab.

### Add Your Own Website

1. Open VSFeed
2. Click the `+` button
3. Enter a name
4. Enter a URL
5. Choose standard URL mode or mobile URL mode

To remove a saved shortcut, run `VSFeed: Remove Custom Shortcut`.

### Start Focus Mode

- Command Palette: `VSFeed: Activate Focus Mode`
- Shortcut: `Ctrl+Shift+F` on Windows/Linux, `Cmd+Shift+F` on macOS

When the timer ends, VSFeed shows the warning state, applies the configured blur behavior, and then closes the panel after a short delay.

## Commands

- `VSFeed: Toggle Feed Panel`
- `VSFeed: Activate Focus Mode`
- `VSFeed: Close Feed Panel`
- `VSFeed: Navigate Back`
- `VSFeed: Navigate Forward`
- `VSFeed: Add Custom Shortcut`
- `VSFeed: Remove Custom Shortcut`
- `VSFeed: Reset Extension State`

## Settings

Search for `vsfeed` in VS Code settings.

Most useful settings:

- `vsfeed.focusMode.defaultDurationMinutes`
- `vsfeed.focusMode.enableBlurEffect`
- `vsfeed.focusMode.enableActivityPausing`
- `vsfeed.breakSuggestions.enabled`
- `vsfeed.breakSuggestions.codingThresholdMinutes`
- `vsfeed.performance.preferMobileUrls`
- `vsfeed.platformShortcuts`

## Current Limits

- VSFeed launches VS Code's integrated browser. It is not a separate custom Chromium build.
- Some browsing behavior is controlled by VS Code itself, not by this extension.
- A universal ad blocker is not included because the extension does not get request-interception control over every integrated-browser page.
- Deeper automatic idle detection and build/test/task-aware activation are product-direction ideas, not fully implemented behavior in the current build.

## Troubleshooting

### The Feed Panel Opens But The Site Does Not

1. Run `Browser: Open Integrated Browser` manually to confirm your VS Code build supports it
2. Run `Developer: Reload Window`
3. Try the URL again from VSFeed

### The Feed Panel Buttons Look Stuck

Close the panel and reopen it with `VSFeed: Toggle Feed Panel`.

### Shortcuts Do Not Update

1. Re-add or remove the shortcut
2. Reopen the panel
3. Check `vsfeed.platformShortcuts` in settings

## Future Direction

Possible future improvements include:

- Deeper idle detection based on editor activity
- Smarter activation during builds, tests, terminal tasks, or AI output waits
- Developer-focused feed curation
- AI summarization of longer posts
- Configurable content filters
- Optional cached or offline-friendly content modes

## Development

### Prerequisites

- Node.js 20 or newer
- VS Code 1.85 or newer

### Commands

```bash
npm install
npm run compile
npm test
npm run package
```

## Contributing

Contributions are welcome! Visit the [GitHub repository](https://github.com/Prathmesh333/vsfeed) to:
- Report bugs or issues
- Suggest new features
- Submit pull requests
- View and contribute to the source code

## Links

- **GitHub Repository**: [https://github.com/Prathmesh333/vsfeed](https://github.com/Prathmesh333/vsfeed)
- **Issue Tracker**: [https://github.com/Prathmesh333/vsfeed/issues](https://github.com/Prathmesh333/vsfeed/issues)
- **VS Code Marketplace**: [VSFeed Extension](https://marketplace.visualstudio.com/items?itemName=PrathameshNikam.vsfeed)

## License

MIT

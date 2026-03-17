# Change Log

All notable changes to the VSFeed extension will be documented in this file.

## [1.0.0] - Marketplace Release

### Added
- In-panel bookmark-style quick access flow for saving custom sites directly inside VSFeed
- Removable custom quick-access items from the VSFeed panel
- Reduced extension icon size by switching to `logo-small.jpg`

### Changed
- Refined README, extension description, and UI copy for the finalized VSFeed positioning
- Promoted the release version to `1.0.0` for marketplace publishing

### Notes
- VSFeed currently relies on VS Code's integrated browser, so some media playback formats may still be limited until browser support improves in future VS Code updates

## [0.1.4] - External Fallback Update

### Fixed
- Added immediate external-browser fallback for more domains that block framing, including Reddit, X/Twitter, and Hacker News
- Removed the risky iframe sandbox combination that triggered the `allow-same-origin` warning in older builds
- Updated the install script to pick the newest packaged VSIX instead of a hard-coded old file

### Notes
- Instagram, YouTube, Reddit, X/Twitter, and Hacker News cannot be rendered inside the VS Code iframe when those sites send `X-Frame-Options` or `frame-ancestors` restrictions
- The extension now routes those known blocked domains to the external-browser fallback instead of repeatedly attempting to frame them

## [0.1.3] - Webview Stability Release

### Fixed
- Moved browser panel JavaScript out of the inline HTML template and into a dedicated webview asset
- Added a safer webview message contract for overlays and live shortcut updates
- Added a fallback action to open sites externally when they appear to block embedding
- Removed non-ASCII README headings that could trip VS Code's markdown/webview renderer in some environments

### Added
- Added a YouTube Shorts shortcut to the default quick-launch list
- Synced the welcome-screen shortcut buttons with configured shortcut data
- Preserved the existing Hacker News shortcut in the default list

## [0.1.2] - Bug Fix Release

### Fixed
- Fixed JavaScript syntax error caused by emoji characters in button text
- Removed emoji characters from welcome screen to ensure compatibility
- Buttons now work correctly when clicked

## [0.1.1] - Bug Fix Release

### Fixed
- Fixed black screen issue when opening browser panel for the first time
- Added welcome screen with platform shortcuts (Instagram, Twitter/X, Reddit, Hacker News)
- Added URL input field on welcome screen for quick navigation
- Improved initial user experience

## [0.1.0] - Initial Release

### Features

#### Embedded Browser Panel (Requirement 1)
- Embedded WebView browser panel inside VS Code
- Support for sidebar and split editor panel positioning
- Dock and undock controls
- URL navigation with back/forward support
- Workspace-specific state persistence

#### Focus Mode Timer (Requirement 2)
- Time-limited browsing sessions (1-60 minutes configurable)
- Real-time countdown timer display in browser panel
- Automatic panel hiding when timer expires
- Manual session termination
- Session completion notifications

#### Visual Distraction Controls (Requirement 3)
- Warning indicator at 25% remaining time
- Optional blur effect when session expires
- "Resume Coding" overlay message
- Configurable blur effect enable/disable

#### Coding Activity Detection (Requirement 4)
- Automatic timer pausing when coding activity detected (30+ seconds typing)
- Timer resume when returning to browser panel
- Configurable activity-based pausing
- Time tracking since last editor interaction

#### Break Suggestions (Requirement 5)
- Automatic break suggestions after long coding sessions
- Configurable coding threshold (30-180 minutes)
- One-click break acceptance opens browser with focus mode
- Time tracking since last break

#### Platform Quick Launch (Requirement 6)
- Predefined shortcuts for Instagram, Twitter/X, and Reddit
- Custom shortcut management (add/remove)
- Mobile-optimized URL support for faster loading
- Toolbar display of all shortcuts

#### Content Filtering (Requirement 7)
- CSS selector-based content filtering
- Predefined filters for Instagram (Reels, Explore) and Reddit (Popular, All)
- Custom filter rules per domain
- Filtered element count indicator
- Dynamic content filtering with MutationObserver

#### Workspace Persistence (Requirement 8)
- Current URL persistence per workspace
- Panel visibility state persistence
- Panel position persistence
- Automatic state restoration on workspace open
- Default initialization for new workspaces

#### Keyboard Shortcuts (Requirement 9)
- Toggle browser panel: `Ctrl+Shift+B` / `Cmd+Shift+B`
- Activate focus mode: `Ctrl+Shift+F` / `Cmd+Shift+F`
- Close panel: `Escape` (when focused)
- Navigate back: `Alt+Left` / `Cmd+Left`
- Navigate forward: `Alt+Right` / `Cmd+Right`
- Customizable shortcuts via VS Code keybindings

#### Authentication Handling (Requirement 10)
- Cookie storage for authentication
- Cookie persistence between sessions
- Session storage support
- Login page rendering
- Cookie clearing command

#### Performance Optimization (Requirement 11)
- Lazy loading when panel hidden
- Rendering suspension for hidden panels
- Memory limit enforcement (configurable 50-1000 MB, default 200 MB)
- Loading indicator for slow pages (10+ seconds)
- Mobile-optimized URL preference

#### Error Handling (Requirement 12)
- Network error messages with retry option
- CSP restriction detection and explanation
- External browser fallback for blocked sites
- WebView initialization error handling
- "Report Issue" links in error messages

#### Configuration Management (Requirement 13)
- VS Code settings UI integration
- Configuration validation with error messages
- Live configuration updates (no restart required)
- Default values for all options
- Comprehensive documentation in README

### Commands

- `vsfeed.togglePanel` - Toggle Browser Panel
- `vsfeed.activateFocusMode` - Activate Focus Mode
- `vsfeed.closePanel` - Close Browser Panel
- `vsfeed.navigateBack` - Navigate Back
- `vsfeed.navigateForward` - Navigate Forward
- `vsfeed.addCustomShortcut` - Add Custom Shortcut
- `vsfeed.removeCustomShortcut` - Remove Custom Shortcut
- `vsfeed.clearCookies` - Clear Cookies
- `vsfeed.resetState` - Reset Extension State

### Configuration Options

- `vsfeed.focusMode.defaultDurationMinutes` - Default focus session duration (1-60 minutes)
- `vsfeed.focusMode.enableBlurEffect` - Enable blur effect on timeout
- `vsfeed.focusMode.enableActivityPausing` - Enable activity-based timer pausing
- `vsfeed.breakSuggestions.enabled` - Enable break suggestions
- `vsfeed.breakSuggestions.codingThresholdMinutes` - Coding duration before break suggestion (30-180 minutes)
- `vsfeed.contentFilter.enabled` - Enable content filtering
- `vsfeed.contentFilter.customRules` - Custom filter rules per domain
- `vsfeed.performance.preferMobileUrls` - Prefer mobile-optimized URLs
- `vsfeed.performance.memoryLimitMB` - Memory limit for browser panel (50-1000 MB)
- `vsfeed.platformShortcuts` - Platform shortcuts configuration

### Known Limitations

- Some websites block embedding due to CSP or X-Frame-Options headers (use external browser fallback)
- WebView memory usage may vary based on website complexity
- Content filtering requires valid CSS selectors
- Activity detection only tracks editor typing, not other VS Code interactions

### Technical Details

- Built with TypeScript and VS Code Extension API
- Uses VS Code WebView API for browser rendering
- Workspace state stored via VS Code workspace storage API
- Property-based testing with fast-check
- Unit testing with Jest
- Minimum VS Code version: 1.85.0

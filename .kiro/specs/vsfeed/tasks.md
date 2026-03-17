# Implementation Plan: VSFeed

## Overview

This implementation plan breaks down the VSFeed extension into discrete, actionable coding tasks. The extension will be built using TypeScript and the VS Code Extension API. Tasks are organized to build incrementally, starting with core infrastructure, then adding features layer by layer, with property-based and unit tests integrated throughout.

The implementation follows a bottom-up approach: establish the foundation (project structure, configuration, state management), build core components (Browser Manager, WebView panel), add behavioral features (Focus Mode, Activity Monitor), implement content manipulation (filtering), and finally wire everything together with commands and UI.

## Tasks

- [x] 1. Project setup and core infrastructure
  - [x] 1.1 Initialize VS Code extension project structure
    - Create package.json with extension metadata and dependencies
    - Set up TypeScript configuration (tsconfig.json)
    - Configure build scripts and linting (ESLint)
    - Add dependencies: vscode, fast-check, jest/mocha
    - Create src/ directory structure: components/, models/, utils/
    - _Requirements: 13.1, 13.4_
  
  - [x] 1.2 Implement Configuration Manager
    - Create ExtensionConfig interface with all settings types
    - Implement ConfigurationManager class using vscode.workspace.getConfiguration()
    - Add configuration validation for numeric ranges and URLs
    - Implement change notification system using onDidChangeConfiguration
    - Define configuration schema in package.json contributes.configuration
    - _Requirements: 13.1, 13.2, 13.3, 13.4_
  
  - [ ]* 1.3 Write property test for Configuration Manager
    - **Property 34: Configuration Validation**
    - **Validates: Requirements 13.2**
  
  - [ ]* 1.4 Write property test for live configuration updates
    - **Property 35: Live Configuration Updates**
    - **Validates: Requirements 13.3**

- [x] 2. Workspace state persistence
  - [x] 2.1 Implement WorkspaceState data model and StateManager
    - Create WorkspaceState interface (currentUrl, panelVisible, panelPosition, etc.)
    - Implement StateManager class using vscode.ExtensionContext.workspaceState
    - Add saveState() method with JSON serialization
    - Add loadState() method with default initialization for missing state
    - Add clearState() method for state reset
    - Implement error handling for corrupted state data
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ]* 2.2 Write property test for workspace state round-trip
    - **Property 3: Workspace State Round-Trip**
    - **Validates: Requirements 1.6, 8.1, 8.2, 8.3, 8.4**
  
  - [ ]* 2.3 Write unit tests for StateManager edge cases
    - Test first-time initialization with no saved state
    - Test corrupted state data handling
    - Test storage quota exceeded scenarios
    - _Requirements: 8.6_

- [x] 3. WebView panel creation and management
  - [x] 3.1 Implement Browser Manager core functionality
    - Create BrowserManager class with panel lifecycle methods
    - Implement createPanel() with WebView options (enableScripts, retainContextWhenHidden: false)
    - Implement showPanel() and hidePanel() methods
    - Implement disposePanel() with cleanup logic
    - Add panel positioning support (sidebar vs editor column)
    - Implement isVisible() and getCurrentUrl() query methods
    - _Requirements: 1.1, 1.2, 1.3, 1.5_
  
  - [ ]* 3.2 Write property test for panel creation
    - **Property 1: Panel Creation and Rendering**
    - **Validates: Requirements 1.1**
  
  - [x] 3.3 Implement WebView HTML template and message passing
    - Create HTML template with iframe for web content
    - Add overlay div for timer UI and controls
    - Implement message passing bridge (ExtensionMessage and WebViewMessage types)
    - Add CSP configuration allowing external web content
    - Set up bidirectional communication between extension and WebView
    - _Requirements: 1.1, 1.4_
  
  - [x] 3.4 Implement navigation functionality
    - Add navigateToUrl() method with URL validation
    - Add navigateBack() and navigateForward() methods
    - Implement navigation state tracking
    - Handle navigation failures and errors
    - Send navigationComplete messages to extension host
    - _Requirements: 1.4, 9.5, 9.6_
  
  - [ ]* 3.5 Write property test for URL navigation
    - **Property 2: URL Navigation**
    - **Validates: Requirements 1.4**
  
  - [ ]* 3.6 Write unit tests for Browser Manager
    - Test panel disposal and cleanup
    - Test panel positioning (sidebar vs editor)
    - Test concurrent navigation requests
    - _Requirements: 1.2, 1.3, 1.5_

- [x] 4. Checkpoint - Verify core infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Focus Mode Controller implementation
  - [x] 5.1 Implement session timer logic
    - Create FocusController class with SessionState model
    - Implement startSession() with configurable duration (1-60 minutes)
    - Implement timer countdown using setInterval with 1-second granularity
    - Add endSession() method that stops timer and triggers cleanup
    - Implement getRemainingTime() and getSessionProgress() methods
    - Add event emitters for onTimerTick, onSessionEnd, onWarningThreshold
    - _Requirements: 2.1, 2.2, 2.4_
  
  - [ ]* 5.2 Write property test for timer countdown
    - **Property 4: Focus Mode Timer Countdown**
    - **Validates: Requirements 2.1, 2.4**
  
  - [ ]* 5.3 Write property test for timer display updates
    - **Property 5: Timer Display Updates**
    - **Validates: Requirements 2.2**
  
  - [x] 5.2 Implement pause and resume functionality
    - Add pauseSession() method that stops timer without ending session
    - Add resumeSession() method that restarts timer from remaining time
    - Track pause state and pausedAt timestamp
    - Ensure timer accuracy across pause/resume cycles
    - _Requirements: 4.2, 4.3_
  
  - [ ]* 5.5 Write property test for timer pause on coding activity
    - **Property 13: Timer Pause on Coding Activity**
    - **Validates: Requirements 4.2**
  
  - [ ]* 5.6 Write property test for timer resume on panel focus
    - **Property 14: Timer Resume on Panel Focus**
    - **Validates: Requirements 4.3**
  
  - [x] 5.7 Implement session auto-hide and notifications
    - Add logic to hide Browser_Panel when timer reaches zero
    - Implement session end notification using vscode.window.showInformationMessage()
    - Add 2-second delay before hiding panel
    - Update last break timestamp in workspace state
    - _Requirements: 2.3, 2.5_
  
  - [ ]* 5.8 Write property test for session auto-hide
    - **Property 6: Session Auto-Hide on Timeout**
    - **Validates: Requirements 2.3**
  
  - [ ]* 5.9 Write property test for session end notification
    - **Property 7: Session End Notification**
    - **Validates: Requirements 2.5**
  
  - [x] 5.10 Implement manual session termination
    - Add UI button in WebView for ending session early
    - Handle userAction message from WebView
    - Call endSession() and update state
    - _Requirements: 2.6_
  
  - [ ]* 5.11 Write property test for manual session termination
    - **Property 8: Manual Session Termination**
    - **Validates: Requirements 2.6**
  
  - [x] 5.12 Implement warning threshold indicator
    - Calculate 25% threshold based on configured duration
    - Emit onWarningThreshold event when threshold crossed
    - Send showWarning message to WebView
    - Display warning indicator in timer UI
    - _Requirements: 3.1_
  
  - [ ]* 5.13 Write property test for warning threshold
    - **Property 9: Warning Threshold Indicator**
    - **Validates: Requirements 3.1**
  
  - [ ]* 5.14 Write unit tests for Focus Controller edge cases
    - Test rapid pause/resume cycles
    - Test session end during pause
    - Test timer accuracy over long durations

- [x] 6. Activity Monitor implementation
  - [x] 6.1 Implement activity detection system
    - Create ActivityMonitor class with ActivityState model
    - Subscribe to vscode.workspace.onDidChangeTextDocument for typing detection
    - Subscribe to vscode.window.onDidChangeActiveTextEditor for editor focus
    - Subscribe to vscode.window.onDidChangeWindowState for window focus
    - Implement getTimeSinceLastActivity() method
    - Implement isUserCoding() method with 30-second threshold
    - _Requirements: 4.1, 4.5_
  
  - [ ]* 6.2 Write property test for activity detection
    - **Property 12: Activity Detection**
    - **Validates: Requirements 4.1**
  
  - [ ]* 6.3 Write property test for activity time tracking
    - **Property 15: Activity Time Tracking**
    - **Validates: Requirements 4.5**
  
  - [x] 6.4 Integrate Activity Monitor with Focus Controller
    - Add activity check in Focus Controller timer tick
    - Pause timer when isUserCoding() returns true for >30 seconds
    - Resume timer when user switches back to Browser_Panel
    - Add configuration option to enable/disable activity-based pausing
    - _Requirements: 4.2, 4.3, 4.4_
  
  - [x] 6.5 Implement break suggestion system
    - Track continuous coding duration in ActivityState
    - Implement getTimeSinceLastBreak() method
    - Emit onBreakSuggestionThreshold event when threshold exceeded (30-180 minutes)
    - Display break suggestion notification with accept/dismiss options
    - Open Browser_Panel with Focus_Mode when user accepts
    - Add configuration options for threshold and enable/disable
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  
  - [ ]* 6.6 Write property test for break suggestion trigger
    - **Property 16: Break Suggestion Trigger**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ]* 6.7 Write property test for break acceptance
    - **Property 17: Break Acceptance Opens Panel**
    - **Validates: Requirements 5.3**
  
  - [ ]* 6.8 Write property test for break time tracking
    - **Property 18: Break Time Tracking**
    - **Validates: Requirements 5.5**

- [x] 7. Checkpoint - Verify focus mode and activity monitoring
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Visual distraction controls
  - [x] 8.1 Implement blur effect system
    - Add applyBlur message type to WebView communication protocol
    - Implement blur CSS effect in WebView HTML template
    - Send applyBlur message when timer reaches zero (if enabled)
    - Add removeBlur message for clearing blur effect
    - Add configuration option to enable/disable blur effects
    - _Requirements: 3.2, 3.3_
  
  - [ ]* 8.2 Write property test for blur effect on timeout
    - **Property 10: Blur Effect on Timeout**
    - **Validates: Requirements 3.2**
  
  - [x] 8.3 Implement "Resume Coding" overlay
    - Create overlay UI component in WebView HTML
    - Display overlay message when blur is active
    - Add button to dismiss overlay and close panel
    - Send showOverlay message from extension to WebView
    - _Requirements: 3.4_
  
  - [ ]* 8.4 Write property test for blur overlay message
    - **Property 11: Blur Overlay Message**
    - **Validates: Requirements 3.4**

- [x] 9. Platform shortcuts implementation
  - [x] 9.1 Implement platform shortcut system
    - Create PlatformShortcut interface (name, url, useMobileUrl)
    - Define predefined shortcuts for Instagram, Twitter/X, Reddit
    - Implement launchPlatform() method in Browser Manager
    - Add platform shortcuts to extension configuration
    - Support mobile-optimized URLs for faster loading
    - _Requirements: 6.1, 6.2, 6.6_
  
  - [ ]* 9.2 Write property test for platform shortcut navigation
    - **Property 19: Platform Shortcut Navigation**
    - **Validates: Requirements 6.2**
  
  - [x] 9.3 Implement custom shortcut management
    - Add commands for adding custom shortcuts (name + URL input)
    - Add commands for removing custom shortcuts
    - Store custom shortcuts in configuration
    - Validate shortcut URLs before adding
    - _Requirements: 6.3, 6.4_
  
  - [ ]* 9.4 Write property test for custom shortcut addition
    - **Property 20: Custom Shortcut Addition**
    - **Validates: Requirements 6.3, 6.5**
  
  - [ ]* 9.5 Write property test for custom shortcut removal
    - **Property 21: Custom Shortcut Removal**
    - **Validates: Requirements 6.4**
  
  - [x] 9.6 Implement platform shortcuts UI in WebView
    - Create toolbar in WebView HTML for displaying shortcuts
    - Render buttons for all shortcuts (predefined + custom)
    - Handle button clicks and send navigation messages
    - Update toolbar when shortcuts configuration changes
    - _Requirements: 6.5_

- [x] 10. Content filtering implementation
  - [x] 10.1 Implement content filter script for WebView
    - Create applyContentFilter() function in WebView context
    - Implement CSS selector matching and element hiding
    - Add MutationObserver for dynamically loaded content
    - Count filtered elements and send filterApplied message
    - Handle errors in selector matching gracefully
    - _Requirements: 7.2, 7.3, 7.7_
  
  - [ ]* 10.2 Write property test for CSS selector filtering
    - **Property 22: CSS Selector Filtering**
    - **Validates: Requirements 7.2, 7.3**
  
  - [ ]* 10.3 Write property test for filter count display
    - **Property 24: Filter Count Display**
    - **Validates: Requirements 7.7**
  
  - [x] 10.4 Implement predefined filter rules
    - Define FilterRule interface (domain, selectors)
    - Create predefined rules for Instagram (Reels, Explore)
    - Create predefined rules for Reddit (Popular, All feeds)
    - Add predefined rules to FilterState
    - _Requirements: 7.4, 7.5_
  
  - [x] 10.5 Implement custom filter rule management
    - Add configuration option for custom filter rules
    - Implement UI for adding custom rules (domain + selectors)
    - Validate CSS selectors before applying
    - Store custom rules in configuration
    - Merge predefined and custom rules before applying
    - _Requirements: 7.1, 7.6_
  
  - [ ]* 10.6 Write property test for custom filter rules
    - **Property 23: Custom Filter Rules**
    - **Validates: Requirements 7.6**
  
  - [x] 10.7 Implement filter indicator UI
    - Display filtered element count in WebView toolbar
    - Show indicator only when Content_Filter is active
    - Update count when MutationObserver detects changes
    - _Requirements: 7.7_

- [x] 11. Authentication and cookie handling
  - [x] 11.1 Implement authentication cookie persistence
    - Configure WebView to enable cookie storage
    - Verify cookies persist between sessions automatically
    - Test authentication flow with login pages
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ]* 11.2 Write property test for cookie persistence
    - **Property 25: Authentication Cookie Persistence**
    - **Validates: Requirements 10.1, 10.2**
  
  - [ ]* 11.3 Write property test for login page rendering
    - **Property 26: Login Page Rendering**
    - **Validates: Requirements 10.3**
  
  - [x] 11.4 Implement session storage support
    - Verify session storage works in WebView context
    - Test session storage cleared on session end
    - _Requirements: 10.5_
  
  - [ ]* 11.5 Write property test for session storage round-trip
    - **Property 27: Session Storage Round-Trip**
    - **Validates: Requirements 10.5**
  
  - [x] 11.6 Implement cookie management commands
    - Add command to clear all stored cookies
    - Add configuration option to disable cookie persistence
    - Provide UI feedback when cookies are cleared
    - _Requirements: 10.4_

- [x] 12. Checkpoint - Verify feature completeness
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Performance optimization
  - [x] 13.1 Implement lazy loading and rendering suspension
    - Set retainContextWhenHidden: false in WebView options
    - Implement lazy panel creation (only on first access)
    - Suspend rendering when panel hidden
    - Restore rendering when panel shown
    - _Requirements: 11.1, 11.2_
  
  - [ ]* 13.2 Write property test for lazy loading
    - **Property 28: Lazy Loading When Hidden**
    - **Validates: Requirements 11.1**
  
  - [ ]* 13.3 Write property test for rendering suspension
    - **Property 29: Rendering Suspension**
    - **Validates: Requirements 11.2**
  
  - [x] 13.4 Implement loading indicator
    - Add loading state to PanelState model
    - Display loading indicator in WebView
    - Show indicator after 10-second timeout
    - Hide indicator on navigationComplete
    - _Requirements: 11.4_
  
  - [ ]* 13.5 Write property test for loading indicator
    - **Property 30: Loading Indicator Display**
    - **Validates: Requirements 11.4**
  
  - [x] 13.6 Implement memory monitoring
    - Add memory usage tracking using VS Code process API
    - Log warning if memory exceeds 200MB limit
    - Add configuration option for memory limit
    - _Requirements: 11.3_
  
  - [x] 13.7 Optimize mobile URL preference
    - Add configuration option for preferring mobile URLs
    - Implement URL transformation for mobile versions
    - Cache platform shortcut URLs
    - _Requirements: 11.5_

- [x] 14. Error handling implementation
  - [x] 14.1 Implement network error handling
    - Catch navigation failures in WebView onDidFailLoad event
    - Parse error codes to determine failure type
    - Display user-friendly error message with retry button
    - Log detailed errors to extension output channel
    - Implement retry logic with exponential backoff (max 3 attempts)
    - _Requirements: 12.1_
  
  - [ ]* 14.2 Write property test for network error handling
    - **Property 31: Network Error Handling**
    - **Validates: Requirements 12.1**
  
  - [x] 14.3 Implement CSP restriction handling
    - Detect CSP violations via WebView error events
    - Maintain allowlist of known problematic domains
    - Display explanation message for embedding blocks
    - Provide "Open in External Browser" button
    - Log blocked domains for telemetry
    - _Requirements: 12.2, 12.3_
  
  - [ ]* 14.4 Write property test for CSP restriction handling
    - **Property 32: CSP Restriction Handling**
    - **Validates: Requirements 12.2, 12.3**
  
  - [x] 14.5 Implement WebView initialization error handling
    - Wrap createWebviewPanel() in try-catch
    - Log full error with stack trace
    - Show notification with "Report Issue" link
    - Gracefully degrade by disabling browser commands
    - _Requirements: 12.4_
  
  - [x] 14.6 Implement error report link system
    - Add "Report Issue" link to all error messages
    - Pre-fill GitHub issue with error details
    - Include extension version and VS Code version
    - _Requirements: 12.5_
  
  - [ ]* 14.7 Write property test for error report link
    - **Property 33: Error Report Link**
    - **Validates: Requirements 12.5**
  
  - [ ]* 14.8 Write unit tests for error handling edge cases
    - Test WebView initialization failures
    - Test storage quota exceeded
    - Test corrupted state data
    - Test invalid CSS selectors in content filter

- [x] 15. Command registration and keyboard shortcuts
  - [x] 15.1 Register extension commands
    - Register command to toggle Browser_Panel visibility
    - Register command to activate Focus_Mode
    - Register command to close Browser_Panel
    - Register commands for navigation (back, forward)
    - Register commands for custom shortcut management
    - Register command to clear cookies
    - Register command to reset extension state
    - _Requirements: 1.1, 2.1, 9.1, 9.2, 9.4, 9.5, 9.6_
  
  - [x] 15.2 Configure default keyboard shortcuts
    - Define default keybindings in package.json
    - Set toggle panel shortcut (e.g., Ctrl+Shift+B)
    - Set activate focus mode shortcut (e.g., Ctrl+Shift+F)
    - Set close panel shortcut (e.g., Escape when panel focused)
    - Set navigation shortcuts (Alt+Left, Alt+Right)
    - Document that users can customize via VS Code keybindings
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_
  
  - [ ]* 15.3 Write property test for keyboard shortcut panel close
    - **Property 36: Keyboard Shortcut Panel Close**
    - **Validates: Requirements 9.4**

- [x] 16. Extension activation and lifecycle
  - [x] 16.1 Implement extension activation
    - Create activate() function in extension.ts
    - Initialize ConfigurationManager
    - Initialize StateManager with extension context
    - Create BrowserManager instance
    - Create FocusController instance
    - Create ActivityMonitor instance
    - Register all commands
    - Restore workspace state on activation
    - _Requirements: 8.4_
  
  - [x] 16.2 Implement extension deactivation
    - Create deactivate() function
    - Save current workspace state
    - Dispose all event subscriptions
    - Dispose WebView panel
    - Clean up timers and intervals
    - _Requirements: 8.1_
  
  - [x] 16.3 Wire all components together
    - Connect Focus Controller to Browser Manager for panel control
    - Connect Activity Monitor to Focus Controller for pause/resume
    - Connect Configuration Manager to all components for settings updates
    - Connect State Manager to Browser Manager for persistence
    - Set up message passing between extension and WebView
    - Ensure all event handlers are properly subscribed
    - _Requirements: All_

- [x] 17. Final integration testing
  - [ ]* 17.1 Write integration tests for complete workflows
    - Test full focus mode session from start to auto-hide
    - Test break suggestion acceptance flow
    - Test workspace state persistence across close/open
    - Test content filtering with custom rules
    - Test platform shortcut navigation with authentication
    - _Requirements: All_
  
  - [ ]* 17.2 Write integration tests for error scenarios
    - Test network failure during navigation
    - Test CSP violation handling
    - Test WebView initialization failure
    - Test configuration validation errors

- [x] 18. Documentation and packaging
  - [x] 18.1 Create extension README
    - Document all features and capabilities
    - Provide usage examples and screenshots
    - Document all configuration options
    - Include keyboard shortcuts reference
    - Add troubleshooting section
    - _Requirements: 13.5_
  
  - [x] 18.2 Create CHANGELOG
    - Document initial release features
    - List all implemented requirements
  
  - [x] 18.3 Configure extension packaging
    - Update package.json with complete metadata
    - Add extension icon and banner
    - Configure .vscodeignore for packaging
    - Test extension packaging with vsce

- [x] 19. Final checkpoint - Complete verification
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- All implementation uses TypeScript and VS Code Extension API
- Property tests use fast-check library with minimum 100 iterations
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at logical breakpoints
- Property tests validate universal correctness properties from design document
- Unit tests validate specific examples, edge cases, and integration points
- Extension follows VS Code best practices for performance and resource usage

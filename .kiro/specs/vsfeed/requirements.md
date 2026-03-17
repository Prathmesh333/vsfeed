# Requirements Document

## Introduction

The VSFeed extension is a Visual Studio Code extension that embeds a lightweight, distraction-controlled browser directly inside the editor. The extension allows developers to access web platforms without leaving the IDE, reducing context switching and maintaining workflow continuity. The system provides controlled browsing sessions with focus management features to turn potential distractions into managed, intentional breaks.

## Glossary

- **Extension**: The VSFeed extension
- **Browser_Panel**: The embedded WebView panel that displays web content inside VS Code
- **Focus_Mode**: A time-limited browsing session with automatic controls
- **Session_Timer**: A countdown timer that tracks browsing duration
- **Activity_Monitor**: Component that detects user coding activity
- **Content_Filter**: Component that blocks or allows specific web content sections
- **Workspace_State**: Persistent storage of browser state per VS Code workspace
- **Platform_Shortcut**: Quick-launch button for predefined web platforms
- **WebView**: VS Code's embedded web content rendering component

## Requirements

### Requirement 1: Embedded Browser Panel

**User Story:** As a developer, I want to open a browser panel inside VS Code, so that I can access web content without leaving my coding environment.

#### Acceptance Criteria

1. WHEN the user activates the browser command, THE Extension SHALL render the Browser_Panel using VS Code WebView API
2. THE Browser_Panel SHALL support display as a sidebar panel
3. THE Browser_Panel SHALL support display as a split editor panel
4. WHEN a URL is loaded, THE Browser_Panel SHALL render the web content within the panel
5. THE Extension SHALL provide dock and undock controls for the Browser_Panel
6. WHEN the Browser_Panel is closed, THE Extension SHALL preserve the current URL in Workspace_State

### Requirement 2: Focus Mode Timer

**User Story:** As a developer, I want time-limited browsing sessions, so that I can take controlled breaks without losing track of time.

#### Acceptance Criteria

1. WHEN Focus_Mode is activated, THE Session_Timer SHALL start counting down from the configured duration
2. THE Extension SHALL display the remaining time in the Browser_Panel UI
3. WHEN the Session_Timer reaches zero, THE Extension SHALL automatically hide the Browser_Panel
4. THE Extension SHALL allow users to configure session duration between 1 and 60 minutes
5. WHEN the session ends, THE Extension SHALL display a notification indicating the session has completed
6. THE Extension SHALL allow users to manually end a Focus_Mode session before the timer expires

### Requirement 3: Visual Distraction Controls

**User Story:** As a developer, I want visual cues when I've been browsing too long, so that I'm reminded to return to coding.

#### Acceptance Criteria

1. WHEN the Session_Timer falls below 25% of configured duration, THE Extension SHALL display a warning indicator
2. WHERE blur-on-timeout is enabled, WHEN the Session_Timer reaches zero, THE Extension SHALL apply a visual blur effect to the Browser_Panel content
3. THE Extension SHALL provide a configuration option to enable or disable blur effects
4. WHEN the blur effect is active, THE Extension SHALL display a "Resume Coding" message overlay

### Requirement 4: Coding Activity Detection

**User Story:** As a developer, I want the browser to pause when I'm actively coding, so that my break time isn't wasted while I'm working.

#### Acceptance Criteria

1. THE Activity_Monitor SHALL detect keyboard input in VS Code editor windows
2. WHEN the Activity_Monitor detects continuous typing for more than 30 seconds, THE Session_Timer SHALL pause
3. WHEN the user switches focus back to the Browser_Panel, THE Session_Timer SHALL resume
4. THE Extension SHALL provide a configuration option to enable or disable activity-based pausing
5. THE Activity_Monitor SHALL track the time since last editor interaction

### Requirement 5: Break Suggestions

**User Story:** As a developer, I want break suggestions after long coding sessions, so that I can maintain healthy work habits.

#### Acceptance Criteria

1. WHEN the Activity_Monitor detects continuous coding for more than 90 minutes, THE Extension SHALL display a break suggestion notification
2. THE Extension SHALL provide a configuration option to set the coding duration threshold between 30 and 180 minutes
3. WHEN the user accepts a break suggestion, THE Extension SHALL open the Browser_Panel with Focus_Mode activated
4. THE Extension SHALL provide a configuration option to disable break suggestions
5. THE Extension SHALL track the time since the last break was taken

### Requirement 6: Platform Quick Launch

**User Story:** As a developer, I want quick-launch buttons for common platforms, so that I can access them without typing URLs.

#### Acceptance Criteria

1. THE Extension SHALL provide Platform_Shortcuts for Instagram, Twitter/X, and Reddit
2. WHEN a Platform_Shortcut is activated, THE Browser_Panel SHALL navigate to the configured URL
3. THE Extension SHALL allow users to add custom Platform_Shortcuts with name and URL
4. THE Extension SHALL allow users to remove custom Platform_Shortcuts
5. THE Extension SHALL display Platform_Shortcuts in the Browser_Panel toolbar
6. THE Extension SHALL support mobile-optimized URLs for faster loading

### Requirement 7: Content Filtering

**User Story:** As a developer, I want to block distracting sections of websites, so that I can focus on useful content only.

#### Acceptance Criteria

1. THE Extension SHALL provide a configuration option to enable Content_Filter
2. WHERE Content_Filter is enabled, THE Extension SHALL allow users to specify CSS selectors for blocked elements
3. WHEN a page loads, THE Content_Filter SHALL hide elements matching the blocked selectors
4. THE Extension SHALL provide predefined filter rules for Instagram Reels and Explore pages
5. THE Extension SHALL provide predefined filter rules for Reddit Popular and All feeds
6. THE Extension SHALL allow users to add custom filter rules per domain
7. WHEN Content_Filter is active, THE Extension SHALL display an indicator showing how many elements were filtered

### Requirement 8: Workspace Persistence

**User Story:** As a developer, I want my browser state saved per workspace, so that I can resume where I left off when I reopen a project.

#### Acceptance Criteria

1. WHEN the workspace is closed, THE Extension SHALL save the current URL to Workspace_State
2. WHEN the workspace is closed, THE Extension SHALL save the Browser_Panel visibility state to Workspace_State
3. WHEN the workspace is closed, THE Extension SHALL save the Browser_Panel position to Workspace_State
4. WHEN the workspace is opened, THE Extension SHALL restore the Browser_Panel state from Workspace_State
5. THE Extension SHALL store Workspace_State using VS Code's workspace storage API
6. WHEN no Workspace_State exists, THE Extension SHALL initialize with default settings

### Requirement 9: Keyboard Shortcuts

**User Story:** As a developer, I want keyboard shortcuts to control the browser, so that I can quickly toggle it without using the mouse.

#### Acceptance Criteria

1. THE Extension SHALL register a default keyboard shortcut to toggle Browser_Panel visibility
2. THE Extension SHALL register a keyboard shortcut to activate Focus_Mode
3. THE Extension SHALL allow users to customize keyboard shortcuts through VS Code keybindings
4. WHEN the Browser_Panel is visible, THE Extension SHALL register a keyboard shortcut to close it
5. THE Extension SHALL register a keyboard shortcut to navigate back in browser history
6. THE Extension SHALL register a keyboard shortcut to navigate forward in browser history

### Requirement 10: Authentication Handling

**User Story:** As a developer, I want to authenticate with web platforms inside the browser panel, so that I can access my personalized feeds.

#### Acceptance Criteria

1. THE Browser_Panel SHALL support cookie storage for authentication
2. THE Browser_Panel SHALL persist authentication cookies between sessions
3. WHEN a platform requires login, THE Browser_Panel SHALL render the login page
4. THE Extension SHALL provide a configuration option to clear stored cookies
5. THE Browser_Panel SHALL support session storage for temporary authentication data

### Requirement 11: Performance Optimization

**User Story:** As a developer, I want the browser to load quickly and use minimal resources, so that it doesn't slow down my IDE.

#### Acceptance Criteria

1. THE Browser_Panel SHALL lazy-load content only when visible
2. WHEN the Browser_Panel is hidden, THE Extension SHALL suspend WebView rendering
3. THE Extension SHALL limit memory usage to less than 200MB per Browser_Panel instance
4. WHEN a page takes longer than 10 seconds to load, THE Extension SHALL display a loading indicator
5. THE Extension SHALL provide a configuration option to prefer mobile-optimized URLs for faster loading

### Requirement 12: Error Handling

**User Story:** As a developer, I want clear error messages when content fails to load, so that I understand what went wrong.

#### Acceptance Criteria

1. WHEN a URL fails to load due to network error, THE Extension SHALL display an error message with retry option
2. WHEN a platform blocks embedding due to CSP restrictions, THE Extension SHALL display a message explaining the limitation
3. WHEN a platform blocks embedding, THE Extension SHALL offer to open the URL in an external browser
4. IF the WebView fails to initialize, THEN THE Extension SHALL log the error and display a user-friendly message
5. WHEN an error occurs, THE Extension SHALL provide a "Report Issue" link to the extension repository

### Requirement 13: Configuration Management

**User Story:** As a developer, I want to customize extension settings, so that I can tailor the browser behavior to my preferences.

#### Acceptance Criteria

1. THE Extension SHALL provide configuration options through VS Code settings UI
2. THE Extension SHALL validate configuration values and display errors for invalid inputs
3. WHEN configuration is changed, THE Extension SHALL apply changes without requiring VS Code restart
4. THE Extension SHALL provide default values for all configuration options
5. THE Extension SHALL document all configuration options in the extension README


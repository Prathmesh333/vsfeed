# VSFeed

Open saved websites and take timed breaks inside Visual Studio Code. Use VSFeed to keep frequently used sites near your code and reopen sites from your recent launch history.

## Get started

1. Install VSFeed from the Extensions view or run **Extensions: Install from VSIX...** with the release package.
2. Open the Command Palette.
3. Run **VSFeed: Toggle Feed Panel**.

You can also press **Ctrl+Shift+B** on Windows or Linux, or **Cmd+Shift+B** on macOS. If another command uses the shortcut, use the Command Palette.

## Use the dashboard

| Section | What you can do |
| --- | --- |
| **Home** | Open a site from Quick Access, search saved sites, or enter a URL. |
| **Library** | Add a custom URL or browse suggested sites. Pin a site to move it to the front of Quick Access. |
| **History** | Search and reopen recent launches. Remove one entry or select **Clear history** to remove all entries. |
| **Settings** | Open VSFeed settings or your editor's browser settings. |

### Save a site

1. Open **Library**.
2. Select **Browse site directory**.
3. Select **+ Save** next to a site.

The directory includes sites such as GitHub, MDN Web Docs, Wikipedia, and LinkedIn. To save a different URL, select **Add site** and enter its name and address. Use the Library to edit a custom site or assign a site to a collection.

### Set a break timer

1. Select a duration in the dashboard header.
2. To enter your own duration, select **Custom** and enter a whole number from **1 to 60 minutes**.
3. Select **Start break**.

Use **End break** to stop the timer early. The timer and optional end-of-break blur apply to the VSFeed launcher. Open browser tabs remain available.

## Browser compatibility and data

VSFeed tries to open websites in the editor's Integrated Browser. If that command fails, VSFeed tries Simple Browser. Site sign-in and media playback depend on the browser and the website. Some sites block embedding in Simple Browser. If a site fails to open, try the URL in your regular browser.

VSFeed stores saved sites, pins, collections, and up to **200 successful launches** in extension storage. **Clear history** clears the VSFeed launch list. Browser history and cookies are managed by the browser.

## Settings

Search for **VSFeed** in the editor's Settings view.

| Setting | Purpose |
| --- | --- |
| Default break duration | Set the duration for **VSFeed: Activate Focus Mode**. |
| Activity pausing | Pause the break timer when VSFeed detects coding activity. |
| End-of-break blur | Blur the VSFeed launcher when the timer expires. |
| Break suggestions | Set whether and when VSFeed suggests a break during coding. |
| Platform shortcuts | Configure the default sites in Quick Access. |

## Report a bug

1. [Search existing issues](https://github.com/Prathmesh333/vsfeed/issues) to see if someone has reported the same problem.
2. If you find a matching issue, add any details that can help reproduce the problem.
3. If you find no match, [open a new bug report](https://github.com/Prathmesh333/vsfeed/issues/new).

Include the steps to reproduce the problem, what you expected, and what happened. Add your VSFeed version, editor name and version, and operating system. Remove private information from screenshots and logs before you attach them.

To suggest a feature, [open an issue](https://github.com/Prathmesh333/vsfeed/issues/new) and describe what you want to do in VSFeed.

## Development

Run `npm ci` to install dependencies. Run `npm test` to compile, lint, and test the extension.

VSFeed is available under the [MIT License](LICENSE).

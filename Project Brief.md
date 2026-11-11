# Build a Minimalist Desktop Study Tracker

## Your role

Act as an experienced software engineer, desktop application developer, and exceptional product/UI designer.

Your task is to research, design, build, test, and deliver a complete, production-quality, open-source desktop application for tracking study time and analyzing study habits.

**The concept: The simplicity of a stopwatch combined with the personal analytics of Last.fm and Spotify Wrapped.**

This is primarily an application I want to use personally every day. I also want to publish the source code on GitHub so other people can download it, customize it, build it, and use it independently.

I do not want a website, SaaS platform, cloud service, or account system.

I want a real, lightweight desktop application that works offline and stores everything locally.

The experience should be exceptionally polished while remaining extremely simple.

Do not create a generic productivity dashboard.

Do not sacrifice design quality for development speed.

Make reasonable technical and design decisions independently. Do not repeatedly ask me questions when a sensible choice can be made.

Your job is to actually build the application, not merely explain how to build it.

---

# 1. Research the existing landscape

Before implementing anything, study these products and their interfaces:

### Study tracking references

- [https://www.mystudydiary.com/diary](https://www.mystudydiary.com/diary)
- [https://tudyapp.com/en/features/stats](https://tudyapp.com/en/features/stats)
- [https://docs.study-track.app/features/stats/](https://docs.study-track.app/features/stats/)
- [https://rize.io/](https://rize.io/)

Find other relevant study timers and time-tracking applications where useful.

Focus on:

- How quickly someone can start a study session.
- How study subjects are selected and managed.
- How timers are presented.
- How past sessions are recorded.
- How historical analytics are visualized.
- Which interactions feel intuitive.
- Which features introduce unnecessary friction.

### Analytics inspiration

Study:

- Spotify Wrapped
- Last.fm listening statistics
- GitHub contribution heatmaps

I particularly like how Last.fm creates an interesting historical record from something as simple as listening to music.

Apply that philosophy to studying.

A user should accumulate useful information simply by studying and recording sessions, without needing to constantly enter additional data.

### UI and branding references

Study this repository:

[https://github.com/amosblomqvist/learnharness](https://github.com/amosblomqvist/learnharness)

Pay attention to its branding, minimal visual presentation, and natural README writing style.

Also research modern, beautifully designed desktop applications, including the visual quality and attention to detail found in high-end AI-assisted Fable 5.2-style interface designs.

Look at applications such as Raycast, Linear, Things, and other polished productivity tools for lessons in restrained desktop UI.

Do not copy their interfaces.

Extract good design principles and create an original identity.

If references are inaccessible, continue using available information rather than inventing observations about their design.

---

# 2. Non-negotiable product philosophy

The application must follow these principles.

**Simplicity over feature count.**

Everything should revolve around one core interaction:

Select a subject → Start studying → Finish → View insights.

There should be virtually no friction between opening the app and starting a session.

**Beautiful, not decorative.**

The UI should feel intentional, carefully designed, and premium.

Avoid the generic AI-generated dashboard aesthetic.

**Personal, not social.**

No classrooms, group sessions, leaderboards, followers, community features, or sharing requirements.

**Local, not cloud-based.**

The app must work completely offline.

No backend servers, hosted databases, logins, or internet dependency.

**Insightful, not overwhelming.**

Analytics should reveal interesting habits without presenting dozens of irrelevant statistics.

**Reliable, not gimmicky.**

Accurate timers, persistent data, backups, and fast performance matter more than animations or novelty features.

Whenever you consider adding a feature, ask:

"Does this make tracking studying easier, or make the recorded data more useful?"

If not, leave it out.

---

# 3. Technical architecture

Build an actual native desktop application.

### Preferred stack

- Tauri 2 for the desktop application framework.
- React for the user interface.
- TypeScript with strict type checking.
- Rust for native functionality when appropriate.
- SQLite for permanent local data storage.
- Tailwind CSS for styling.
- Accessible, carefully customized UI primitives.
- Lucide for consistent icons.
- Recharts or another appropriate charting library.
- Vitest for frontend and analytics tests.
- Rust tests for native functionality.
- Appropriate Tauri integration testing where practical.

Use modern, stable versions and official, maintained integrations.

Avoid unnecessary dependencies.

### Platform support

Prioritize:

1. Windows
2. macOS

Use cross-platform APIs and keep the project compatible with both operating systems.

Handle platform differences properly, especially:

- Window behavior.
- Always-on-top functionality.
- Fullscreen behavior.
- System tray integration if implemented.
- File dialogs.
- Application data directories.
- Native packaging.

The application should not require the user to manually install a database server, Node.js, Rust, or development tools to run the packaged release.

### Absolutely no website

Do not implement:

- A hosted website.
- A separate web dashboard.
- A PWA.
- Web hosting infrastructure.
- Cloud synchronization.
- Remote databases.
- Browser-based localStorage as the primary database.
- User accounts.
- Supabase.
- Firebase.
- External authentication.

Using React inside Tauri's embedded webview is fine, since that is how the native desktop application renders its interface.

The finished product must launch as an installed desktop app, not require the user to visit a URL.

---

# 4. Local storage and data ownership

Use SQLite as the primary database.

Store it in the appropriate operating-system application data directory, not inside the installation folder or Git repository.

Persist:

- Study subjects.
- Study sessions.
- Session start and finish times.
- Paused durations.
- Optional session notes.
- Appearance preferences.
- Font preferences.
- Application settings.
- Any other data essential to the core experience.

Design a clean schema with versioned migrations.

Do not unnecessarily store analytics values that can be calculated from existing session records.

### Reliability

Data must survive:

- Closing and reopening the app.
- Restarting the computer.
- Updating the application.
- Unexpected application termination, to the extent possible.
- Ordinary app usage over long periods.

Implement appropriate SQLite transaction handling and recovery behavior.

Never silently erase a user database during an update.

Do not bundle an empty database in a way that overwrites existing user records.

### Backup and restore

Implement:

- Export all data as JSON.
- Export study history as CSV.
- Import a previously exported JSON backup.
- Optional automatic local backups.
- A simple way to open the backup location.

Validate imported files before changing existing data.

Use safe backup operations and avoid corrupting a database by copying it while it is actively being written.

Prefer an atomic restore approach with clear confirmation.

Explain that local storage protects data from browser clearing but does not protect against a failed or lost computer unless the user has a backup.

Do not implement cloud backups or automatic third-party uploads.

---

# 5. Main experience: study timer

This is the most important part of the application.

The primary screen should feel exceptionally clean.

A rough example:

```
Data Structures

   01:24:36

 Pause   Finish
```

The actual interface should be significantly more refined than this text example.

### Subject input

Users should be able to:

- Type a new subject directly.
- Select an existing subject.
- Rename subjects.
- Delete subjects safely.
- Assign subtle colors to subjects.
- Quickly switch between available subjects.

Keep subject creation inline.

Do not make users open another page just to create a subject.

Remember the most recently used subject.

Avoid requiring descriptions, course codes, folders, tags, categories, or other unnecessary information.

### Timer controls

Support:

- Start.
- Pause.
- Resume.
- Finish.
- Cancel with confirmation when appropriate.

Show elapsed time clearly.

The timer should be the most prominent element on the main screen.

Use reliable timestamp-based timekeeping, not simply incrementing a counter every second.

Correctly handle:

- Minimizing the application.
- Moving between windows.
- System sleep and wake.
- App restarts.
- Paused periods.
- Sessions crossing midnight.
- Unexpected termination.

Define and consistently implement how elapsed time behaves during computer sleep.

If a running timer is restored after an abnormal shutdown, provide an unobtrusive way to correct or discard unintended elapsed time.

Do not automatically discard valid study time.

Prevent simultaneous duplicate active sessions.

### Optional session details

When a user finishes a session, optionally allow a short note.

Example:

"Finished recursion practice problems."

Notes should never be mandatory.

The user should be able to finish a study session with a single click.

### Manual session entry

Allow users to record forgotten study time.

Example:

Subject: Calculus

Date: November 10

Duration: 45 minutes

Keep manual entry simple.

Validate dates and durations, and make editing possible afterward.

---

# 6. Native floating timer

This is a signature feature of the application.

I want to be able to study while keeping a tiny timer visible beside VS Code, a PDF, or a browser window.

Build a genuine native desktop floating timer using Tauri's window capabilities.

Do not use browser Picture-in-Picture.

### Floating timer requirements

- Separate compact window.
- Optional always-on-top behavior.
- Draggable.
- Resizable within reasonable limits, or a carefully designed fixed compact size.
- Minimal window chrome where supported.
- Subject name.
- Live elapsed time.
- Pause/resume.
- Finish.
- Close or return-to-main control.

The floating timer should look extremely polished.

Think of a compact music mini-player, but for studying.

It should be small enough to sit in the corner of a monitor without being distracting.

### Synchronization

The floating timer and main window must use the same underlying session state.

Do not create a second timer or separate session.

Pausing from either window must immediately update the other.

Closing the floating timer should not automatically end the study session.

Handle opening and closing the mini-window repeatedly without duplicate windows, memory leaks, or stale state.

### Design restraint

The floating mode should not feature:

- Large toolbars.
- Unnecessary labels.
- Distracting animations.
- Extra widgets.
- Decorative graphs.

Make opening it possible through one subtle icon near the main timer.

---

# 7. Fullscreen focus mode

Implement a dedicated fullscreen timer experience.

This should be ideal for leaving on a second monitor during a study session.

Display:

- The subject name.
- A large, beautifully typeset elapsed timer.
- Minimal controls.
- A subtle exit-fullscreen action.

Use excellent typography, spacing, and composition.

Do not show analytics, sidebars, recent activity, or unnecessary navigation.

Support the Escape key for exiting fullscreen.

Use the selected application theme.

Make the view visually calm and comfortable for long sessions.

---

# 8. Main application layout

Keep navigation extremely simple.

Prefer three main destinations:

### Today

The home screen and live study timer.

### History

Past study sessions and manual editing.

### Insights

Analytics, trends, and personalized recaps.

Do not create numerous navigation tabs.

Keep appearance and other preferences inside a small settings panel.

### Today screen

The active timer is the centerpiece.

Show just enough supporting information to be useful:

- Today's total study time.
- This week's total study time.
- A compact seven-day study visualization.
- A few recent sessions.

Avoid excessive statistic cards.

The main timer should dominate the visual hierarchy.

### History screen

Provide an attractive, chronological session log.

Group sessions naturally by date.

Show:

- Subject.
- Duration.
- Start and end time when relevant.
- Optional note.

Allow editing and deleting entries.

Provide simple subject and date filters when useful.

Do not turn History into a complicated table-management interface.

### Empty states

Design meaningful empty states for new users.

Someone with no study sessions should immediately understand how to start.

Do not populate real application data with fabricated history.

If demo data is helpful for development, make it clearly separated from real user data and never include it in production records.

---

# 9. Analytics: Last.fm for studying

The application should automatically collect interesting insights as the user studies.

This is the main reason someone would continue using the application beyond the timer.

Aim for the feeling of exploring personal listening statistics on Last.fm.

Make historical data engaging without introducing unnecessary complexity.

### Total study time

Show total studying across selectable periods.

Provide simple date ranges:

- Week.
- Month.
- Year.
- All time.

### Study distribution

Visualize how study time is divided between subjects.

Include:

- Total duration per subject.
- Percentage distribution.
- Most-studied subject.
- Changes in distribution between periods.

Use an elegant bar chart, donut chart, or other appropriate visualization.

Do not overload the screen with redundant charts.

### Study hours

Show when the user typically studies.

For example:

"You studied most often between 8 PM and 10 PM."

Create a thoughtful time-of-day visualization.

Possible approaches:

- 24-hour distribution chart.
- Hour-by-weekday heatmap.
- A simple hourly activity graph.

Choose the presentation that communicates the information most clearly.

**Important:** Calculate the actual amount of study time spent in each hour.

A session running from 9:45 PM to 10:30 PM should contribute 15 minutes to the 9 PM hour and 30 minutes to the 10 PM hour.

Exclude paused time.

### Study consistency

Include a GitHub-style calendar heatmap.

Each day should display study intensity based on time recorded.

Users should be able to inspect a day to see the total duration and subject breakdown.

Use a beautiful, restrained color scale matching the currently selected theme.

### Historical trends

Show study activity over time.

Useful information includes:

- Daily study duration.
- Weekly totals.
- Monthly totals.
- Average session duration.
- Number of active study days.
- Week-over-week or month-over-month changes.

### Interesting personal statistics

Examples:

- Most-studied subject.
- Longest session.
- Average session length.
- Most active weekday.
- Most common study hour.
- Total number of sessions.
- Total study time.
- Number of days studied.

Only include statistics that provide useful information.

Avoid giving the user a wall of numbers.

### Accuracy requirements

All statistics should use a shared, tested analytics engine.

Handle:

- Paused durations.
- Sessions spanning midnight.
- Sessions crossing hourly boundaries.
- Time-zone changes.
- Daylight saving time.
- Edited sessions.
- Manual entries.
- Deleted records.
- Empty datasets.
- Large historical datasets.

Never invent values.

---

# 10. Study Wrapped

Create a monthly and yearly personal recap inspired by Spotify Wrapped.

This should be one of the application's most memorable experiences.

It should turn ordinary study records into an attractive story about how the user spends their time.

### Example recap

A yearly recap could include:

**Your year in studying**

"312 hours studied."

**Your top subject**

"Data Structures — 96 hours."

**Your favorite study hour**

"9 PM was your most common study hour."

**Your most consistent month**

"October had 24 active study days."

**Your study distribution**

A beautiful visual showing how subjects contributed to the year's study time.

These are illustrations of the kinds of insights to generate, not values to hardcode.

### Presentation

Use an editorial storytelling layout.

Consider a sequence of visually distinct panels.

Prioritize:

- Bold but refined typography.
- Thoughtful data visualization.
- Distinctive layouts.
- Smooth transitions.
- Strong visual hierarchy.
- Clear storytelling.

Avoid:

- Confetti.
- Excessive particle effects.
- Emoji-based awards.
- Fake personality analysis.
- Motivational clichés.
- Overwhelming animations.

The recap should be visually stronger than the regular insights dashboard while remaining consistent with the application's design identity.

### Exporting

If feasible, allow users to save a recap as a polished PNG image.

This should be an optional feature.

Do not add social integrations or require accounts.

Only generate historical recaps when sufficient data exists to make them meaningful.

---

# 11. Intelligent insights without unnecessary AI

I want the application to provide useful observations automatically, but I do not want an AI chatbot taking over the interface.

Examples:

"You studied 22% more this week than last week."

"Your longest sessions typically happen on Sunday."

"Most of your study time this month went toward Calculus."

These insights should be calculated directly from real study data.

Build a deterministic insight-generation system that works fully offline.

Do not rely on paid AI APIs, language model subscriptions, cloud inference, or internet connectivity.

Do not misrepresent statistical calculations as machine learning.

Actual local AI is optional only if it introduces meaningful functionality without significantly increasing application complexity, download size, resource use, or setup requirements.

Do not build a conversational AI assistant simply because it is trendy.

The best form of intelligence here is an application that quietly reveals useful patterns.

Display a small number of relevant insights instead of flooding users with suggestions.

Never claim that the user studies more effectively based solely on study duration.

---

# 12. Visual design system

Design is a major priority.

The application should look like a polished, carefully considered independent software product.

It should not resemble a generic AI-generated admin dashboard.

### Avoid

- Bright purple gradients everywhere.
- Heavy glassmorphism.
- Excessively rounded cards.
- Huge decorative headers.
- Oversized navigation sidebars.
- Too many bordered containers.
- Excessive drop shadows.
- Random colored icons.
- Emojis as interface icons.
- Generic motivational quotes.
- Unnecessary widgets.
- Layouts that waste space.
- Overly animated transitions.

### Prefer

- Beautiful typography.
- Precise visual hierarchy.
- Excellent spacing.
- Calm compositions.
- Restrained colors.
- Strong alignment.
- Carefully chosen borders.
- Subtle microinteractions.
- Deliberate visual rhythm.
- High-quality charts.
- Excellent dark mode.
- Polished empty states.
- Minimal visual noise.

Build a cohesive design system rather than styling components independently.

Use consistent spacing, radii, font sizes, colors, and interaction patterns.

Customize UI primitives enough that the application feels original.

Use icons sparingly and consistently.

### Typography

Pay particular attention to timer typography.

The timer is the most recognizable part of the product.

Use tabular numerals so the timer doesn't visually jump as seconds change.

Make the timer look balanced at both very large fullscreen sizes and tiny floating-window sizes.

Animations should be subtle and purposeful.

Respect reduced-motion accessibility settings.

---

# 13. Customizable prebuilt themes

I want simple appearance customization.

Do not build a complicated theme editor.

Instead, provide a curated collection of beautifully designed presets.

Include at least:

1. Light — clean, neutral, slightly warm.
2. Dark — refined charcoal tones.
3. Warm — cream, beige, and muted brown.
4. Slate — cool neutral grays with subtle blue.
5. Forest — deep muted green and natural colors.
6. Rose — soft, desaturated rose tones.

These are design directions, not requirements to use particular hex codes.

Make every theme feel thoughtfully designed.

Avoid simply changing the main accent color while leaving the rest of the palette untouched.

Each theme should have appropriate:

- Background colors.
- Surface colors.
- Text colors.
- Border colors.
- Accent colors.
- Hover states.
- Chart palettes.
- Heatmap colors.
- Contrast levels.

### Theme selector

Create a small appearance panel with visual previews of the available themes.

Users should be able to select a theme immediately.

Changes should appear without restarting.

Use the same selected theme in:

- Main window.
- Floating timer.
- Fullscreen timer.
- Analytics.
- Study Wrapped.

Remember the selection locally.

### Font customization

Include a small selection of thoughtfully chosen fonts.

Suggested options:

- Geist.
- Inter.
- DM Sans.
- IBM Plex Sans.
- IBM Plex Mono.

Select compatible licenses, bundle appropriate assets locally, and ensure no internet connection is needed to load fonts.

Allow the user to preview fonts before choosing.

Use one font consistently throughout the application, with appropriate numeric styling for the timer.

Avoid overwhelming customization such as arbitrary font uploads, individual component font settings, or excessive typography controls.

### Appearance philosophy

Customization should be effortless.

A user should be able to change a theme and font in seconds, then return to studying.

---

# 14. Desktop quality-of-life features

Implement small improvements that genuinely make using the application easier.

Prioritize:

### Keyboard shortcuts

Examples:

- Space to pause/resume when appropriate.
- A shortcut to focus the subject field.
- A shortcut to open the floating timer.
- Escape to leave fullscreen.
- A shortcut to return to the main timer.

Use context-aware behavior so shortcuts do not interfere with text inputs.

### Window behavior

Remember reasonable window dimensions and position.

Handle minimized and restored states gracefully.

The running study session should not stop because the main window is hidden.

### Compact controls

Keep rarely used actions in small menus or secondary controls.

Avoid displaying every possible action simultaneously.

### Safe destructive actions

Confirm permanent deletion when appropriate.

Prevent accidental session loss.

### Settings

Keep settings minimal.

Suggested sections:

- Appearance.
- Timer behavior.
- Data and backups.
- About.

Do not introduce dozens of preferences.

### Optional system tray

If it significantly improves the desktop experience, include a simple tray icon that can:

- Show whether a timer is running.
- Restore the main window.
- Open the floating timer.
- Exit the app.

Make the behavior explicit and avoid surprising users when they close the main window.

A system tray is useful but less important than reliable timer functionality.

---

# 15. Logo and branding

Choose a short, memorable name for the application.

The name should feel natural, understated, and suitable for an independent open-source desktop app.

Avoid names that sound like AI startups or generic productivity SaaS products.

Create a simple original vector logo inspired by the clean visual identity of LearnHarness.

Do not copy its actual logo.

### Logo requirements

- Minimal geometric construction.
- Recognizable at small sizes.
- Suitable for an app icon.
- Works on light and dark backgrounds.
- Works in monochrome.
- No complicated illustration.
- No excessive gradients.
- No generic AI sparkles.

Consider abstract visual references to:

- Time.
- Progress.
- A recorded session.
- Accumulating study hours.
- Books or learning, if represented subtly.

Create reusable SVG assets and platform-appropriate application icon files.

Ensure the icon looks professional in the Windows taskbar and macOS Dock.

The logo should feel like a deliberate part of the product's identity, not an afterthought.

---

# 16. GitHub and open-source distribution

I want the complete project published on GitHub.

The repository should be easy for another developer to clone, build, and customize.

Use available GitHub authentication or GitHub CLI access.

### Repository requirements

- Well-organized source code.
- Clear project structure.
- Proper `.gitignore`.
- No credentials or secrets.
- No personal study data.
- No local SQLite database files.
- No unnecessary build artifacts.
- Consistent formatting.
- Meaningful commit messages.
- Working development scripts.
- Tests.
- Database migrations.
- Application icons.
- Screenshots where available.
- Appropriate open-source license.

Use a standard permissive license such as MIT unless there is a concrete reason to choose differently.

### Independence

Other people must be able to:

1. Clone the repository.
2. Install development dependencies.
3. Run the application locally.
4. Build their own desktop installer.
5. Use their own local SQLite database.
6. Customize the application without connecting to my computer or services.

Do not include my personal website, a hosted demo URL, or any private information in the repository.

The application must not make requests to my infrastructure.

### Releases

Configure packaging for Windows and macOS.

Where possible, provide:

- Windows installer.
- macOS application bundle or disk image.
- GitHub release artifacts.

Use GitHub Actions for build verification and release packaging if appropriate.

Be realistic about platform-specific runners, code signing, notarization, and permissions.

Do not falsely claim that unsigned or unnotarized builds have the same installation experience as signed releases.

Do not require publishing to an app store.

If remote publication is blocked by missing authentication, preserve the complete local project and provide the commands needed to publish it.

Do not claim successful GitHub publication unless it actually succeeds.

---

# 17. README style and documentation

Study the presentation and writing style of:

[https://github.com/amosblomqvist/learnharness](https://github.com/amosblomqvist/learnharness)

I like how the project feels independent and naturally written.

Create a README with a similar level of simplicity, clarity, and professionalism.

Do not copy its wording.

### README structure

Start with the original application logo and product name.

Then provide a short natural description.

Example tone:

"A small desktop app for keeping track of study time and seeing where the hours go. It runs locally, saves your sessions automatically, and turns your history into useful statistics."

This is an example of the writing style, not necessarily the final text.

Include:

- A short product description.
- A few key features.
- Actual application screenshots.
- Supported operating systems.
- Installation instructions.
- Development setup.
- Build commands.
- Information about local storage.
- Exporting and restoring backups.
- Project structure if useful.
- Contributing information.
- License.

### Important writing requirements

- No emojis in the README.
- No exaggerated marketing copy.
- No generic AI-generated language.
- No unnecessary badges.
- No lengthy feature hype.
- No personal website URL.
- No references to nonexistent functionality.
- No fake screenshots.
- No misleading claims about supported platforms.

Make it sound like an actual independent developer wrote it.

Use direct, conversational technical writing.

The README should be professional enough for a public GitHub repository and easy for someone unfamiliar with the project to understand.

---

# 18. Code quality and maintainability

Write code that another developer can comfortably understand and modify.

Requirements:

- TypeScript strict mode.
- Clear types and data models.
- Modular components.
- Sensible separation of UI and business logic.
- Centralized timer state.
- Centralized analytics calculations.
- Reusable theme tokens.
- Proper database migration handling.
- Appropriate error handling.
- No hardcoded personal paths.
- No unnecessary global state.
- No unexplained magic numbers.
- No huge components doing unrelated tasks.

Use Rust for native application concerns without unnecessarily moving ordinary frontend logic into Rust.

Use React for interface rendering and interactivity.

Keep native window and database interactions organized behind clear interfaces.

Avoid adding complex architectural patterns without a real benefit.

Comments should explain non-obvious decisions, not restate obvious code.

---

# 19. Testing and verification

Do not stop at creating components.

Run the application and verify that it works.

### Core timer tests

Verify:

- Starting sessions.
- Pausing.
- Resuming.
- Finishing.
- Canceling.
- Restarting the app during a session.
- Recovering interrupted timers.
- Switching between main and floating windows.
- Keeping the timer accurate while minimized.
- Handling sessions crossing midnight.
- Preventing duplicate sessions.

### Database tests

Verify:

- Sessions persist across restarts.
- Editing records.
- Deleting records.
- Subject renaming.
- Import and export.
- Database migrations.
- Safe backup and restore.
- Correct behavior with no prior data.

### Analytics tests

Verify:

- Daily and weekly totals.
- Subject distribution percentages.
- Hourly distribution.
- Paused-time exclusion.
- Sessions spanning multiple days.
- Calendar heatmap values.
- Week-over-week calculations.
- Study Wrapped statistics.
- Empty datasets.

### UI testing

Inspect the actual rendered application if the development environment supports it.

Check:

- Main timer.
- History.
- Insights.
- Appearance settings.
- Floating timer.
- Fullscreen timer.
- Empty states.
- Dialogs and menus.
- Every theme.

Pay attention to alignment, padding, typography, contrast, overflow, and window resizing.

Do not rely only on code review.

Run available automated tests, linting, type checking, and production build commands.

Fix failures rather than simply documenting them.

If an operating system cannot be tested from the current environment, clearly state that limitation instead of claiming verification.

---

# 20. Implementation priorities

Develop in the following order.

### Phase 1 — Research and design

Research the references.

Choose the app name, product identity, design system, and architecture.

Establish the project structure.

### Phase 2 — Core functionality

Implement:

- SQLite persistence.
- Subject management.
- Study timer.
- Timer recovery.
- Session history.
- Manual entries.
- Editing and deletion.

These features must work before building advanced analytics.

### Phase 3 — Desktop experience

Implement:

- Native floating timer.
- Always-on-top behavior.
- Fullscreen focus mode.
- Window synchronization.
- Window state handling.
- Useful keyboard shortcuts.

### Phase 4 — Analytics

Implement:

- Daily and weekly totals.
- Subject distributions.
- Historical trends.
- Time-of-day visualization.
- Study calendar heatmap.
- Personal statistics.

### Phase 5 — Study Wrapped

Build monthly and yearly recaps.

Ensure all statistics are generated from real persisted data.

### Phase 6 — Appearance

Implement and refine:

- All preset themes.
- Font customization.
- Appearance persistence.
- Theme consistency across windows.
- UI polish.

Establish the visual system early, but complete final customization and polish after core workflows are reliable.

### Phase 7 — Reliability

Implement:

- Backup/export.
- Import/restore.
- Database migration safeguards.
- Tests.
- Error handling.
- Accessibility refinements.

### Phase 8 — Packaging and delivery

Create:

- Application icon and logo assets.
- Windows and macOS packaging configurations.
- GitHub Actions where appropriate.
- Professional README.
- Open-source license.
- Repository commits and GitHub publication.

Prioritize working, polished core functionality over optional features.

If time or technical constraints arise, simplify secondary features rather than delivering an application filled with partially implemented controls.

---

# 21. Definition of done

The project should satisfy all of the following:

- I can install it as a desktop application.
- It launches without an internet connection.
- It does not ask me to create an account.
- I can create a subject immediately.
- I can start studying with one click.
- The timer remains accurate.
- My sessions save automatically.
- My data remains after closing and reopening the app.
- I can manually enter missed study time.
- I can edit or remove sessions.
- I can open a compact native floating timer.
- The floating timer can remain above other applications.
- I can use a fullscreen study timer.
- I can see what I've studied today and this week.
- I can browse my study history.
- I can inspect my study distribution.
- I can see which times of day I study most.
- I can view useful historical trends.
- I can explore monthly and yearly personalized recaps.
- I can choose between multiple polished themes.
- I can select my preferred font.
- My settings remain saved.
- I can export and restore backups.
- The application works without cloud services.
- The interface is visually polished and consistent.
- Automated tests pass.
- The source code is organized and documented.
- The application can be packaged for Windows and macOS.
- The GitHub repository is independently usable by others.
- The README feels natural and professional.

Do not treat static UI mockups, fake data, or nonfunctional buttons as completion.

---

# 22. Final product expectation

I want this application to feel like something an excellent independent developer built for themselves and later decided to open source.

It should have a distinct identity.

It should feel fast and lightweight.

It should feel beautiful without trying too hard.

Most importantly, it should make studying and tracking time effortless.

I should be able to open it, select "Data Structures," start a timer, and forget about the application while I work.

Later, I should be able to open Insights and discover things I hadn't noticed about my habits.

The product should become more interesting as my study history grows.

Do not add complexity for the sake of appearing sophistcated.

**A simple timer. A meaningful history. Beautiful insights. Nothing unnecessary.**

Build the complete application, verify it, and deliver the finished source code and available installable builds.

At the end, provide a concise summary of what was implemented, what was tested, any remaining platform limitations, how to run the application, and the GitHub repository URL if publication succeeded.


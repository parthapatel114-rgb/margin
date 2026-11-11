# Margin 0.4 · study ledger

## Brief and reference

Keep the complete local study flow and every existing function. Make the interface simpler through hierarchy, grouping and consistent controls. The user's LearnHarness screenshot and its [official repository](https://github.com/amosblomqvist/learnharness) inform the restrained navigation, editorial heading and quiet neutral surfaces. No LearnHarness source, branding or artwork is copied.

The direction is a study ledger: a serif title, humanist body, compact tabular numbers, one working surface and plain rows of recorded time. No gradients, glow, decorative dashboard cards or network-dependent font loading.

## Six coordinated palettes

| Theme             | Base      | Secondary | Accent    |
| ----------------- | --------- | --------- | --------- |
| Carbon & Sage     | `#111111` | `#A5BAAA` | `#DDC18A` |
| Carbon & Fern     | `#111111` | `#B0BB91` | `#DFCF8F` |
| Carbon & Atlantic | `#111111` | `#A0BACD` | `#DBB998` |
| Paper & Olive     | `#FFFFFF` | `#435B43` | `#9B4F2B` |
| Paper & Ochre     | `#FFFFFF` | `#77582B` | `#355E78` |
| Paper & Plum      | `#FFFFFF` | `#6B4357` | `#306B60` |

The base is deliberately black or white. Secondary color carries the identity and recorded-time graphics; accent marks the primary action and selected dates. Neutral text, boundaries and derived surfaces are supporting roles, with a separate labeled danger treatment. Surface and heat steps were generated with ColorAide in OKLab, then stored as sRGB hex in src/themes.css. The application itself has no color-library dependency.

All six existing preference IDs remain valid so saved settings and old backups still open; the palette names and values are intentionally replaced. Their IDs are implementation details, not labels. The legacy `inter` font preference now selects Editorial, the new Source Sans 3 / Source Serif 4 pairing. Humanist and Mono remain alternatives. No database migration is needed.

## Typography and spacing

Source Serif 4 is reserved for page/dialog titles, the leading study-time total and recaps. Source Sans 3 is the default body and clock face; DM Sans and IBM Plex Mono remain optional body faces. All fonts are packaged offline under their included SIL licenses. Inter is removed from runtime dependencies.

- Page heading: 36px / 1.2, 550 weight; 30px at narrow widths.
- Body: 15px / 1.5; controls 14px and secondary labels 13px, all at least 400 weight.
- Main total: 44px serif; supporting totals 28px sans. Every changing number uses tabular figures.
- Spacing: the existing 8px base; related fields 12–16px, sections 24–32px.
- Controls: 5px radius; working surface 8px; modal 10px. Borders mark controls and table structure. Only dialogs and transient notices are elevated.
- Motion: immediate tabs; 120ms color transitions; explicit action press 0.96 over 150ms ease-out, only under no-preference. Theme changes suppress transitions.

## Complete state handling

| Situation                                        | Behavior                                                                                                                                               | Recovery                                                                                                                       |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| No internet                                      | All timers, history, statistics, themes and bundled fonts work locally. There is no app server to time out.                                            | Keep studying; no connection banner or fake network retry.                                                                     |
| First use / no saved time                        | One small page-and-pencil line drawing, a short state label and the existing next action. Subject/type creation remains inline.                        | Start a session or log past time. Add time continues to its editor after creating the first subject or restoring a study type. |
| Filter has no results                            | Distinct no-match state, with the chosen filters preserved.                                                                                            | Clear filters or choose All time.                                                                                              |
| Missing subject/type or malformed duration       | Field-level error with an icon and recovery wording; invalid value is retained.                                                                        | Correct that field and retry Start or Save.                                                                                    |
| Manual date is invalid, future or ends in future | Error is attached to the relevant date/duration input with an accessible description. Existing native overlap and stale-edit protection still applies. | Correct date/duration and Save again.                                                                                          |
| Navigate away from an unstarted timer            | Subject, type and intention stay in the main window's draft state. No timer starts without Start.                                                      | Return to Today and continue.                                                                                                  |
| Cancel a changed manual entry                    | Discard confirmation keeps the form mounted.                                                                                                           | Cancel discard to continue, or explicitly discard changes.                                                                     |
| Close main window with an input/editor draft     | Native window-close request and macOS menu Quit ask before discarding. Running/paused timers still use existing native persistence.                    | Keep open or discard input and close. Force-quit and the macOS Dock Quit path are outside this verified draft guarantee.       |
| Local database operation is slow                 | Existing busy state prevents duplicate controls; after 8 seconds an explicit saving message appears. Native SQLite has a 5-second busy timeout.        | Wait for completion; writes are never replayed speculatively.                                                                  |
| Native action returns an error                   | Error dialog retains input and offers a saved-state refresh.                                                                                           | Refresh data, inspect state, then retry the original action. Refresh itself performs no write.                                 |
| Export/import fails                              | Inline error remains in Settings; export/selection has a Try again action. A failed restore returns to choosing/validating a backup.                   | Retry export, choose another destination/file, or cancel. Restore remains a separate confirmation with a safety backup.        |
| View rendering fails                             | Existing error boundary explains that saved records remain and provides Try again.                                                                     | Reload the view; native timer data remains stored.                                                                             |

Input drafts are window-local, never counted as study records or sent anywhere. No automatic mutation retry, backend change, account, cloud service or feature removal is part of this redesign.

## Verification

Measured palette pairs and the final native layout checks are recorded in ui-review.md and verification.md. Narrow, zoom and RTL checks must be reported explicitly rather than assumed from CSS.

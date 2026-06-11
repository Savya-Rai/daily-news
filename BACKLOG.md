# News Briefing Backlog

Ideas worth keeping out of GitHub issues for now.

## Wants Now

- Add local, per-device section ordering preferences using `localStorage`.
  - Need a clean way for the user to edit the order.
  - Likely UI direction: a small `Customize` / `Edit sections` control near the section nav that opens a lightweight panel or modal with up/down controls.
  - Keep default ordering for first-time visitors and for browsers/devices without saved preferences.
- Add a sticky mini reading bar while scrolling.
  - Should show lightweight context such as current date, current section, and maybe a compact back-to-top affordance.
  - Keep it subtle so it does not compete with the briefing.
- Add page scroll progress.
  - A thin progress bar is preferred over per-section progress because each section is fairly small.
- Improve `More Headlines` with a preview.
  - Show a small preview of a couple of extra headlines before expansion if it does not overload the page.

## Later With AI

- Add a short Morning Snapshot paragraph under the masthead once AI summaries are introduced.
- Use AI to write sharper article summaries from source RSS metadata and article context, with RSS summaries as fallback.
- Add a one-sentence daily intro per section once AI is available.
- Use AI to cluster stories by real-world event more intelligently than token matching.
- Use AI to rank stories by global significance and briefing value, not just recency/source weight.

## News Quality And Automation

- Avoid repeating stories across days unless there is a meaningful new update.
- Add a breaking-news override so major world, market, AI, or security events can override normal section balance.
- Move source weights into config so publication importance can be tuned without editing code.
- Consider generated editorial tags such as `Markets`, `Policy`, `Security`, `AI`, and `Geopolitics` if they prove useful for scanning.

## Reading Modes

- Add a Quiet Mode.
  - Hide or reduce glows/animations.
  - Potentially expand summaries for a calmer reading experience.

## Trust And Status

- Consider adding subtle success/freshness microcopy inside the masthead date plate, such as `Updated this morning`.
- Add a more premium `Coverage interrupted` state for reduced coverage or feed failures.
- Keep per-section warnings only for reduced coverage or feed failures so the reader-facing page stays clean.

## Freshness

- Keep relative freshness labels like `12h ago` for now.
- Later, consider friendlier labels such as `Overnight`, `Early morning`, `Yesterday`, or `Updated today`.

## Maybe / Discuss Later

- Source diversity indicator for story clusters, such as `Also covered by BBC, Guardian`.
- Story card visual variants for the first story in each section.
- Richer share affordances after story-level native share is tested in daily use.

## No For Now

- No global `Top Story` ribbon.
- No read/saved state.
- No whole-briefing share control.
- No section share control.
- No cross-device preference sync unless the project later adds accounts or a backend.

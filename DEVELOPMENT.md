# Development Notes

This file keeps contributor workflow notes separate from the product README.

## Branch Workflow

- Do new work on a feature branch, not directly on `main`.
- Use the `codex/` branch prefix for Codex-created work.
- Commit focused changes with clear messages.
- Push the feature branch and open a pull request.
- Do not merge the pull request until the repo owner explicitly approves it.
- Keep GitHub Pages deployment on `main`; feature branches may run build checks, but should not publish over the live site.

## Local Vite Preview

Run the site locally:

```bash
npm install
npm run dev
```

Vite usually serves the site at:

```text
http://localhost:5173/
```

To preview on a phone, keep the dev server running and open the Vite `Network` URL on a phone connected to the same Wi-Fi. Example:

```text
http://192.168.20.5:5173/
```

If the local IP changes, find it with:

```bash
ipconfig getifaddr en0
```

Then open:

```text
http://YOUR-IP:5173/
```

## Design Skill Usage

For UI work, use design skills before and after implementation:

- `impeccable`: overall product quality, anti-generic direction, and design context.
- `polish`: final alignment, spacing, copy, states, and interaction details.
- `critique`: design review and issue prioritisation.
- `layout`: spacing, rhythm, density, and responsive structure.
- `typeset`: typography hierarchy, font choices, and readability.
- `animate`: motion, micro-interactions, reduced-motion checks, and scroll behaviour.
- `adapt`: mobile, desktop, touch targets, and responsive behaviour.
- `clarify`: reader-facing copy, labels, warnings, and empty/error states.
- `optimize`: bundle size, scroll smoothness, rendering, and performance tradeoffs.

Use the skills as a review lens, then implement changes conservatively in the existing React/CSS patterns. For this project, mobile matters heavily because the briefing is intended for daily iPhone reading.

## Verification Checklist

Before opening a PR:

- Run `npm run build:site` for UI-only changes.
- Run `npm run build` if generation logic or source data handling changed.
- Check `git diff --check`.
- Preview desktop and mobile layouts.
- Confirm the app still works at `http://localhost:5173/`.
- For phone checks, use the Vite network URL.
- Do not leave console logs, unused imports, or unrelated formatting churn.

## PR Description Template

Use this structure for pull requests:

```markdown
## Summary

[Briefly explain what this PR changes and why.]

## Changes

### UI

- [Reader-facing visual or interaction changes.]

### Code Logic

- [Data, state, generation, workflow, or behavioural changes.]

### Documentation

- [README, backlog, development notes, or other docs.]

## Verification

- [Command or manual check performed.]
- [Command or manual check performed.]

## Notes

- [Anything intentionally deferred, risky, or worth reviewing closely.]
```


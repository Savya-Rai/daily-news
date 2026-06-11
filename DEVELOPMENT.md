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

Run the site locally and use the Vite `Network` URL for desktop and phone checks:

```bash
npm install
npm run dev
```

Vite prints the URL as `Network`. Keep the dev server running and open that URL on any device connected to the same Wi-Fi. Example:

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
- `design-taste-frontend`: anti-template design direction, brief inference, and final pre-flight checks.
- `high-end-visual-design`: premium agency-level visual polish, haptic depth, and cinematic motion checks.
- `emil-design-eng`: invisible interaction details, animation judgement, and component feel.
- `polish`: final alignment, spacing, copy, states, and interaction details.
- `critique`: design review and issue prioritisation.
- `layout`: spacing, rhythm, density, and responsive structure.
- `typeset`: typography hierarchy, font choices, and readability.
- `animate`: motion, micro-interactions, reduced-motion checks, and scroll behaviour.
- `adapt`: mobile, desktop, touch targets, and responsive behaviour.
- `clarify`: reader-facing copy, labels, warnings, and empty/error states.
- `optimize`: bundle size, scroll smoothness, rendering, and performance tradeoffs.
- `imagegen-frontend-mobile`: mobile screen concept images only, useful for exploring app-native iPhone directions before coding.
- `imagegen-frontend-web`: web section image direction when a new visual system or major redesign needs generated references.
- `image-to-code`: image-led implementation when matching a generated or provided visual reference matters.
- `redesign-existing-projects`: audit-first upgrades to existing screens without breaking the product.
- `audit`: accessibility, performance, theming, responsive, and technical quality review.
- `bolder`: add more visual impact when the UI feels too safe.
- `quieter`: reduce intensity when the UI feels too loud.
- `colorize`: improve palette depth and colour strategy.
- `distill`: simplify cluttered UI and remove low-value elements.
- `delight`: add small moments of product personality.
- `shape`: plan a feature's UX/UI before implementation.
- `impeccable extract`: pull reusable components, tokens, and design-system patterns when needed.

Use the skills as a review lens, then implement changes conservatively in the existing React/CSS patterns. For this project, mobile matters heavily because the briefing is intended for daily iPhone reading.

## Verification Checklist

Before opening a PR:

- Run `npm run build:site` for UI-only changes.
- Run `npm run build` if generation logic or source data handling changed.
- Check `git diff --check`.
- Preview desktop and mobile layouts.
- Confirm the app works using the Vite `Network` URL.
- Use the Vite `Network` URL for all manual browser and phone checks.
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

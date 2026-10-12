# Devkitty idle resource plan

## Goal

Lower CPU use in the open Projects view without delaying data for a card that the user can see.

## Baseline

- In the installed 4.6.2 app, the Projects view used about 45% CPU across the renderer and graphics processes in a short sample.
- The Settings view used about 28% CPU in the same test. The Projects view adds substantial work, but the base window still uses CPU.
- The current setup has two projects, many HERO worktrees, a 10-second Git status interval, and live workflow rows.

## Changes

1. Stop the always-running shine effect on the app name. Check the blurred footer separately. Keep the same idle look as far as possible.
2. Stop worktree status checks for cards outside the view. Fetch when a card enters the view. Keep manual refresh working.
3. Stop one-second workflow clocks for rows outside the view. Update the time as soon as the row enters the view.
4. Bound the poll cache so old PR commit keys and removed worktree keys do not stay in memory for the whole app session.

## Proof

- Focused tests: passed.
- Full tests: 949 passed in 90 files.
- Lint on changed code: passed. Production build: passed.
- TypeScript: the base tree and this worktree have the same 103 known errors.
- Demo app: opened the Projects view, scrolled through worktrees, and saw live run times after returning.
- After install, compare 30-second idle CPU samples in Projects and Settings with the same data. Aim to cut Projects CPU by at least 30% from the current sample.

## Risk

- A card may show old state for a moment as it enters the view. Show its last known value until the new check ends.
- The installed app will not show the code change until a new build is installed.

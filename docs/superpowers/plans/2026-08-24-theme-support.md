# Theme Support (Sunset / Default) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-selectable appearance theme with two values — `sunset` (the new gradient/liquid-glass look) and `default` (the previous solid look) — persisted in settings and applied across the app chrome and rows.

**Architecture:** A single `theme: 'default' | 'sunset'` field on `AppSettings`, persisted via `electron-store` and mirrored into the `useAppSettings` Zustand store like every other setting. Every Sunset-specific style already lives in the working tree; the plan wraps each one in a `theme === 'sunset'` conditional so `default` restores the exact pre-feature classes (recovered from `git diff main`). A `SegmentedControl` in Settings > Appearance flips the value.

**Tech Stack:** Electron, React, Zustand, Tailwind v4, Blueprint.js 6.10, Vitest.

**Spec:** none (bounded feature; conditionals derived from `git diff main...HEAD` and working tree).

## Global Constraints

- Package manager is **pnpm**. Build check: `pnpm build`. Tests: `pnpm exec vitest run <file>`.
- **Never commit or push** unless the user explicitly asks (CLAUDE.md).
- `default` theme MUST be pixel-identical to `main` (pre-feature) — restore the exact original class strings listed per task.
- Dark mode is a separate axis (`.dark` class + `Classes.DARK`); theme does not touch it. Both themes must work in light and dark.
- Initial/default theme value = `'sunset'` (the flagship look). Existing users with persisted settings lacking `theme` fall through to `'sunset'` because the Zustand initial state is `'sunset'` and `setState` merge preserves it.

---

### Task 1: Settings plumbing for `theme`

**Files:**
- Modify: `src/types/appSettings.ts` (add field to `AppSettings`)
- Modify: `src/main/settings.ts:appSettings defaults` (add `theme: 'sunset'`)
- Modify: `src/renderer/hooks/useAppSettings.ts` (initial state + `useIsSunset` selector)
- Test: `src/renderer/hooks/useAppSettings.test.ts`

**Interfaces:**
- Produces: `AppSettings['theme']: 'default' | 'sunset'`; hook `useIsSunset(): boolean` exported from `useAppSettings.ts`.

- [ ] **Step 1: Add the failing test**

In `src/renderer/hooks/useAppSettings.test.ts`, inside `describe('initial state')`:

```ts
it('should have sunset theme by default', () => {
  expect(useAppSettings.getState().theme).toBe('sunset');
});
```

- [ ] **Step 2: Run it, expect fail**

Run: `pnpm exec vitest run src/renderer/hooks/useAppSettings.test.ts`
Expected: FAIL (`theme` is `undefined`).

- [ ] **Step 3: Add the type**

In `src/types/appSettings.ts`, add to `AppSettings` (alphabetical, after `swtchells`/before end — keep the object sorted; place after `showWorktrees`):

```ts
  showWorktrees: boolean;
  theme: 'default' | 'sunset'; // 'sunset' = new gradient/glass look, 'default' = previous solid look
```

- [ ] **Step 4: Add the store default**

In `src/renderer/hooks/useAppSettings.ts`, add to the initial state object (after `showWorktrees: true`):

```ts
  showWorktrees: true,
  theme: 'sunset',
```

Then append the selector export at the end of the file:

```ts
export const useIsSunset = () => useAppSettings((s) => (s.theme ?? 'sunset') === 'sunset');
```

- [ ] **Step 5: Add the main-process default**

In `src/main/settings.ts`, inside `defaults.appSettings` (after `showWorktrees: true`):

```ts
      showWorktrees: true,
      theme: 'sunset'
```

- [ ] **Step 6: Run test, expect pass**

Run: `pnpm exec vitest run src/renderer/hooks/useAppSettings.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit** (only if user asked to commit)

```bash
git add src/types/appSettings.ts src/main/settings.ts src/renderer/hooks/useAppSettings.ts src/renderer/hooks/useAppSettings.test.ts
git commit -m "feat: add theme setting (sunset/default)"
```

---

### Task 2: Gate App-root Sunset chrome

**Files:**
- Modify: `src/renderer/App.tsx`

**Interfaces:**
- Consumes: `useIsSunset` from Task 1.

- [ ] **Step 1: Read theme in App**

Add import and hook call:

```ts
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
```
```ts
  const isSunset = useIsSunset();
```

- [ ] **Step 2: Make the root class + decorations conditional**

Root `div` className becomes:

```tsx
      className={cn(
        'flex w-full relative flex-col',
        isSunset && 'devkitty-app-bg min-h-screen',
        footerVisible && 'has-claude-footer',
        darkMode && [Classes.DARK, 'dark']
      )}
```

Wrap the three decoration divs (inset shadow overlay, `devkitty-edge-l`, `devkitty-edge-r`) so they render only in Sunset:

```tsx
      {isSunset && (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-40 shadow-[inset_0_0_28px_1px_rgba(0,0,0,0.5)] dark:shadow-[inset_0_0_32px_2px_rgba(0,0,0,0.65)]"
          />
          <div
            aria-hidden
            className="devkitty-edge-l pointer-events-none fixed bottom-0 left-0 top-0 z-50 w-0.5"
          />
          <div
            aria-hidden
            className="devkitty-edge-r pointer-events-none fixed bottom-0 right-0 top-0 z-50 w-0.5"
          />
        </>
      )}
```

`ClaudeFooter` stays rendered in both themes (Task 5 styles it).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: `✓ built`.

---

### Task 3: Gate navbar (header gradient, wordmark, shadow)

**Files:**
- Modify: `src/renderer/components/AppNavbar/AppNavbar.tsx`

**Interfaces:**
- Consumes: `useIsSunset`.

- [ ] **Step 1: Read theme**

```ts
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
```
```ts
  const isSunset = useIsSunset();
```

- [ ] **Step 2: Conditional Navbar className**

```tsx
      className={cn(
        'app-region-drag select-none !shadow-none overflow-hidden',
        isSunset
          ? 'devkitty-header-grad'
          : '!bg-bp-light-gray-4 dark:!bg-bp-dark-gray-1 dark:border-b dark:border-bp-dark-gray-2'
      )}
```

- [ ] **Step 3: Restore the dark shadow container in default only**

Immediately after the logo `Button` (where it lived on `main`), add:

```tsx
        {!isSunset && (
          <div className="navbar-shadow-container hidden dark:block">
            <div className="navbar-shadow" />
          </div>
        )}
```

- [ ] **Step 4: Conditional wordmark class**

```tsx
          className={cn(
            'app-region-drag ml-1.5 text-lg select-none pointer-events-none',
            isSunset ? 'dark:text-bp-light-gray-4' : 'dark:-ml-[42px] dark:text-bp-dark-gray-3'
          )}
```

- [ ] **Step 5: Build**

Run: `pnpm build`
Expected: `✓ built`.

---

### Task 4: Gate search input styling

**Files:**
- Modify: `src/renderer/components/AppNavbar/SearchInput.tsx`

**Interfaces:**
- Consumes: `useIsSunset`.

- [ ] **Step 1: Read theme**

```ts
import { useIsSunset } from 'renderer/hooks/useAppSettings';
```
```ts
  const isSunset = useIsSunset();
```

- [ ] **Step 2: Conditional container class**

```tsx
      'group flex items-center h-[26px] gap-1.5 pl-2.5 pr-1 rounded-full box-border',
      isSunset
        ? 'backdrop-blur-sm border border-black/10 dark:border-white/15 bg-black/5 dark:bg-white/10 hover:border-black/20 dark:hover:border-white/25 focus-within:border-black/30 dark:focus-within:border-white/40 focus-within:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]'
        : 'border border-bp-light-gray-1 dark:border-bp-dark-gray-4 bg-bp-light-gray-5 dark:bg-bp-dark-gray-2 hover:border-bp-gray-4 dark:hover:border-bp-dark-gray-5 focus-within:border-bp-gray-3 dark:focus-within:border-bp-gray-2 focus-within:shadow-[0_0_0_3px_rgba(143,153,168,0.15)]',
      'w-[140px] focus-within:w-[220px] transition-all duration-200 ease-out'
```

- [ ] **Step 3: Conditional icon / input / clear classes**

Search icon: `isSunset ? 'text-bp-gray-2 dark:text-white/50 shrink-0' : 'text-bp-gray-2 dark:text-bp-gray-3 shrink-0'`

Input text: `isSunset ? 'text-black dark:text-white' : 'text-black dark:text-bp-light-gray-5'` and placeholder `isSunset ? 'placeholder:text-bp-gray-2 dark:placeholder:text-white/50' : 'placeholder:text-bp-gray-2 dark:placeholder:text-bp-gray-3'`

Clear button: `isSunset ? 'text-bp-gray-2 dark:text-white/60 hover:bg-black/10 dark:hover:bg-white/15' : 'text-bp-gray-2 dark:text-bp-gray-3 hover:bg-bp-light-gray-2 dark:hover:bg-bp-dark-gray-4'`

- [ ] **Step 4: Build**

Run: `pnpm build`
Expected: `✓ built`.

---

### Task 5: Gate footer glass vs solid

**Files:**
- Modify: `src/renderer/components/ClaudeUsage/ClaudeFooter.tsx`

**Interfaces:**
- Consumes: `useIsSunset`.

- [ ] **Step 1: Read theme**

```ts
import { useIsSunset } from 'renderer/hooks/useAppSettings';
```
```ts
  const isSunset = useIsSunset();
```

- [ ] **Step 2: Conditional footer container class**

```tsx
      className={cn(
        'app-region-no-drag fixed bottom-0 left-0 right-0 z-10 flex h-11 select-none items-center gap-3.5 px-4',
        isSunset
          ? 'devkitty-footer-glass'
          : 'border-t border-bp-light-gray-1 bg-bp-light-gray-4 dark:border-bp-dark-gray-2 dark:bg-bp-dark-gray-1',
        'transition-transform duration-300 ease-out',
        showClaudeUsage ? 'translate-y-0' : 'pointer-events-none translate-y-full'
      )}
```

The SVG filter def and AccountPills stay unchanged (they are controls, not chrome).

- [ ] **Step 3: Build**

Run: `pnpm build`
Expected: `✓ built`.

---

### Task 6: Gate translucent rows back to solid in default

**Files:**
- Modify: `src/renderer/components/GroupCollapse/GroupCollapse.tsx`
- Modify: `src/renderer/components/Project/components/CheckoutCard/CheckoutCard.tsx`
- Modify: `src/renderer/components/Project/components/Error/Error.tsx`
- Modify: `src/renderer/components/Project/components/PullRequest/PullRequest.tsx`
- Modify: `src/renderer/components/Project/components/Workflow/Workflow.tsx`

**Interfaces:**
- Consumes: `useIsSunset`.

Each component: import `useIsSunset`, call `const isSunset = useIsSunset();`, and swap the translucent classes for a `isSunset ? <glass> : <solid>` ternary. Exact strings (glass = current working tree, solid = `main`):

- [ ] **Step 1: GroupCollapse** — outer wrapper class:

```tsx
isSunset ? 'bg-bp-light-gray-5/70 dark:bg-bp-dark-gray-1/40' : 'bg-bp-light-gray-5 dark:bg-bp-dark-gray-1'
```
(keep the trailing `transition-opacity duration-300 ease-in-out` in the same `cn` list.)

- [ ] **Step 2: CheckoutCard** — inner surface (the `bg-bp-light-gray-3/80` line):

```tsx
isSunset ? 'bg-bp-light-gray-3/80 dark:bg-bp-dark-gray-1/55' : 'bg-bp-light-gray-3 dark:bg-bp-dark-gray-1'
```
(Leave the sticky **header** surface `bg-bp-light-gray-4 dark:bg-bp-dark-gray-2` unchanged — it is opaque in both themes.)

- [ ] **Step 3: Error**:

```tsx
isSunset ? 'bg-bp-light-gray-4/80 dark:bg-bp-dark-gray-2/60' : 'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2'
```

- [ ] **Step 4: PullRequest**:

```tsx
isSunset ? 'bg-bp-light-gray-4/80 dark:bg-bp-dark-gray-2/55' : 'bg-bp-light-gray-4 dark:bg-bp-dark-gray-2'
```

- [ ] **Step 5: Workflow** — the current `isOpen ? sticky-opaque : glass` block becomes theme-aware. Default must match `main`: solid always, sticky only when open.

```tsx
          isSunset
            ? isOpen
              ? 'sticky z-[5] bg-bp-light-gray-4 dark:bg-bp-dark-gray-2'
              : 'bg-bp-light-gray-4/80 dark:bg-bp-dark-gray-2/55'
            : cn('bg-bp-light-gray-4 dark:bg-bp-dark-gray-2', isOpen && 'sticky z-[5]')
```

- [ ] **Step 6: Build**

Run: `pnpm build`
Expected: `✓ built`.

---

### Task 7: Theme selector UI in Settings > Appearance

**Files:**
- Modify: `src/renderer/components/SettingsAppearance/SettingsAppearance.tsx`

**Interfaces:**
- Consumes: `useAppSettings` (`theme`, `set`).

- [ ] **Step 1: Add the control**

Import `SegmentedControl` from `@blueprintjs/core`, pull `theme` and `set` from `useAppSettings`, and add a section under "Color Theme" (before the Git divider):

```tsx
      <Divider className="my-6!" />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Style</h3>

      <SegmentedControl
        onValueChange={(value) => set({ theme: value as 'default' | 'sunset' })}
        options={[
          { label: 'Sunset', value: 'sunset' },
          { label: 'Default', value: 'default' }
        ]}
        value={theme ?? 'sunset'}
      />
```

- [ ] **Step 2: Build**

Run: `pnpm build`
Expected: `✓ built`.

- [ ] **Step 3: Manual verify**

Toggle Sunset/Default in Settings. Confirm: navbar gradient vs solid, window edges appear/disappear, rows glass vs solid, footer glass vs solid, search input glass vs bordered. Toggle dark mode in each theme — both must read clean.

---

### Task 8: Full test + build gate

- [ ] **Step 1: Run the full renderer/main test suite**

Run: `pnpm exec vitest run`
Expected: all PASS (Claude usage + format + settings tests).

- [ ] **Step 2: Production build**

Run: `pnpm build`
Expected: `✓ built`, no type errors.

- [ ] **Step 3: Commit** (only if user asked)

```bash
git add src/renderer/App.tsx src/renderer/components/AppNavbar/AppNavbar.tsx src/renderer/components/AppNavbar/SearchInput.tsx src/renderer/components/ClaudeUsage/ClaudeFooter.tsx src/renderer/components/GroupCollapse/GroupCollapse.tsx src/renderer/components/Project/components/CheckoutCard/CheckoutCard.tsx src/renderer/components/Project/components/Error/Error.tsx src/renderer/components/Project/components/PullRequest/PullRequest.tsx src/renderer/components/Project/components/Workflow/Workflow.tsx src/renderer/components/SettingsAppearance/SettingsAppearance.tsx
git commit -m "feat: theme switch between Sunset and Default"
```

---

## Self-Review

- **Coverage:** setting (T1), app chrome (T2), navbar (T3), search (T4), footer (T5), rows (T6), UI control (T7), gate (T8). Every Sunset styling site from `git diff main` + working tree is covered.
- **Type consistency:** `theme: 'default' | 'sunset'` and `useIsSunset` used identically in all tasks.
- **Placeholders:** none — every class string is the literal original or literal glass value.
- **Grey-color note (screenshot):** the muddy grey tag/chip request in the screenshot is NOT part of theming; tracked separately, not in this plan.

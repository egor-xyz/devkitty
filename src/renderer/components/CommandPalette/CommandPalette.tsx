import { Classes, Icon, Menu, MenuDivider, MenuItem } from '@blueprintjs/core';
import { type IconName } from '@blueprintjs/icons';
import { Omnibar } from '@blueprintjs/select';
import { type FC, Fragment, useEffect, useMemo, useState } from 'react';
import { useIsSunset } from 'renderer/hooks/useAppSettings';
import { useCommandPalette } from 'renderer/hooks/useCommandPalette';
import { useDarkMode } from 'renderer/hooks/useDarkMode';
import { useFocus } from 'renderer/hooks/useFocus';
import { toEnglishLayout } from 'renderer/utils/keyboardLayout';

import { type CommandItem } from './types';
import { useCommands } from './useCommands';

// Synthetic tiles shown at the top level of the palette (empty query, no group
// drilled into): the category tiles, plus a "clear selection" row when a repo
// or worktree is focused. Section is a free string so these can sit under their
// own dividers ("Categories", "Selection") ahead of the real command sections.
type GroupItem = {
  active?: boolean;
  closeOnPerform?: boolean;
  icon?: IconName;
  id: string;
  keywords?: string;
  perform: () => void;
  section: string;
  subtitle?: string;
  title: string;
};

type PaletteItem = CommandItem | GroupItem;

const CommandOmnibar = Omnibar.ofType<PaletteItem>();

// Fixed display order for the top-level category list; any section not
// listed here (none exist today, but keeps this future-proof) is appended in
// first-seen order.
const SECTION_ORDER: CommandItem['section'][] = [
  'Appearance',
  'Integrations',
  'GitHub',
  'Projects',
  'Worktrees',
  'Navigation',
];

const SECTION_ICONS: Record<string, IconName> = {
  Appearance: 'style',
  GitHub: 'git-repo',
  Integrations: 'application',
  Navigation: 'link',
  Projects: 'projects',
  Worktrees: 'git-branch',
};

const buildGroupItems = (allItems: CommandItem[], setGroup: (section: string) => void): GroupItem[] => {
  const counts = new Map<string, number>();
  const order: string[] = [];

  allItems.forEach((item) => {
    counts.set(item.section, (counts.get(item.section) ?? 0) + 1);

    if (!order.includes(item.section)) order.push(item.section);
  });

  const sections = [
    ...SECTION_ORDER.filter((section) => counts.has(section)),
    ...order.filter((section) => !SECTION_ORDER.includes(section as CommandItem['section'])),
  ];

  return sections.map((section) => {
    const count = counts.get(section) ?? 0;

    return {
      closeOnPerform: false,
      icon: SECTION_ICONS[section] ?? 'folder-close',
      id: `group-${section}`,
      perform: () => setGroup(section),
      section: 'Categories',
      subtitle: `${count} item${count === 1 ? '' : 's'}`,
      title: section,
    };
  });
};

const filterCommand = (query: string, item: PaletteItem) => {
  const normalizedQuery = query.toLowerCase();
  const haystack = [item.title, item.subtitle, item.keywords, item.section]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  // Also match what the same physical keys type on a US layout, so search works
  // no matter which keyboard layout is active.
  return haystack.includes(normalizedQuery) || haystack.includes(toEnglishLayout(normalizedQuery));
};

export const CommandPalette: FC = () => {
  const close = useCommandPalette((state) => state.close);
  const isOpen = useCommandPalette((state) => state.isOpen);
  const clearFocus = useFocus((state) => state.clearFocus);
  const focusedProjectId = useFocus((state) => state.focusedProjectId);
  const allItems = useCommands();
  const { darkMode } = useDarkMode();
  const isSunset = useIsSunset();
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<null | string>(null);

  // Start every open with an empty search box and back at the top level.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setGroup(null);
    }
  }, [isOpen]);

  // A focused repo/worktree gets a "clear selection" row so the palette can
  // undo the focus, shown first — above the category tiles.
  const clearItem: GroupItem = {
    icon: 'cross',
    id: 'clear-selection',
    perform: clearFocus,
    section: 'Selection',
    subtitle: 'Show everything',
    title: 'Clear selection',
  };

  // Drill-down: an empty query with no group shows the clear row (when focused)
  // then one synthetic tile per section; picking one narrows to that section;
  // typing anything searches flat across every item regardless of the group.
  // Memoised so the array reference only changes when the visible list does —
  // allItems is already reference-stable, so a background poll that leaves the
  // list unchanged won't hand Blueprint a new array and snap the highlight back
  // to the top mid-navigation.
  const displayItems: PaletteItem[] = useMemo(
    () =>
      query.trim() !== ''
        ? allItems
        : group !== null
          ? allItems.filter((item) => item.section === group)
          : [...(focusedProjectId ? [clearItem] : []), ...buildGroupItems(allItems, setGroup)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [allItems, focusedProjectId, group, query]
  );

  // Omnibar portals to document.body, outside the App root that carries the
  // theme classes, so the theme must be mirrored onto the Omnibar itself or it
  // renders in the default (light) Blueprint theme.
  const themeClassName =
    [darkMode && Classes.DARK, isSunset && 'theme-sunset'].filter(Boolean).join(' ') || undefined;

  // Global ⌘K listener: must work even while another input (e.g. the ⌘F
  // search field) is focused, so this is a document-level keydown rather than
  // an input-scoped handler. Read the store via getState() so `toggle` stays
  // out of the dependency array and the listener is registered exactly once.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        useCommandPalette.getState().toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <CommandOmnibar
      className={themeClassName}
      inputProps={{
        onKeyDown: (event) => {
          if (event.key === 'Backspace' && query === '' && group !== null) {
            event.preventDefault();
            setGroup(null);
          }
        },
        placeholder:
          group !== null && query === '' ? `${group} — Backspace to go back` : 'Search settings and repos…',
      }}
      isOpen={isOpen}
      itemListRenderer={({ filteredItems, itemsParentRef, menuProps, renderItem }) => {
        if (filteredItems.length === 0) {
          return (
            <Menu
              id={menuProps?.id}
              ulRef={itemsParentRef}
            >
              <MenuItem
                disabled
                roleStructure="listoption"
                text="No results."
              />
            </Menu>
          );
        }

        const sections: string[] = [];
        const bySection = new Map<string, { index: number; item: PaletteItem }[]>();

        filteredItems.forEach((item, index) => {
          if (!bySection.has(item.section)) {
            bySection.set(item.section, []);
            sections.push(item.section);
          }

          bySection.get(item.section)?.push({ index, item });
        });

        return (
          <Menu
            id={menuProps?.id}
            ulRef={itemsParentRef}
          >
            {sections.map((section) => (
              <Fragment key={section}>
                <MenuDivider title={section} />
                {bySection.get(section)?.map(({ index, item }) => renderItem(item, index))}
              </Fragment>
            ))}
          </Menu>
        );
      }}
      itemPredicate={filterCommand}
      itemRenderer={(item, { handleClick, index, modifiers: { active, disabled } }) => (
        <MenuItem
          active={active}
          disabled={disabled}
          icon={item.icon}
          key={item.id ?? index}
          label={item.subtitle}
          labelElement={
            item.active ? (
              <Icon
                icon="small-tick"
                intent="primary"
              />
            ) : undefined
          }
          onClick={handleClick}
          roleStructure="listoption"
          // Blueprint's index-based auto-scroll gets thrown off by the
          // MenuDivider elements injected between sections, so scroll the
          // active item into view directly instead of trusting it.
          text={
            active ? (
              <span ref={(el) => el?.scrollIntoView({ block: 'nearest' })}>{item.title}</span>
            ) : (
              item.title
            )
          }
        />
      )}
      items={displayItems}
      // Toggling an item rebuilds the list with fresh objects; without an
      // identity check the active row is no longer reference-equal and the
      // highlight snaps back to the top. Match by id so it stays put.
      itemsEqual={(a, b) => a.id === b.id}
      onClose={close}
      onItemSelect={(item) => {
        // The controlled active item can be a stale object from before a toggle
        // rebuilt the list, whose perform() closes over old state. Re-fetch the
        // current row by id so the action always runs against live state.
        const current = displayItems.find(({ id }) => id === item.id) ?? item;
        current.perform();

        if (current.closeOnPerform !== false) {
          close();
        }
      }}
      onQueryChange={setQuery}
      query={query}
    />
  );
};

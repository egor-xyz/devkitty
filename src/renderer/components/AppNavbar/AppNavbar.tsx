import { Button, ButtonGroup, Classes, Icon, Navbar, Popover, Tooltip } from '@blueprintjs/core';
import clsx from 'clsx';
import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import Devkitty from 'renderer/assets/devkitty.svg?react';
import { useAppSettings, useIsSunset } from 'renderer/hooks/useAppSettings';
import { useClaudeUsage } from 'renderer/hooks/useClaudeUsage';
import { useDarkMode } from 'renderer/hooks/useDarkMode';
import { useFilter } from 'renderer/hooks/useFilter';
import { useProjects } from 'renderer/hooks/useProjects';
import { appToaster } from 'renderer/utils/appToaster';
import { cn } from 'renderer/utils/cn';
import { formatBytes } from 'renderer/utils/formatBytes';
import { requestRefresh } from 'renderer/utils/refresh';
import { type DownscaleResult } from 'types/clipboard';

import { ClaudeMark } from '../ClaudeUsage';
import { ShinyText } from '../ShinyText';
import { PinIcon, SettingsGearIcon } from './NavIcons';
import { SearchInput } from './SearchInput';

const ClipboardDownscaleDetail = ({ enabled, last }: { enabled: boolean; last: DownscaleResult | null }) => (
  <div className="w-[268px] p-4 text-bp-dark-gray-1 dark:text-bp-light-gray-5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <Icon
          color={enabled ? '#F5854A' : undefined}
          icon="media"
          size={16}
        />

        <span className="text-sm font-semibold">Clipboard downscale</span>
      </div>

      <span
        className="shrink-0 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-bp-gray-1 dark:bg-white/10 dark:text-white/85"
        style={enabled ? { color: '#F5854A' } : undefined}
      >
        {enabled ? 'ON' : 'OFF'}
      </span>
    </div>

    <p
      className="text-xs leading-snug text-bp-gray-1 dark:text-bp-gray-4"
      style={{ marginTop: 14 }}
    >
      Watches for screenshots while on. A screenshot wider or taller than 1200 px is shrunk to 1200 px and re-copied
      as PNG, so pasting into Claude Code costs fewer tokens. Photos, small images and text are left alone.
    </p>

    <div className="mt-3.5 border-t border-bp-light-gray-2 pt-3 dark:border-bp-dark-gray-3">
      {last ? (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-bp-gray-3">Last optimized</span>

          <div className="flex items-center gap-2">
            <div className="flex flex-1 flex-col gap-1 text-xs tabular-nums">
              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-bp-gray-3">From</span>
                <span className="text-bp-gray-1 dark:text-bp-gray-4">
                  {last.from.width}×{last.from.height} · {formatBytes(last.bytes.from)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-8 shrink-0 text-bp-gray-3">To</span>
                <span className="font-medium">
                  {last.to.width}×{last.to.height} · {formatBytes(last.bytes.to)}
                </span>
              </div>
            </div>

            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
              style={{ backgroundColor: 'rgba(245,133,74,0.15)', color: '#F5854A' }}
            >
              −{Math.round((1 - last.bytes.to / last.bytes.from) * 100)}%
            </span>
          </div>
        </div>
      ) : (
        <span className="text-[11px] leading-snug text-bp-gray-2 dark:text-bp-gray-3">
          {enabled ? 'Watching — nothing downscaled yet.' : 'Click to turn on.'}
        </span>
      )}
    </div>
  </div>
);

export const AppNavbar = () => {
  const { themeSource, toggleDarkMode } = useDarkMode();
  const { claudeEnabled, clipboardDownscale, set, showClaudeUsage, showLogo } = useAppSettings();
  const isSunset = useIsSunset();
  const claudeInstalled = useClaudeUsage((s) => s.detection.installed);
  const { addProject } = useProjects();
  const { clear, query, setQuery } = useFilter();
  const searchRef = useRef<HTMLInputElement>(null);
  const onHome = useLocation().pathname === '/';
  const [alwaysOnTop, setAlwaysOnTop] = useState(false);
  const [lastDownscale, setLastDownscale] = useState<DownscaleResult | null>(null);

  // Reflect the window's real pinned state on mount (it survives across
  // reloads within a session).
  useEffect(() => {
    window.bridge.window.getAlwaysOnTop().then(setAlwaysOnTop);
  }, []);

  const toggleAlwaysOnTop = async () => {
    const target = !alwaysOnTop;
    setAlwaysOnTop(target); // optimistic — instant feedback on the icon
    const next = await window.bridge.window.setAlwaysOnTop(target);
    setAlwaysOnTop(next);
  };

  // Toast whenever the main process shrinks a clipboard image, wherever the
  // toggle was flipped from.
  useEffect(
    () =>
      window.bridge.clipboard.onDownscaled((result: DownscaleResult) => {
        const { bytes, from, to } = result;
        setLastDownscale(result);
        const saved = bytes.from > 0 ? Math.round((1 - bytes.to / bytes.from) * 100) : 0;
        appToaster.then((toaster) =>
          toaster.show({
            icon: (
              <Icon
                color="#F5854A"
                icon="media"
                size={16}
              />
            ),
            message: (
              <div className="flex flex-col gap-1 py-0.5">
                <div className="text-sm font-semibold">Image optimized for Claude Code</div>

                <div className="flex items-center gap-2 text-xs tabular-nums opacity-90">
                  <span>
                    {from.width}×{from.height} · {formatBytes(bytes.from)}
                  </span>

                  <Icon
                    className="opacity-60"
                    icon="arrow-right"
                    size={12}
                  />

                  <span className="font-semibold">
                    {to.width}×{to.height} · {formatBytes(bytes.to)}
                  </span>

                  {saved > 0 && (
                    <span className="ml-1 rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F5854A] dark:bg-white/10">
                      −{saved}%
                    </span>
                  )}
                </div>
              </div>
            ),
            timeout: 6000
          })
        );
      }),
    []
  );

  // Leaving the project list drops the filter, so coming back is never
  // silently narrowed by something typed a page ago.
  useEffect(() => {
    if (!onHome) clear();
  }, [clear, onHome]);

  // ⌘F jumps to the filter, Escape drops it — the shortcuts anything with a
  // search field is expected to answer to.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'f') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
      }

      if (event.key === 'Escape' && document.activeElement === searchRef.current) {
        clear();
        searchRef.current?.blur();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [clear]);

  const [refreshing, setRefreshing] = useState(false);

  const refresh = () => {
    // Gentle re-fetch of every card's data, not a full app reload. Spin the
    // icon briefly so the click registers as an action, not a dead button.
    requestRefresh();
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  return (
    <Navbar
      className={cn(
        'app-region-drag select-none !shadow-none overflow-hidden',
        isSunset
          ? 'devkitty-header-grad'
          : '!bg-bp-light-gray-4 dark:!bg-bp-dark-gray-1 dark:border-b dark:border-bp-dark-gray-2'
      )}
    >
      <Navbar.Group className="app-region-no-drag ml-[70px] overflow-hidden">
        <Button
          icon="plus"
          minimal
          onClick={addProject}
        />

        {!isSunset && (
          <div className="navbar-shadow-container hidden dark:block">
            <div className="navbar-shadow" />
          </div>
        )}

        <div
          className={cn(
            'app-region-drag ml-1.5 text-lg select-none pointer-events-none',
            isSunset ? 'dark:text-bp-light-gray-4' : 'dark:-ml-[42px] dark:text-bp-dark-gray-3'
          )}
        >
          <ShinyText text="devkitty" />
        </div>
      </Navbar.Group>

      <Navbar.Group
        align="right"
        className="app-region-no-drag ml-[70px] [&>button+button]:ml-2 [&>button+a]:ml-2"
      >
        {/* Nothing to filter anywhere but the project list. */}
        {onHome && (
          <div className="flex items-center self-center mr-2">
            <SearchInput
              inputRef={searchRef}
              onChange={setQuery}
              onClear={clear}
              value={query}
            />
          </div>
        )}

        <Button
          icon={<Icon className={refreshing ? 'animate-spin' : undefined}
            icon="refresh"
                />}
          minimal
          onClick={refresh}
        />

        <Navbar.Divider />

        <ButtonGroup minimal>
          {claudeInstalled && claudeEnabled && (
            <Tooltip
              compact
              content={showClaudeUsage ? 'Hide Claude Code usage' : 'Show Claude Code usage'}
              hoverOpenDelay={2000}
              placement="bottom"
            >
              <Button
                icon={<ClaudeMark className={showClaudeUsage ? 'text-[#D97757]' : undefined}
                  size={16}
                      />}
                minimal
                onClick={() => set({ showClaudeUsage: !showClaudeUsage })}
              />
            </Tooltip>
          )}

          <Popover
            content={<ClipboardDownscaleDetail
              enabled={clipboardDownscale}
              last={lastDownscale}
                     />}
            hoverOpenDelay={300}
            interactionKind="hover"
            minimal
            placement="bottom"
          >
            <Button
              aria-label="Toggle clipboard downscale"
              icon={<Icon color={clipboardDownscale ? '#F5854A' : undefined}
                icon="media"
                size={16}
                    />}
              minimal
              onClick={() => set({ clipboardDownscale: !clipboardDownscale })}
            />
          </Popover>

          <Tooltip
            compact
            content={alwaysOnTop ? 'Always on top: on' : 'Keep window always on top'}
            hoverOpenDelay={500}
            placement="bottom"
          >
            <Button
              aria-label="Toggle always on top"
              icon={<PinIcon
                size={16}
                style={alwaysOnTop ? { color: '#F5854A' } : undefined}
                    />}
              minimal
              onClick={toggleAlwaysOnTop}
            />
          </Tooltip>

          {themeSource !== 'system' && (
            <Tooltip compact
              content="Toggle dark mode"
              hoverOpenDelay={500}
              placement="bottom"
            >
              <Button
                icon="contrast"
                minimal
                onClick={toggleDarkMode}
              />
            </Tooltip>
          )}

          <NavLink
            className={clsx(Classes.BUTTON, Classes.MINIMAL)}
            to="/settings"
          >
            {({ isActive }) => (
              <SettingsGearIcon
                className={isActive ? 'text-[#F5854A]' : undefined}
                size={16}
              />
            )}
          </NavLink>
        </ButtonGroup>

        {showLogo && (
          <>
            <Navbar.Divider />
            <Devkitty className="h-7 devkitty-logo" />
          </>
        )}
      </Navbar.Group>
    </Navbar>
  );
};

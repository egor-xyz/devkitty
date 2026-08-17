import { Button, Classes, Divider, Label, NumericInput, Switch, Tag } from '@blueprintjs/core';
import { useState } from 'react';
import { useAppSettings } from 'renderer/hooks/useAppSettings';
import { useProjects } from 'renderer/hooks/useProjects';
import { cn } from 'renderer/utils/cn';
import { type HiddenEntry, hiddenPullsPrefix, parseHidden, projectIdOf, removeHidden } from 'renderer/utils/hidden';
import { unhideEvent } from 'renderer/utils/unhide';

type HiddenRow = HiddenEntry & { key: string; projectId: string };

// One row shape for both lists: hidden workflows carry no repo badge, hidden
// pull requests do.
type ListRow = {
  badge?: string;
  label: string;
  onUnhide: () => void;
  rowKey: string;
};

// Hiding one action or pull request is a per-repo, per-session decision kept in
// session storage; this reads it back so each one can be put back by itself.
const hiddenKeys = (prefix: string) => Object.keys(sessionStorage).filter((key) => key.startsWith(prefix));

const readRows = (prefix: string): HiddenRow[] =>
  hiddenKeys(prefix).flatMap((key) =>
    parseHidden(sessionStorage.getItem(key)).map((entry) => ({ ...entry, key, projectId: projectIdOf(key) }))
  );

const readHidden = () => readRows(hiddenPullsPrefix);

export const SettingsActions = () => {
  const { gitHubActions, set } = useAppSettings();
  const { count = 5, ignoreDependabot = false, ignoredWorkflows = [], notifications = true } = gitHubActions;

  const removeIgnored = (name: string) => {
    set({ gitHubActions: { ...gitHubActions, ignoredWorkflows: ignoredWorkflows.filter((w) => w !== name) } });
  };

  const { projects } = useProjects();
  const [hiddenPulls, setHiddenPulls] = useState(readHidden);
  const hiddenCount = ignoredWorkflows.length + hiddenPulls.length;

  // Repo cards hold their hidden sets in state, so clearing storage is not
  // enough — tell them to re-read it.
  const announce = () => {
    setHiddenPulls(readHidden());
    window.dispatchEvent(new Event(unhideEvent));
  };

  const unhideOne = (row: HiddenRow) => {
    const left = removeHidden(parseHidden(sessionStorage.getItem(row.key)), row.id);

    if (left.length === 0) sessionStorage.removeItem(row.key);
    else sessionStorage.setItem(row.key, JSON.stringify(left));

    announce();
  };

  const unhideAll = () => {
    for (const key of hiddenKeys(hiddenPullsPrefix)) sessionStorage.removeItem(key);

    set({ gitHubActions: { ...gitHubActions, ignoredWorkflows: [] } });
    announce();
  };

  // Workflows are stored by path; the file name without its extension is the
  // closest thing to a readable name without another API call.
  const workflowName = (path: string) => path.replace(/^.*\//, '').replace(/\.ya?ml$/, '');

  const projectName = (projectId: string) => projects.find(({ id }) => id === projectId)?.name ?? projectId;

  // Fixed height with its own scrollbar: a long list would otherwise push the
  // rest of the page — and the unhide-all button — out of reach.
  const listBox = (title: string, items: ListRow[]) =>
    items.length > 0 && (
      <>
        <h4 className="text-xs font-semibold mt-4 mb-1.5">
          {title} ({items.length})
        </h4>

        <div
          className={cn(
            'flex flex-col max-h-[180px] overflow-y-auto rounded',
            'border border-bp-light-gray-1 dark:border-bp-dark-gray-4'
          )}
        >
          {items.map((item) => (
            <div
              className={cn(
                'flex items-center gap-2 px-1.5 py-1 shrink-0',
                'not-last:border-b not-last:border-bp-light-gray-2 dark:not-last:border-bp-dark-gray-3'
              )}
              key={item.rowKey}
            >
              <span className="text-xs truncate flex-1 min-w-0">{item.label}</span>
              {item.badge && <Tag minimal>{item.badge}</Tag>}

              <Button
                onClick={item.onUnhide}
                size="small"
                text="Unhide"
                variant="minimal"
              />
            </div>
          ))}
        </div>
      </>
    );

  const workflowRows: ListRow[] = ignoredWorkflows.map((path) => ({
    label: workflowName(path),
    onUnhide: () => removeIgnored(path),
    rowKey: path
  }));

  const pullRows: ListRow[] = hiddenPulls.map((row) => ({
    badge: projectName(row.projectId),
    label: row.label,
    onUnhide: () => unhideOne(row),
    rowKey: `${row.key}-${row.id}`
  }));

  return (
    <div className="select-none p-4">
      <h2 className="text-xl font-semibold mb-1">GitHub</h2>
      <Divider />
      <h3 className="text-sm font-semibold mt-4 mb-2.5">Actions</h3>

      <Label>
        Amount of actions to show on the main branch
        <NumericInput
          max={50}
          min={1}
          onValueChange={(value) => set({ gitHubActions: { ...gitHubActions, count: value } })}
          value={count}
        />
      </Label>

      <br />

      <Switch
        checked={notifications}
        label="Show macOS notifications when actions complete"
        onChange={() => set({ gitHubActions: { ...gitHubActions, notifications: !notifications } })}
      />

      <Switch
        checked={ignoreDependabot}
        label="Ignore Dependabot"
        onChange={() => set({ gitHubActions: { ...gitHubActions, ignoreDependabot: !ignoreDependabot } })}
      />

      <Divider />

      <div className="flex items-center justify-between gap-3 mt-4 mb-2.5">
        <h3 className="text-sm font-semibold">Hidden</h3>

        {hiddenCount > 0 && (
          <Button
            icon="eye-open"
            onClick={unhideAll}
            size="small"
            text={`Unhide all (${hiddenCount})`}
            variant="minimal"
          />
        )}
      </div>

      {hiddenCount === 0 && (
        <div className={cn('text-xs', Classes.TEXT_MUTED)}>
          Nothing is hidden. Hiding a workflow, or a single pull request, lists it here.
        </div>
      )}

      {listBox('Hidden workflows', workflowRows)}
      {listBox('Hidden pull requests', pullRows)}
    </div>
  );
};

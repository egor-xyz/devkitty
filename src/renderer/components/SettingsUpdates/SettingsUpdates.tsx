import { Switch } from '@blueprintjs/core';
import { useAppSettings } from 'renderer/hooks/useAppSettings';

export const SettingsUpdates = () => {
  const { autoUpdate, set } = useAppSettings();

  return (
    <div className="select-none">
      <h2 className="text-[18px] leading-6 font-semibold">Updates</h2>

      <div className="mt-5">
        <Switch
          checked={autoUpdate ?? true}
          className="!mb-0"
          label="Auto update"
          onChange={() => set({ autoUpdate: !(autoUpdate ?? true) })}
        />

        <p className="mt-1.5 text-[13px] leading-[19px] text-bp-gray-1 dark:text-bp-gray-4">
          Download updates in the background. You choose when to restart. Turn this off to download with Update in the footer.
        </p>
      </div>
    </div>
  );
};

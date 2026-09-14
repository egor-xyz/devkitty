import { Switch } from '@blueprintjs/core';
import { useState } from 'react';

// The preload reads this flag at startup, so a change must reload the window.
const readDemo = () => {
  try {
    return localStorage.getItem('dk-demo') === '1';
  } catch {
    return false;
  }
};

export const SettingsDeveloper = () => {
  const [demoMode] = useState(readDemo);
  const toggleDemo = () => {
    try {
      localStorage.setItem('dk-demo', demoMode ? '0' : '1');
    } catch {
      /* ignore */
    }
    location.reload();
  };

  return (
    <div className="select-none">
      <h2 className="text-[18px] leading-6 font-semibold">Developer</h2>

      <div className="mt-5">
        <Switch
          checked={demoMode}
          className="!mb-0"
          label="Demo mode"
          onChange={toggleDemo}
        />

        <p className="mt-1.5 text-[13px] leading-[19px] text-bp-gray-1 dark:text-bp-gray-4">Dev only. Reloads the window. Never available in a production build.</p>
      </div>
    </div>
  );
};

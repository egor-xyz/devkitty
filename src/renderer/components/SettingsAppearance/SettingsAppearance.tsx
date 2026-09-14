import { StyleSelector } from '../StyleSelector';
import { ThemeSelector } from '../ThemeSelector';

export const SettingsAppearance = () => (
  <div className="select-none">
    <h2 className="text-[18px] leading-6 font-semibold">Appearance</h2>

    <div className="mt-5 space-y-6">
      <div>
        <h3 className="text-sm leading-5 font-semibold">Color Theme</h3>
        <p className="mt-1.5 mb-3 text-[13px] leading-[19px] text-bp-gray-1 dark:text-bp-gray-4">Choose the app colors. The system theme follows your Mac.</p>
        <ThemeSelector />
      </div>

      <div>
        <h3 className="text-sm leading-5 font-semibold">Style</h3>
        <p className="mt-1.5 mb-3 text-[13px] leading-[19px] text-bp-gray-1 dark:text-bp-gray-4">Choose the look of app windows and cards.</p>
        <StyleSelector />
      </div>
    </div>
  </div>
);

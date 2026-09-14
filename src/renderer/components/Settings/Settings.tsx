import { Button, Icon } from '@blueprintjs/core';
import { type ComponentType, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useIsSunset } from 'renderer/hooks/useAppSettings';
import { cn } from 'renderer/utils/cn';

import { SettingsActions } from '../SettingsActions';
import { SettingsAppearance } from '../SettingsAppearance';
import { SettingsDeveloper } from '../SettingsDeveloper';
import { SettingsIntegrations } from '../SettingsIntegrations';
import { SettingsUpdates } from '../SettingsUpdates';

type SettingsSection = {
  component: ComponentType;
  icon: React.ComponentProps<typeof Icon>['icon'];
  id: SettingsSectionId;
  title: string;
};

type SettingsSectionId = 'appearance' | 'developer' | 'github' | 'integrations' | 'updates';

const sections: SettingsSection[] = [
  {
    component: SettingsAppearance,
    icon: 'style',
    id: 'appearance',
    title: 'Appearance'
  },
  {
    component: SettingsUpdates,
    icon: 'download',
    id: 'updates',
    title: 'Updates'
  },
  {
    component: SettingsIntegrations,
    icon: 'data-lineage',
    id: 'integrations',
    title: 'Integrations'
  },
  {
    component: SettingsActions,
    icon: 'code',
    id: 'github',
    title: 'GitHub'
  },
  ...(import.meta.env.DEV ? [{
    component: SettingsDeveloper,
    icon: 'cog' as const,
    id: 'developer' as const,
    title: 'Developer'
  }] : [])
];

export const Settings = () => {
  const { id } = useParams<{ id?: SettingsSectionId }>();
  const navigate = useNavigate();
  const isSunset = useIsSunset();
  const [activeId, setActiveId] = useState<SettingsSectionId>(id && sections.some((section) => section.id === id) ? id : 'appearance');
  const [versionLabel, setVersionLabel] = useState('');
  const holdActiveUntilUserScroll = useRef(false);

  useEffect(() => {
    let mounted = true;
    window.bridge.settings.getVersion()
      .then((version) => {
        if (mounted) setVersionLabel(version);
      })
      .catch(() => {
        if (mounted) setVersionLabel('');
      });
    return () => { mounted = false; };
  }, []);

  const scrollToSection = (sectionId: SettingsSectionId) => {
    holdActiveUntilUserScroll.current = true;
    document.getElementById(`settings-section-${sectionId}`)?.scrollIntoView({ behavior: 'auto', block: 'start' });
  };

  useEffect(() => {
    if (id && sections.some((section) => section.id === id)) {
      setActiveId(id);
      scrollToSection(id);
    }
  }, [id]);

  const handleContentScroll = (scrollArea: HTMLElement) => {
    if (holdActiveUntilUserScroll.current) return;
    if (scrollArea.scrollTop <= 1) {
      setActiveId(sections[0].id);
      return;
    }
    if (scrollArea.scrollHeight > scrollArea.clientHeight &&
      scrollArea.scrollTop + scrollArea.clientHeight >= scrollArea.scrollHeight - 1) {
      setActiveId(sections[sections.length - 1].id);
      return;
    }

    const activationLine = scrollArea.getBoundingClientRect().top + Math.min(120, scrollArea.clientHeight * 0.25);
    let current = sections[0].id;
    for (const section of sections) {
      const node = document.getElementById(`settings-section-${section.id}`);
      if (!node) continue;
      if (node.getBoundingClientRect().top > activationLine) break;
      current = section.id;
    }
    setActiveId(current);
  };

  const selectSection = (sectionId: SettingsSectionId) => {
    setActiveId(sectionId);
    if (id === sectionId) {
      scrollToSection(sectionId);
    } else {
      navigate(`/settings/${sectionId}`);
    }
  };

  return (
    <div className={cn('settings-root relative h-[calc(100vh-50px-var(--claude-footer-h))]', isSunset && 'theme-sunset')}>
      <Button aria-label="Close settings"
        className="settings-close"
        icon="cross"
        minimal
        onClick={() => navigate('/')}
      />

      <div className="settings-layout">
        <nav aria-label="Settings sections"
          className="settings-sidebar"
        >
          {sections.map((section) => (
            <button
              aria-current={activeId === section.id ? 'location' : undefined}
              className="settings-sidebar-link"
              key={section.id}
              onClick={() => selectSection(section.id)}
              type="button"
            >
              <Icon icon={section.icon} />
              <span>{section.title}</span>
            </button>
          ))}

          <div className="settings-version">{versionLabel}</div>
        </nav>

        <main aria-label="Settings"
          className="settings-content"
          onKeyDown={() => { holdActiveUntilUserScroll.current = false; }}
          onPointerDown={() => { holdActiveUntilUserScroll.current = false; }}
          onScroll={(event) => handleContentScroll(event.currentTarget)}
          onTouchStart={() => { holdActiveUntilUserScroll.current = false; }}
          onWheel={() => { holdActiveUntilUserScroll.current = false; }}
        >
          <div className="settings-content-inner">
            {sections.map((section) => {
              const Component = section.component;
              return (
                <section aria-label={section.title}
                  className="settings-section"
                  id={`settings-section-${section.id}`}
                  key={section.id}
                >
                  <Component />
                </section>
              );
            })}
          </div>
        </main>
      </div>
    </div>
  );
};

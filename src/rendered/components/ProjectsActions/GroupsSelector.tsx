import { Colors } from '@blueprintjs/colors';

import { useAppSettings } from 'rendered/hooks/useAppSettings';
import { useGroups } from 'rendered/hooks/useGroups';

import { GroupsControl, OldSchoolButton, OldSchoolWrapper, Root, StyledIcon, Title } from './GroupsSelector.styles';
import click from './assets/click.mp3';
import playSwitch from './assets/switch.mp3';

const volume = 0.2;

export const GroupsSelector = () => {
  const projectActionCollapsed = useAppSettings(({ projectActionCollapsed }) => projectActionCollapsed);
  const { groupsWithAliases, toggleSelected, selectAll, unselectAll, selectedGroups } = useGroups();
  const soundEffects = useAppSettings(({ soundEffects }) => soundEffects);

  // all groups are selected
  const allSelected = groupsWithAliases.length === selectedGroups.length;

  const select = (id: string) => {
    if (soundEffects) {
      const audio = new Audio(click);
      audio.volume = volume;
      audio.play();
    }
    toggleSelected(id);
  };

  const toggleAll = () => {
    if (soundEffects) {
      const audio = new Audio(playSwitch);
      audio.volume = volume;
      audio.play();
    }
    allSelected ? unselectAll() : selectAll();
  };

  //TODO: tmp fix for groups if they not array
  const validGroups = Array.isArray(selectedGroups) ? selectedGroups : [];

  return (
    <Root $collapsed={projectActionCollapsed}>
      <GroupsControl>
        <Title>Groups</Title>

        <OldSchoolWrapper>
          {groupsWithAliases.map(({ name, id, icon }) => (
            <OldSchoolButton
              $active={validGroups.includes(id)}
              key={id}
              onClick={() => select(id)}
            >
              <StyledIcon
                color={validGroups.includes(id) ? Colors.RED3 : Colors.DARK_GRAY5}
                icon={icon}
              />
              {name}
            </OldSchoolButton>
          ))}

          <OldSchoolButton
            $active={allSelected}
            onClick={toggleAll}
          >
            <StyledIcon
              color={allSelected ? Colors.RED3 : Colors.DARK_GRAY5}
              icon="swap-vertical"
            />
            <b>Switch</b>
          </OldSchoolButton>
        </OldSchoolWrapper>
      </GroupsControl>
    </Root>
  );
};

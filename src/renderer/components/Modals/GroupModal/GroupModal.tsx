import { Button, Classes, Dialog, DialogBody, InputGroup } from '@blueprintjs/core';
import { type ChangeEventHandler, type FC, useEffect, useState } from 'react';
import { useGroups } from 'renderer/hooks/useGroups';
import { useProjects } from 'renderer/hooks/useProjects';
import { appToaster } from 'renderer/utils/appToaster';
import { type Group } from 'types/Group';
import { type ModalProps } from 'types/Modal';
import { v4 } from 'uuid';

export type GroupModalProps = {
  group?: Group;
  projectId?: string;
};

export const GroupModal: FC<GroupModalProps & ModalProps> = ({ darkMode, group, isOpen, onClose, projectId }) => {
  const { addGroup, groups, renameGroup } = useGroups();
  const [name, setName] = useState<Group['name']>(group?.name ?? '');
  const [error, setError] = useState<string>();
  const { addGroupId } = useProjects();

  const isEditing = Boolean(group);
  const title = isEditing ? 'Edit group' : 'Add group';
  const actionText = isEditing ? 'Save' : 'Add';

  useEffect(() => {
    if (group) {
      setName(group.name);
    }
  }, [group]);

  const handleChange: ChangeEventHandler<HTMLInputElement> = ({ target: { value } }) => {
    if (error) setError(undefined);

    const isDuplicate = groups.some(
      (g) => g.name.toLowerCase() === value.toLowerCase() && g.id !== group?.id
    );
    if (isDuplicate) {
      setError('Group name already exists');
    }

    setName(value);
  };

  const handleSave = async () => {
    setError(undefined);

    if (!name) {
      setError('Group name is required');
      return;
    }

    const isDuplicate = groups.some(
      (g) => g.name.toLowerCase() === name.toLowerCase() && g.id !== group?.id
    );
    if (isDuplicate) {
      setError('Group name already exists');
      return;
    }

    if (isEditing && group) {
      renameGroup(group.id, name);
      (await appToaster).show({
        intent: 'success',
        message: `Group renamed to "${name}"`
      });
    } else {
      const newGroup: Group = {
        fullName: name,
        id: v4(),
        name
      };

      addGroup(newGroup);
      if (projectId) {
        addGroupId(projectId, newGroup.id);
      }

      (await appToaster).show({
        intent: 'success',
        message: `Group "${name}" added`
      });
    }

    onClose();
  };

  return (
    <Dialog
      className={`max-w-[250px] ${darkMode && Classes.DARK}`}
      icon="group-item"
      isOpen={isOpen}
      onClose={onClose}
      title={title}
    >
      <DialogBody>
        <InputGroup
          autoFocus
          intent={error ? 'danger' : 'none'}
          onChange={handleChange}
          placeholder="group name..."
          value={name}
        />

        <div className="flex items-center mt-2.5 justify-between flex-row-reverse">
          <Button
            intent="warning"
            onClick={handleSave}
            text={actionText}
          />

          {error && <div className="text-red-500 text-xs">{error}</div>}
        </div>
      </DialogBody>
    </Dialog>
  );
};

import { Button, Classes, Dialog, DialogBody, InputGroup } from '@blueprintjs/core';
import { type ChangeEventHandler, type FC, useState } from 'react';
import { useGroups } from 'renderer/hooks/useGroups';
import { useProjects } from 'renderer/hooks/useProjects';
import { appToaster } from 'renderer/utils/appToaster';
import { type Group } from 'types/Group';
import { type ModalProps } from 'types/Modal';
import { v4 } from 'uuid';

export type GroupModalProps = {
  groupId?: string;
  projectId?: string;
};

export const GroupModal: FC<GroupModalProps & ModalProps> = ({ darkMode, groupId, isOpen, onClose, projectId }) => {
  const { addGroup, groups } = useGroups();
  const [name, setName] = useState<Group['name']>('');
  const [error, setError] = useState<string>();
  const { addGroupId } = useProjects();

  const title = groupId ? 'Edit group' : 'Add group';
  const actionText = groupId ? 'Save' : 'Add';

  const handleChange: ChangeEventHandler<HTMLInputElement> = ({ target: { value } }) => {
    if (error) setError(undefined);

    if (groups.some((group) => group.name.toLowerCase() === value.toLowerCase())) {
      setError('Group name already exists');
    }

    setName(value);
  };

  const handleSave = async () => {
    setError(undefined);

    if (!name || groups.some((group) => group.name.toLowerCase() === name.toLowerCase())) {
      setError('Group name already exists');
      return;
    }

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

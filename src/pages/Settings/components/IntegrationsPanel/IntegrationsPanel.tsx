import { FC, useEffect, useMemo, useState } from 'react';
import { Button, MenuItem } from '@blueprintjs/core';
import { Select } from '@blueprintjs/select';
import clsx from 'clsx';

import { useAppStore, useAppStoreDispatch } from 'context';
import { getAvailableEditors, getAvailableShells, IFoundEditor } from 'utils';

import css from '../../Settings.module.scss';

const StringSelect = Select.ofType<string>();

export const IntegrationsPanel: FC = () => {
  const { IDE, shell } = useAppStore();
  const dispatch = useAppStoreDispatch();

  const [editors, setEditor] = useState<readonly IFoundEditor<string>[]>([]);
  const [shells, setShells] = useState<readonly IFoundEditor<string>[]>([]);

  const init = async () => {
    const [editors,  shells] = await Promise.all([getAvailableEditors(), getAvailableShells()]);
    setEditor(editors);
    setShells(shells);
  };

  useEffect(() => {
    init();
  }, []);

  return useMemo(() => (
    <div className={css.root}>
      <div className={css.sectionHeader}>External Editor</div>

      <div className={css.sectionDesc}>
        Choose installed external editor
      </div>

      <StringSelect
        activeItem={IDE}
        disabled={!editors.length}
        filterable={false}
        itemRenderer={(editor, { modifiers: { active }, handleClick }) => (
          <MenuItem
            active={active}
            key={editor}
            text={editor}
            onClick={handleClick}
          />
        )}
        items={editors.map(({ editor })=> editor )}
        popoverProps={{
          position: 'bottom'
        }}
        onItemSelect={editor => {
          dispatch({ payload: editor, type: 'setIDE' });
        }}
      >
        <Button
          className={css.btn}
          disabled={!editors.length}
          rightIcon='chevron-down'
          text={IDE ?? 'Choose IDE'}
        />
      </StringSelect>

      <div className={clsx(css.sectionHeader, css.mtSections )}>Shell</div>
      <div className={css.sectionDesc}>
        Choose installed shell
      </div>

      <StringSelect
        activeItem={shell}
        disabled={!shells.length}
        filterable={false}
        itemRenderer={(editor, { modifiers: { active }, handleClick }) => (
          <MenuItem
            active={active}
            key={editor}
            text={editor}
            onClick={handleClick}
          />
        )}
        items={shells.map(({ editor })=> editor )}
        popoverProps={{
          position: 'bottom'
        }}
        onItemSelect={editor => {
          dispatch({ payload: editor, type: 'setShell' });
        }}
      >
        <Button
          className={css.btn}
          disabled={!shells.length}
          rightIcon='chevron-down'
          text={shell ?? 'Choose Shell'}
        />
      </StringSelect>
    </div>
  ), [IDE, editors, shells, shell]); // eslint-disable-line
};
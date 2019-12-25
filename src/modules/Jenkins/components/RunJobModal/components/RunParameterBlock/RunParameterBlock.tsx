import { ChangeEvent, Dispatch, FC, SetStateAction } from 'react';
import { Divider, Icon, InputGroup, Tooltip } from '@blueprintjs/core';

import { RunParam, RunParams } from 'modules/Jenkins/components/types';

import css from './RunParameterBlock.module.scss';

interface Props {
  index: number;
  runParam: RunParam;
  runParams: RunParams;
  setRunParams: Dispatch<SetStateAction<RunParams>>,
  setTouched: Dispatch<SetStateAction<boolean>>
}

export const RunParameterBlock: FC<Props> = ({ runParam, index, setRunParams, runParams, setTouched }) => {
  const { readonly, warningMessage, defValue, description, name, value } = runParam;

  const updateRunParams = (e: ChangeEvent<HTMLInputElement>) => {
    runParams[index].value = e.target.value ?? '';
    setRunParams([...runParams]);
    setTouched(true);
  };

  return (<>
    <div className={css.root}>
      <div className={css.name}>
        {warningMessage && (
          <Tooltip
            className={css.warning}
            content={warningMessage}
            intent={'warning'}
          >
            <Icon
              icon={'warning-sign'}
              intent={'warning'}
            />
          </Tooltip>
        )}
        <span title={name}>{name}</span>
      </div>
      <Tooltip
        className={css.input}
        content={description}
      >
        <InputGroup
          disabled={readonly}
          leftIcon={'paragraph'}
          placeholder={name}
          value={value || defValue || ''}
          onChange={updateRunParams}
        />
      </Tooltip>
    </div>

    {description && <div className={css.desc}>{description}</div>}

    <Divider />
  </>);
};
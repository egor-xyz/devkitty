import { FC } from 'react';
import clsx from 'clsx';
import { Button, Collapse, Divider, InputGroup } from '@blueprintjs/core';

import { BuildParameter, JenkinsBuild, Parameter } from 'modules/Jenkins/models';
import { msg } from 'utils/Msg';

import css from './AddParameters.module.scss';

interface Props {
  addBuildParameters():void;
  addMode: boolean;
  build: JenkinsBuild;
  buildParameter: BuildParameter;
  onCancel():void;
  parameters: Parameter[];
  setBuildParameter(values: Partial<BuildParameter>):void;
}

export const AddBuildParameter: FC<Props> = ({
  buildParameter, parameters, addBuildParameters, setBuildParameter, addMode, build, onCancel
}) => {

  const addConfiguration = () => {
    if (!buildParameter.name?.trim().length) {
      msg.show({
        icon: 'build',
        intent: 'warning',
        message: 'Please Add Configuration Name',
        timeout: 2000
      });
      return;
    }

    addBuildParameters();
  };

  return (
    <Collapse isOpen={addMode && build.result === 'SUCCESS'}>
      <Divider className={css.divider} />

      <div className={css.addParam} >
        <InputGroup
          leftIcon={'build'}
          placeholder={'Configuration name'}
          required={true}
          rightElement={(
            <Button
              intent={'primary'}
              text={'Add'}
              onClick={addConfiguration}
            />
          )}
          value={buildParameter.name}
          onChange={(e: any) => setBuildParameter({
            name: e.target?.value ?? ''
          })}
        />
        <Button
          className={css.close}
          icon={'cross'}
          small={true}
          onClick={onCancel}
        />
      </div>

      <Divider className={css.divider} />

      <div className={css.paramsTitle}>
        Parameters ({buildParameter.parameters?.length ?? ''})
      </div>

      <div
        className={css.params}
      >
        {parameters.map(({ _class, name, value }) => (
          <div
            className={clsx({ [css.disabled]: _class.includes('Readonly') || _class.includes('Hide') })}
            key={name}
          >
            <div>{name}: <b>{value}</b></div>
            <div className={css.buildClassName}>{_class}</div>
            <Divider />
          </div>
        ))}
      </div>

      <Divider className={css.divider} />
    </Collapse>
  );
};
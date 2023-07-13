import { Button } from '@blueprintjs/core';

import { useAppSettings } from 'rendered/hooks/useAppSettings';

export const GitHub = () => {
  const { auth } = useAppSettings();

  const getCode = async () => {
    const res = await window.bridge.github.getCode();
    console.log(res);
  };

  const login = async () => {
    const res = await window.bridge.github.login();
    console.log(res);
  };

  return (
    <div>
      <h1>GitHub</h1>
      <Button
        text="Get Code"
        onClick={getCode}
      />

      <Button
        text="Login"
        onClick={login}
      />
    </div>
  );
};

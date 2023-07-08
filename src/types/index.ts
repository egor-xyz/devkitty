import { IconName } from '@blueprintjs/icons';

export type ThemeSource = 'system' | 'dark' | 'light';

export type ModalProps = {
  darkMode?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
};

export type Group = {
  fullName: string;
  icon?: IconName;
  id: string;
  name: string;
};

export type Groups = Group[];

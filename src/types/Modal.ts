export type ThemeSource = 'system' | 'dark' | 'light';

export type ModalProps = {
  darkMode?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
};

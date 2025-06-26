export type ModalProps = {
  darkMode?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
};

export type ThemeSource = 'dark' | 'light' | 'system';

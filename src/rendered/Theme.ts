import { Colors } from '@blueprintjs/colors';
import { createGlobalStyle, DefaultTheme } from 'styled-components';

// placeholder for app colors
export const defaultTheme: DefaultTheme = {
  my: '#f0f0f0'
};

export const darkTheme: DefaultTheme = {
  ...defaultTheme,
  my: '#35393e'
};

export const GlobalStyles = createGlobalStyle`
    body {
      background-color: ${Colors.LIGHT_GRAY5};
      @media (prefers-color-scheme: dark) {
        background-color: ${Colors.DARK_GRAY1};
      }
    }
`;

// Focus handling
document.body.classList.add('is-focused');
window.addEventListener('focus', () => {
  document.body.classList.add('is-focused');
});
window.addEventListener('blur', () => {
  document.body.classList.remove('is-focused');
});

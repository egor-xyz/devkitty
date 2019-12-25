module.exports = {
  extends: [
    'react-app',
    '@egor.xyz'
  ],
  globals: {
    JSX: true,
  },
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    'jsx-a11y/anchor-has-content': 'off',
    'react/jsx-no-target-blank': 'off',
    'react-hooks/exhaustive-deps': 'off'
  }
};

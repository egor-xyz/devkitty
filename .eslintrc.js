module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: ['eslint:recommended', 'plugin:import/electron', '@egor.xyz', 'prettier'],
  rules: {
    'import/no-unresolved': 'off',
    'react/react-in-jsx-scope': 'off',
    'react-refresh/only-export-components': 'off'
  }
};

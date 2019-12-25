module.exports = function override (config) {
  config.target = 'electron-renderer';

  // Consolidate chunk files instead
  config.optimization.splitChunks = {
    cacheGroups: {
      default: false
    }
  };
  // Move runtime into bundle instead of separate file
  config.optimization.runtimeChunk = false;

  // JS
  config.output.filename = 'static/js/bundle.js';
  // CSS. "5" is MiniCssPlugin
  config.plugins[5].options.filename = 'static/css/bundle.css';
  config.plugins[5].options.moduleFilename = () => 'static/css/bundle.css';

  return config;
};
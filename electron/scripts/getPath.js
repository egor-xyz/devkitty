const getPath = (filePath = '') => {
  return require('path').join('..', filePath);
};

module.exports = { getPath };
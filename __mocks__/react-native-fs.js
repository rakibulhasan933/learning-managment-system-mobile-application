module.exports = {
  DocumentDirectoryPath: '/tmp/banglabox',
  downloadFile: () => ({ promise: Promise.resolve({ statusCode: 200 }) }),
  unlink: () => Promise.resolve(),
};

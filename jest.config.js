module.exports = {
  preset: '@react-native/jest-preset',
  moduleNameMapper: {
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.js',
    '^react-native-pdf$': '<rootDir>/__mocks__/react-native-pdf.js',
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '^react-native-orientation-locker$': '<rootDir>/__mocks__/react-native-orientation-locker.js',
  },
};

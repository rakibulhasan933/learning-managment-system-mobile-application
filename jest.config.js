module.exports = {
  preset: '@react-native/jest-preset',
  transformIgnorePatterns: [
    'node_modules/(?!((react-native|@react-native|react-native-css-interop|nativewind)/))',
  ],
  moduleNameMapper: {
    '^@react-navigation/native$': '<rootDir>/__mocks__/react-navigation.js',
    '^@react-navigation/native-stack$': '<rootDir>/__mocks__/react-navigation.js',
    '^@react-navigation/bottom-tabs$': '<rootDir>/__mocks__/react-navigation.js',
    '^react-native-fs$': '<rootDir>/__mocks__/react-native-fs.js',
    '^lucide-react-native$': '<rootDir>/__mocks__/lucide-react-native.js',
    '^react-native-orientation-locker$': '<rootDir>/__mocks__/react-native-orientation-locker.js',
  },
};

const React = require('react');

const passthrough = ({ children }) => React.createElement(React.Fragment, null, children);

const createNavigator = () => ({
  Navigator: passthrough,
  Screen: ({ children }) =>
    React.createElement(
      React.Fragment,
      null,
      typeof children === 'function'
        ? children({
            navigation: {
              navigate: jest.fn(),
              goBack: jest.fn(),
              replace: jest.fn(),
            },
            route: { params: {} },
          })
        : children,
    ),
});

module.exports = {
  NavigationContainer: passthrough,
  NavigatorScreenParams: undefined,
  createNativeStackNavigator: createNavigator,
  createBottomTabNavigator: createNavigator,
};

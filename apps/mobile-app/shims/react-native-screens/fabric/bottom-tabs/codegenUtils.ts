// Stub for codegenUtils - used when New Architecture (Fabric) is disabled
export const codegenNativeComponent = <T>(name: string) => {
  const { View } = require('react-native');
  return View as React.ComponentType<T>;
};

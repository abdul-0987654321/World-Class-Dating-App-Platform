import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';

import { store, persistor } from '@store/store';
import RootNavigator from '@navigation/RootNavigator';
import { AuthProvider } from '@hooks/useAuth';
import linking from '@navigation/linking';

const App = () => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <SafeAreaProvider>
            <AuthProvider>
              <NavigationContainer linking={linking}>
                <RootNavigator />
              </NavigationContainer>
            </AuthProvider>
          </SafeAreaProvider>
        </PersistGate>
      </Provider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;

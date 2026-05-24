import React, {useEffect} from 'react';
import {StatusBar, StyleSheet, LogBox} from 'react-native';
import {Provider} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {store, persistor} from '@store';
import AppNavigator from '@navigation/AppNavigator';
import {onAuthStateChanged} from '@services/cloudSync';
import {setUser} from '@store/userSlice';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'new NativeEventEmitter',
]);

const App: React.FC = () => {
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(user => {
      store.dispatch(setUser(user));
    });

    return () => unsubscribe();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <Provider store={store}>
          <PersistGate loading={null} persistor={persistor}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            <AppNavigator />
          </PersistGate>
        </Provider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;

import React, {useEffect, useState, useCallback, ReactNode} from 'react';
import {ActivityIndicator, StyleSheet, View, Text, Linking} from 'react-native';
import {Provider, useDispatch} from 'react-redux';
import {PersistGate} from 'redux-persist/integration/react';
import {NavigationContainer, LinkingOptions} from '@react-navigation/native';
import firebase from '@react-native-firebase/app';
import messaging from '@react-native-firebase/messaging';
import {store, persistor} from '@redux/store';
import {requestNotificationPermission} from '@redux/slices/notificationSlice';
import AppNavigator from '@navigation/AppNavigator';

const linking: LinkingOptions<object> = {
  prefixes: ['fittrackpro://', 'https://fittrackpro.com'],
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: 'home',
          Workout: 'workout',
          Training: 'training',
          Nutrition: 'nutrition',
          Social: 'social',
        },
      },
      Challenge: 'challenge',
      BodyStats: 'bodystats',
      Settings: 'settings',
      Profile: 'profile',
      Subscription: 'subscription',
    },
  },
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{children: ReactNode}, ErrorBoundaryState> {
  constructor(props: {children: ReactNode}) {
    super(props);
    this.state = {hasError: false, error: null};
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {hasError: true, error};
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>发生错误</Text>
          <Text style={styles.errorMessage}>{this.state.error?.message}</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const AppContent = () => {
  const dispatch = useDispatch();
  const [initializing, setInitializing] = useState(true);

  const handleNotificationOpened = useCallback((remoteMessage: any) => {
    if (remoteMessage?.data?.link) {
      Linking.openURL(remoteMessage.data.link);
    }
  }, []);

  const handleForegroundMessage = useCallback((remoteMessage: any) => {
    console.log('Foreground message received:', remoteMessage);
  }, []);

  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    let urlListener: {remove: () => void} | null = null;

    const initializeApp = async () => {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp();
        }

        await dispatch(requestNotificationPermission());

        unsubscribe = messaging().onMessage(handleForegroundMessage);
        messaging().onNotificationOpenedApp(handleNotificationOpened);
        messaging()
          .getInitialNotification()
          .then(handleNotificationOpened);

        urlListener = Linking.addEventListener('url', ({url}) => {
          console.log('Deep link received:', url);
        });

        Linking.getInitialURL().then((url) => {
          if (url) {
            console.log('Initial deep link:', url);
          }
        });

        setInitializing(false);
      } catch (error) {
        console.error('Error initializing app:', error);
        setInitializing(false);
      }
    };

    initializeApp();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
      if (urlListener) {
        urlListener.remove();
      }
    };
  }, [dispatch, handleForegroundMessage, handleNotificationOpened]);

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking} fallback={<ActivityIndicator size="large" color="#4CAF50" />}>
      <AppNavigator />
    </NavigationContainer>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate
          loading={
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
            </View>
          }
          persistor={persistor}>
          <AppContent />
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default App;

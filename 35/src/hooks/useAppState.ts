import { useEffect, useState, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export const useAppState = (): AppStateStatus => {
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return appState;
};

export const useInterval = (
  callback: () => void,
  delay: number | null
): void => {
  useEffect(() => {
    if (delay === null) return;

    const id = setInterval(callback, delay);
    return () => clearInterval(id);
  }, [callback, delay]);
};

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useLocalSearchParams = () => {
  const [params, setParams] = useState<Record<string, string>>({});

  const getParams = useCallback(() => {
    return params;
  }, [params]);

  return { params, getParams };
};

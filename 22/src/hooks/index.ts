import {useState, useEffect, useCallback, useMemo} from 'react';
import {useSelector, useDispatch} from 'react-redux';
import {TimeRemaining, CountdownEvent, SortOption} from '@types';
import {RootState, AppDispatch} from '@store';
import {calculateTimeRemaining, shouldUpdateRepeatingEvent} from '@utils/dateUtils';
import {sortEvents, filterActiveEvents, filterPastEvents, filterArchivedEvents} from '@utils/sortUtils';
import {updateRepeatingEvent} from '@store/eventsSlice';

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T) => useSelector(selector);

export const useCountdown = (targetDate: number, autoUpdate: boolean = true): TimeRemaining => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(targetDate),
  );

  useEffect(() => {
    if (!autoUpdate) return;

    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(targetDate));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate, autoUpdate]);

  return timeRemaining;
};

export const useCountdownEvents = (sortBy: SortOption = 'date') => {
  const dispatch = useAppDispatch();
  const {events, categories} = useAppSelector(state => state.events);

  useEffect(() => {
    events.forEach(event => {
      if (shouldUpdateRepeatingEvent(event)) {
        dispatch(updateRepeatingEvent(event.id));
      }
    });
  }, [events, dispatch]);

  const activeEvents = useMemo(() => {
    const filtered = filterActiveEvents(events);
    return sortEvents(filtered, sortBy, categories);
  }, [events, sortBy, categories]);

  const pastEvents = useMemo(() => {
    const filtered = filterPastEvents(events);
    return sortEvents(filtered, 'date', categories);
  }, [events, categories]);

  const archivedEvents = useMemo(() => {
    const filtered = filterArchivedEvents(events);
    return sortEvents(filtered, 'date', categories);
  }, [events, categories]);

  return {
    events,
    activeEvents,
    pastEvents,
    archivedEvents,
    categories,
  };
};

export const useEvent = (eventId: string | undefined) => {
  const {events, categories} = useAppSelector(state => state.events);

  const event = useMemo(() => {
    if (!eventId) return undefined;
    return events.find(e => e.id === eventId);
  }, [events, eventId]);

  const category = useMemo(() => {
    if (!event) return undefined;
    return categories.find(c => c.id === event.categoryId);
  }, [event, categories]);

  const timeRemaining = useCountdown(event?.targetDate || 0, !!event);

  return {event, category, timeRemaining};
};

export const useCountdownDisplay = (timeRemaining: TimeRemaining, showSeconds: boolean = true) => {
  return useMemo(() => {
    const {days, hours, minutes, seconds, isPast} = timeRemaining;

    const pad = (n: number) => n.toString().padStart(2, '0');

    return {
      days: pad(days),
      hours: pad(hours),
      minutes: pad(minutes),
      seconds: pad(seconds),
      isPast,
      displayText: isPast
        ? `已过 ${days}天 ${pad(hours)}:${pad(minutes)}${showSeconds ? ':' + pad(seconds) : ''}`
        : `剩余 ${days}天 ${pad(hours)}:${pad(minutes)}${showSeconds ? ':' + pad(seconds) : ''}`,
    };
  }, [timeRemaining, showSeconds]);
};

export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

export const useSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const startSearch = useCallback(() => {
    setIsSearching(true);
  }, []);

  const endSearch = useCallback(() => {
    setIsSearching(false);
    setSearchQuery('');
  }, []);

  const debouncedQuery = useDebounce(searchQuery, 300);

  return {
    searchQuery,
    setSearchQuery,
    debouncedQuery,
    isSearching,
    startSearch,
    endSearch,
  };
};

export const useCategoryStats = () => {
  const {events, categories} = useAppSelector(state => state.events);

  const stats = useMemo(() => {
    const activeEvents = filterActiveEvents(events);
    const total = activeEvents.length;

    return categories
      .map(category => {
        const count = activeEvents.filter(e => e.categoryId === category.id).length;
        return {
          category,
          count,
          percentage: total > 0 ? (count / total) * 100 : 0,
          color: category.color,
        };
      })
      .filter(item => item.count > 0);
  }, [events, categories]);

  return stats;
};

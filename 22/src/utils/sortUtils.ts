import {CountdownEvent, SortOption, Category} from '@types';
import {calculateTimeRemaining, shouldUpdateRepeatingEvent} from './dateUtils';

export const sortEvents = (
  events: CountdownEvent[],
  sortBy: SortOption,
  categories: Category[],
): CountdownEvent[] => {
  const sortedEvents = [...events];

  switch (sortBy) {
    case 'date':
      return sortedEvents.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.targetDate - b.targetDate;
      });

    case 'name':
      return sortedEvents.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return a.name.localeCompare(b.name, 'zh-CN');
      });

    case 'category':
      return sortedEvents.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const catA = categories.find(c => c.id === a.categoryId)?.name || '';
        const catB = categories.find(c => c.id === b.categoryId)?.name || '';
        return catA.localeCompare(catB, 'zh-CN');
      });

    case 'remaining':
      return sortedEvents.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const timeA = calculateTimeRemaining(a.targetDate);
        const timeB = calculateTimeRemaining(b.targetDate);
        return Math.abs(timeA.totalSeconds) - Math.abs(timeB.totalSeconds);
      });

    default:
      return sortedEvents;
  }
};

export const filterActiveEvents = (events: CountdownEvent[]): CountdownEvent[] => {
  return events.filter(e => {
    if (e.isArchived) return false;
    if (shouldUpdateRepeatingEvent(e)) return true;
    if (e.repeatInterval !== 'none') return true;
    return e.targetDate > Date.now() - 86400000;
  });
};

export const filterArchivedEvents = (events: CountdownEvent[]): CountdownEvent[] => {
  return events.filter(e => e.isArchived);
};

export const filterPastEvents = (events: CountdownEvent[]): CountdownEvent[] => {
  return events.filter(e => {
    if (e.repeatInterval !== 'none') return false;
    return e.targetDate < Date.now() && !e.isArchived;
  });
};

export const filterUpcomingEvents = (events: CountdownEvent[]): CountdownEvent[] => {
  return events.filter(e => {
    if (e.isArchived) return false;
    if (e.repeatInterval !== 'none') return true;
    return e.targetDate > Date.now();
  });
};

export const searchEvents = (
  events: CountdownEvent[],
  query: string,
  categories: Category[],
): CountdownEvent[] => {
  if (!query.trim()) return events;

  const lowerQuery = query.toLowerCase();
  return events.filter(e => {
    const nameMatch = e.name.toLowerCase().includes(lowerQuery);
    const notesMatch = e.notes?.toLowerCase().includes(lowerQuery);
    const category = categories.find(c => c.id === e.categoryId);
    const categoryMatch = category?.name.toLowerCase().includes(lowerQuery);
    return nameMatch || notesMatch || categoryMatch;
  });
};

export const filterByCategory = (
  events: CountdownEvent[],
  categoryId: string | null,
): CountdownEvent[] => {
  if (!categoryId) return events;
  return events.filter(e => e.categoryId === categoryId);
};

export const getEventsByCategory = (
  events: CountdownEvent[],
  categoryId: string,
): CountdownEvent[] => {
  return events.filter(e => e.categoryId === categoryId);
};

export const getCategoryStats = (
  events: CountdownEvent[],
  categories: Category[],
): Array<{category: Category; count: number; percentage: number}> => {
  const activeEvents = filterActiveEvents(events);
  const total = activeEvents.length;

  return categories.map(category => {
    const count = getEventsByCategory(activeEvents, category.id).length;
    return {
      category,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0,
    };
  }).filter(item => item.count > 0);
};

export const getNextEvent = (events: CountdownEvent[]): CountdownEvent | null => {
  const activeEvents = filterActiveEvents(events);
  if (activeEvents.length === 0) return null;

  return activeEvents.reduce((closest, current) => {
    const closestTime = calculateTimeRemaining(closest.targetDate).totalSeconds;
    const currentTime = calculateTimeRemaining(current.targetDate).totalSeconds;

    if (closestTime <= 0 && currentTime > 0) return current;
    if (currentTime <= 0 && closestTime > 0) return closest;
    if (closestTime <= 0 && currentTime <= 0) {
      return closest.targetDate > current.targetDate ? closest : current;
    }
    return closestTime < currentTime ? closest : current;
  });
};

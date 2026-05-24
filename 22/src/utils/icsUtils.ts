import {CountdownEvent, Category, RepeatInterval} from '@types';
import {generateId} from './dateUtils';

const formatICSDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

const parseICSDate = (icsDate: string): number => {
  const year = parseInt(icsDate.substr(0, 4));
  const month = parseInt(icsDate.substr(4, 2)) - 1;
  const day = parseInt(icsDate.substr(6, 2));
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  if (icsDate.length > 8) {
    const timePart = icsDate.substr(9, 6);
    hours = parseInt(timePart.substr(0, 2));
    minutes = parseInt(timePart.substr(2, 2));
    seconds = parseInt(timePart.substr(4, 2));
  }

  return new Date(year, month, day, hours, minutes, seconds).getTime();
};

const mapRepeatIntervalToRRULE = (interval: RepeatInterval): string => {
  switch (interval) {
    case 'daily':
      return 'FREQ=DAILY';
    case 'weekly':
      return 'FREQ=WEEKLY';
    case 'monthly':
      return 'FREQ=MONTHLY';
    case 'yearly':
      return 'FREQ=YEARLY';
    default:
      return '';
  }
};

const mapRRULEToRepeatInterval = (rrule: string): RepeatInterval => {
  if (rrule.includes('FREQ=DAILY')) return 'daily';
  if (rrule.includes('FREQ=WEEKLY')) return 'weekly';
  if (rrule.includes('FREQ=MONTHLY')) return 'monthly';
  if (rrule.includes('FREQ=YEARLY')) return 'yearly';
  return 'none';
};

export const exportToICS = (events: CountdownEvent[], categories: Category[]): string => {
  let icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Countdown App//ZH//',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ].join('\r\n');

  events.forEach(event => {
    const category = categories.find(c => c.id === event.categoryId);
    const rrule = mapRepeatIntervalToRRULE(event.repeatInterval);

    icsContent += '\r\n' + [
      'BEGIN:VEVENT',
      `UID:${event.id}@countdown.app`,
      `DTSTAMP:${formatICSDate(event.createdAt)}`,
      `DTSTART:${formatICSDate(event.targetDate)}`,
      `DTEND:${formatICSDate(event.targetDate + 3600000)}`,
      `SUMMARY:${event.name}`,
      `DESCRIPTION:${event.notes || ''}`,
      `CATEGORIES:${category?.name || '其他'}`,
      `COLOR:${event.backgroundColor}`,
      rrule ? `RRULE:${rrule}` : '',
      `X-COUNTDOWN-BGCOLOR:${event.backgroundColor}`,
      `X-COUNTDOWN-CATEGORY:${category?.id || ''}`,
      `X-COUNTDOWN-PINNED:${event.isPinned ? 'TRUE' : 'FALSE'}`,
      'END:VEVENT',
    ].filter(Boolean).join('\r\n');
  });

  icsContent += '\r\nEND:VCALENDAR';
  return icsContent;
};

export const importFromICS = (
  icsContent: string,
  existingCategories: Category[],
): {events: CountdownEvent[]; categories: Category[]} => {
  const events: CountdownEvent[] = [];
  const categories: Category[] = [...existingCategories];
  const categoryMap = new Map(categories.map(c => [c.name, c]));

  const lines = icsContent.split(/\r?\n/);
  let i = 0;
  let currentEvent: Partial<CountdownEvent> | null = null;

  while (i < lines.length) {
    const line = lines[i];

    if (line === 'BEGIN:VEVENT') {
      currentEvent = {};
    } else if (line === 'END:VEVENT' && currentEvent) {
      if (currentEvent.targetDate && currentEvent.name) {
        events.push({
          id: generateId(),
          name: currentEvent.name,
          targetDate: currentEvent.targetDate,
          backgroundColor: currentEvent.backgroundColor || '#6366F1',
          categoryId: currentEvent.categoryId || categories[0]?.id || '7',
          repeatInterval: currentEvent.repeatInterval || 'none',
          notes: currentEvent.notes,
          isArchived: false,
          isPinned: currentEvent.isPinned || false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      currentEvent = null;
    } else if (currentEvent) {
      const [key, ...valueParts] = line.split(':');
      const value = valueParts.join(':');
      const cleanKey = key.split(';')[0];

      switch (cleanKey) {
        case 'SUMMARY':
          currentEvent.name = value;
          break;
        case 'DTSTART':
          currentEvent.targetDate = parseICSDate(value);
          break;
        case 'DESCRIPTION':
          currentEvent.notes = value;
          break;
        case 'CATEGORIES':
          const catName = value.split(',')[0];
          if (!categoryMap.has(catName)) {
            const newCategory = {
              id: generateId(),
              name: catName,
              color: '#6B7280',
              createdAt: Date.now(),
            };
            categories.push(newCategory);
            categoryMap.set(catName, newCategory);
          }
          currentEvent.categoryId = categoryMap.get(catName)?.id;
          break;
        case 'RRULE':
          currentEvent.repeatInterval = mapRRULEToRepeatInterval(value);
          break;
        case 'X-COUNTDOWN-BGCOLOR':
        case 'COLOR':
          if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
            currentEvent.backgroundColor = value;
          }
          break;
        case 'X-COUNTDOWN-PINNED':
          currentEvent.isPinned = value === 'TRUE';
          break;
      }
    }

    i++;
  }

  return {events, categories};
};

export const validateICS = (content: string): boolean => {
  return content.includes('BEGIN:VCALENDAR') && content.includes('END:VCALENDAR');
};

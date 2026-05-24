export function formatDate(date) {
  try {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (isNaN(year) || isNaN(month)) {
      return '2024-01';
    }
    return `${year}-${String(month).padStart(2, '0')}`;
  } catch (e) {
    return '2024-01';
  }
}

export function formatDateFull(date) {
  try {
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    if (isNaN(year) || isNaN(month)) {
      return '2024年1月';
    }
    return `${year}年${month}月`;
  } catch (e) {
    return '2024年1月';
  }
}

export function dateToMonthIndex(date, startDate) {
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  if (!(startDate instanceof Date)) {
    startDate = new Date(startDate);
  }

  const years = date.getFullYear() - startDate.getFullYear();
  const months = date.getMonth() - startDate.getMonth();
  return years * 12 + months;
}

export function monthIndexToDate(index, startDate) {
  if (!(startDate instanceof Date)) {
    startDate = new Date(startDate);
  }

  const date = new Date(startDate);
  date.setMonth(date.getMonth() + index);
  return date;
}

export function getTotalMonths(startDate, endDate) {
  if (!(startDate instanceof Date)) {
    startDate = new Date(startDate);
  }
  if (!(endDate instanceof Date)) {
    endDate = new Date(endDate);
  }

  return dateToMonthIndex(endDate, startDate) + 1;
}

export function addMonths(date, months) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

export function generateMonthlyDates(startDate, endDate) {
  const dates = [];
  let current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

  while (current <= end) {
    dates.push(new Date(current));
    current.setMonth(current.getMonth() + 1);
  }

  return dates;
}

export function generateYearlyDates(startDate, endDate) {
  const dates = [];
  let current = new Date(startDate.getFullYear(), 0, 1);
  const end = new Date(endDate.getFullYear(), 0, 1);

  while (current <= end) {
    dates.push(new Date(current));
    current.setFullYear(current.getFullYear() + 1);
  }

  return dates;
}

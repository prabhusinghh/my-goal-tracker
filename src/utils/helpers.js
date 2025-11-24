// src/utils/helpers.js

export const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
export const dateString = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
export const weekdayShort = (y, m, d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date(y, m, d).getDay()];

export const getStorageKey = (type, year, month) => {
  const mKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  return type === 'events' ? `daily-goals-events-${mKey}` : `daily-goals-${mKey}`;
};

// --- NEW: Smart Loader (Inherits IDs from previous month) ---
export const loadInitialActivities = (year, month) => {
  try {
    // 1. Try to load current month
    const currentKey = getStorageKey('activities', year, month);
    const raw = localStorage.getItem(currentKey);
    if (raw) return JSON.parse(raw);

    // 2. If empty, try to inherit from PREVIOUS month to keep IDs consistent
    // Calculate previous month date
    let prevYear = year;
    let prevMonth = month - 1;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }

    const prevKey = getStorageKey('activities', prevYear, prevMonth);
    const prevRaw = localStorage.getItem(prevKey);
    
    if (prevRaw) {
      const prevActivities = JSON.parse(prevRaw);
      // Return previous activities but with empty checks for the new month
      return prevActivities.map(act => ({
        ...act,
        checks: {} // Reset checks for the new month
      }));
    }

  } catch (e) { console.warn(e); }

  // 3. Fallback defaults if no history exists
  return [
    { id: Math.random().toString(36).slice(2, 9), name: 'Meditation', checks: {} },
    { id: Math.random().toString(36).slice(2, 9), name: 'Exercise', checks: {} },
    { id: Math.random().toString(36).slice(2, 9), name: 'Study', checks: {} }
  ];
};

export const loadInitialEvents = (year, month) => {
  try {
    const raw = localStorage.getItem(getStorageKey('events', year, month));
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn(e); }
  return {};
};

// --- NEW: Global Streak Calculator (Cross-Month Logic) ---
export const calculateGlobalStats = (currentActivity, currentYear, currentMonth) => {
  // 1. Gather all-time checks for this specific Activity ID
  // We scan localStorage for keys matching 'daily-goals-YYYY-MM'
  const allChecks = new Set();
  
  // Add checks from the current state first (most up to date)
  Object.keys(currentActivity.checks).forEach(date => allChecks.add(date));

  // Scan storage for history
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('daily-goals-') && !key.includes('events')) {
      // Don't double count the current month (we used state above)
      const currentKey = getStorageKey('activities', currentYear, currentMonth);
      if (key === currentKey) return;

      try {
        const data = JSON.parse(localStorage.getItem(key));
        if (Array.isArray(data)) {
          // Find the same activity in the past month by ID
          const pastActivity = data.find(a => a.id === currentActivity.id);
          if (pastActivity && pastActivity.checks) {
            Object.keys(pastActivity.checks).forEach(date => allChecks.add(date));
          }
        }
      } catch (e) {}
    }
  });

  // 2. Convert Set to sorted array of timestamps
  const sortedDates = Array.from(allChecks)
    .map(d => new Date(d).getTime())
    .sort((a, b) => a - b);

  if (sortedDates.length === 0) return { current: 0, max: 0 };

  // 3. Calculate Streaks
  let maxStreak = 0;
  let currentStreak = 0;
  let tempStreak = 0;
  let lastTime = null;

  const oneDay = 24 * 60 * 60 * 1000;

  for (let i = 0; i < sortedDates.length; i++) {
    const time = sortedDates[i];
    
    if (lastTime === null) {
      // First item
      tempStreak = 1;
    } else {
      const diff = time - lastTime;
      // Allow roughly 1 day diff (accounting for potential DST hour shifts)
      // Using 1.1 days buffer to be safe, or checking exact date diffs
      if (diff <= oneDay + (1000 * 60 * 60)) { 
        // Consecutive day
        tempStreak++;
      } else {
        // Streak broken
        if (tempStreak > maxStreak) maxStreak = tempStreak;
        tempStreak = 1;
      }
    }
    lastTime = time;
  }
  // Final check after loop
  if (tempStreak > maxStreak) maxStreak = tempStreak;

  // 4. Determine Current Streak (Must include Today or Yesterday)
  const today = new Date();
  today.setHours(0,0,0,0);
  const todayTime = today.getTime();
  const yesterdayTime = todayTime - oneDay;

  const lastCheckedTime = sortedDates[sortedDates.length - 1];
  
  // If the last check was Today or Yesterday, the streak is alive.
  // Otherwise, current streak is 0.
  if (lastCheckedTime === todayTime || lastCheckedTime >= yesterdayTime - (1000 * 60 * 60)) {
    currentStreak = tempStreak;
  } else {
    currentStreak = 0;
  }

  return { current: currentStreak, max: maxStreak };
};

export const dayBadgeColor = (eventsForDay) => {
  if (!eventsForDay || eventsForDay.length === 0) return { bg: 'bg-transparent', text: 'text-gray-700 dark:text-gray-200' };
  const hasImportant = eventsForDay.some(e => e.priority === 'Important');
  const hasExam = eventsForDay.some(e => e.type === 'Exam');
  if (hasImportant) return { bg: 'bg-amber-200 dark:bg-amber-400', text: 'text-amber-900 dark:text-amber-950' };
  if (hasExam) return { bg: 'bg-purple-200 dark:bg-purple-400', text: 'text-purple-900 dark:text-purple-950' };
  return { bg: 'bg-gray-200 dark:bg-gray-600', text: 'text-gray-900 dark:text-gray-50' };
};

export const getGradientStyle = (p) => {
  if (p >= 75) return 'linear-gradient(90deg, #10b981, #6ee7b7, #10b981)';
  if (p >= 40) return 'linear-gradient(90deg, #f59e0b, #fcd34d, #f59e0b)';
  return 'linear-gradient(90deg, #ef4444, #fca5a5, #ef4444)';
};
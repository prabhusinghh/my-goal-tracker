const scheduledTimeouts = new Map();

function convertTimeToDate(dateKey, timeStr) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  const date = new Date(year, month - 1, day);
  date.setHours(hour);
  date.setMinutes(minute);
  date.setSeconds(0);
  date.setMilliseconds(0);

  return date;
}

export function scheduleReminders(dateKey, events) {
  const now = new Date();

 events.forEach(event => {
  if (!event.fromTime || !event.notifyBefore) return;
  if (event.isCompleted) return; // 🔥 NEW LINE


    const eventTime = convertTimeToDate(dateKey, event.fromTime);
    const reminderTime = new Date(eventTime.getTime() - event.notifyBefore * 60000);
    const delay = reminderTime.getTime() - now.getTime();

    const uniqueKey = `${dateKey}_${event.id}`;

    // Clear existing timer if event updated
    if (scheduledTimeouts.has(uniqueKey)) {
      clearTimeout(scheduledTimeouts.get(uniqueKey));
      scheduledTimeouts.delete(uniqueKey);
    }

    if (delay > 0) {
      const timeoutId = setTimeout(() => {
        new Notification(`Upcoming: ${event.title}`, {
          body: `Starts at ${event.fromTime}`,
          icon: "/favicon.svg",
        });

        scheduledTimeouts.delete(uniqueKey);
      }, delay);

      scheduledTimeouts.set(uniqueKey, timeoutId);
    }
  });
}
let morningScheduled = false;

export function scheduleMorningEventSummary(dateKey, events) {
  if (morningScheduled) return;

  const now = new Date();

  const morningHour = 13;
  const morningMinute = 41;

  const [year, month, day] = dateKey.split('-').map(Number);

  const morningTime = new Date(year, month - 1, day);
  morningTime.setHours(morningHour);
  morningTime.setMinutes(morningMinute);
  morningTime.setSeconds(0);
  morningTime.setMilliseconds(0);

  const delay = morningTime.getTime() - now.getTime();
  if (delay <= 0) return;

  const eventItems = events.filter(e => !e.fromTime);
  if (eventItems.length === 0) return;

  morningScheduled = true;

  setTimeout(() => {
    new Notification("Good Morning 🌅", {
      body: `You have ${eventItems.length} events today.`,
      icon: "/favicon.svg",
    });

    morningScheduled = false;
  }, delay);
}



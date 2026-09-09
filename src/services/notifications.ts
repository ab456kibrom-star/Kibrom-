import { ScheduleItem, TaskReminder, NotificationLog, NotificationChannel } from '../types';

/**
 * Normalizes day string from schedule items and checks if it matches today or is upcoming.
 */
export const DAYS_OF_WEEK = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const isTaskDueToday = (item: ScheduleItem, referenceDate: Date = new Date()): boolean => {
  const currentDayIndex = referenceDate.getDay();
  const currentDayName = DAYS_OF_WEEK[currentDayIndex].toLowerCase();
  const rawDay = (item.day || '').toLowerCase().trim();

  // Direct match for single day
  if (rawDay.includes(currentDayName)) {
    return true;
  }

  // Handle common day abbreviations
  const shortNames: Record<string, string[]> = {
    monday: ['mon'],
    tuesday: ['tue', 'tues'],
    wednesday: ['wed', 'weds'],
    thursday: ['thu', 'thur', 'thurs'],
    friday: ['fri'],
    saturday: ['sat'],
    sunday: ['sun'],
  };

  const matches = shortNames[currentDayName] || [];
  for (const short of matches) {
    if (rawDay.includes(short)) {
      return true;
    }
  }

  // Handle ranges like "Fri-Sun"
  if (rawDay.includes('fri-sun')) {
    if (currentDayIndex === 5 || currentDayIndex === 6 || currentDayIndex === 0) {
      return true;
    }
  }

  // Handle "Next Mon-Wed"
  if (rawDay.includes('mon-wed')) {
    if (currentDayIndex === 1 || currentDayIndex === 2 || currentDayIndex === 3) {
      return true;
    }
  }

  // Check if day is formatted as ISO date string (YYYY-MM-DD)
  const todayIso = referenceDate.toISOString().slice(0, 10);
  if (rawDay.includes(todayIso)) {
    return true;
  }

  return false;
};

/**
 * Formats a clean Email message for a task reminder
 */
export const formatEmailNotification = (item: ScheduleItem, notes?: string) => {
  const subject = `[REMINDER] Scheduled Task Due: ${item.day} - ${item.category}`;
  const plainText = `Hello,

This is an automated notification reminder for your upcoming scheduled task:

• Milestone: ${item.day}
• Category: ${item.category}
• Responsible: ${item.responsible}
• Progress: ${item.evaluation}% Completed

Key Activities:
${item.keyActivities}

${item.subtasks && item.subtasks.length > 0 ? `Subtasks Checklist:\n${item.subtasks.map((s) => `[${s.completed ? 'x' : ' '}] ${s.text}`).join('\n')}\n` : ''}
${item.safetyNotes ? `⚠️ Safety Precaution Notes:\n${item.safetyNotes}\n` : ''}
${notes ? `Additional Instructions:\n${notes}\n` : ''}
Please review the task schedule and update your progress accordingly.

-- Weekly Activity Schedule Manager`;

  return { subject, body: plainText };
};

/**
 * Formats a concise SMS / text message notification for mobile phones
 */
export const formatSmsNotification = (item: ScheduleItem, notes?: string) => {
  const shortActivities = item.keyActivities.replace(/\n+/g, ', ').slice(0, 80);
  let text = `[SCHEDULE ALERT] Due ${item.day}: ${item.category} (${item.responsible}). ${shortActivities}...`;
  if (item.safetyNotes) {
    text += ` Safety: ${item.safetyNotes.slice(0, 45)}`;
  }
  if (notes) {
    text += ` Note: ${notes.slice(0, 30)}`;
  }
  return text.trim();
};

/**
 * Formats a rich, professional Telegram message with emojis, bold markdown, and milestone details
 */
export const formatTelegramNotification = (item: ScheduleItem, notes?: string): string => {
  const progressBar =
    item.evaluation === 100
      ? '🟩🟩🟩🟩🟩 100%'
      : item.evaluation >= 75
      ? `🟩🟩🟩🟨⬜ ${item.evaluation}%`
      : item.evaluation >= 50
      ? `🟩🟩🟨⬜⬜ ${item.evaluation}%`
      : item.evaluation > 0
      ? `🟨⬜⬜⬜⬜ ${item.evaluation}%`
      : '⬜⬜⬜⬜⬜ 0%';

  let message =
    `📋 *SCHEDULED MILESTONE ALERT*\n\n` +
    `📅 *Day:* ${item.day}\n` +
    `🏢 *Category:* ${item.category}\n` +
    `👷 *Responsible:* ${item.responsible}\n` +
    `📊 *Progress:* ${progressBar}\n\n` +
    `🎯 *Key Activities:*\n${item.keyActivities}\n`;

  if (item.subtasks && item.subtasks.length > 0) {
    message +=
      `\n📝 *Checklist:*\n` +
      item.subtasks.map((s) => `${s.completed ? '✅' : '▫️'} ${s.text}`).join('\n') +
      '\n';
  }

  if (item.safetyNotes) {
    message += `\n⚠️ *Safety Precaution:*\n${item.safetyNotes}\n`;
  }

  if (notes) {
    message += `\n💬 *Additional Instructions:*\n${notes}\n`;
  }

  message += `\n🔗 _Weekly Activity Schedule Platform_`;

  return message;
};

/**
 * Dispatches message via Telegram:
 * 1. Copies formatted message text to clipboard
 * 2. Attempts Telegram Bot API dispatch if token/chatId available
 * 3. Opens Telegram Share URL (desktop app / mobile app / web) with prefilled message
 */
export const sendTelegramNotification = async (
  item: ScheduleItem,
  options?: {
    recipient?: string;
    customNotes?: string;
    botToken?: string;
    chatId?: string;
  }
): Promise<{ success: boolean; mode: 'bot_api' | 'telegram_share'; message: string; shareUrl: string }> => {
  const formattedText = formatTelegramNotification(item, options?.customNotes);

  // Copy to clipboard for easy manual pasting if needed
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(formattedText);
    } catch (e) {}
  }

  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin : ''
  )}&text=${encodeURIComponent(formattedText)}`;

  // Optional Bot API dispatch if token and chat ID provided
  const botToken =
    options?.botToken ||
    (typeof process !== 'undefined' && process.env ? process.env.TELEGRAM_BOT_TOKEN : '');
  const chatId =
    options?.chatId ||
    (options?.recipient && options.recipient.startsWith('-') ? options.recipient : '');

  if (botToken && chatId) {
    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: formattedText,
          parse_mode: 'Markdown',
        }),
      });
      if (response.ok) {
        return { success: true, mode: 'bot_api', message: formattedText, shareUrl };
      }
    } catch (err) {
      console.warn('Telegram Bot API dispatch fallback to Telegram Share link:', err);
    }
  }

  // Open Telegram Share URL in new tab / app
  if (typeof window !== 'undefined') {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }

  return { success: true, mode: 'telegram_share', message: formattedText, shareUrl };
};

/**
 * Open direct Telegram message for arbitrary text
 */
export const openTelegramShare = (text: string) => {
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
  const shareUrl = `https://t.me/share/url?text=${encodeURIComponent(text)}`;
  if (typeof window !== 'undefined') {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  }
  return shareUrl;
};

/**
 * Requests browser notification permission if available
 */
export const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (e) {
      console.warn('Notification permission request error:', e);
    }
  }
  return false;
};

/**
 * Fires a native browser notification if granted
 */
export const triggerBrowserNotification = (title: string, body: string) => {
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
      });
    } catch (e) {
      console.warn('Failed to fire native notification:', e);
    }
  }
};

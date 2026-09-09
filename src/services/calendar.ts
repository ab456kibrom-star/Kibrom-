import { ScheduleItem } from '../types';
import { getAccessToken } from './auth';

export interface CalendarEventLink {
  id: string;
  summary: string;
  htmlLink: string;
  start: string;
  end: string;
}

export interface CalendarExportResult {
  success: boolean;
  calendarId: string;
  totalRequested: number;
  createdEventsCount: number;
  eventLinks: CalendarEventLink[];
  calendarHtmlLink: string;
  errors?: string[];
}

export interface GoogleCalendarItem {
  id: string;
  summary: string;
  primary?: boolean;
  backgroundColor?: string;
}

/**
 * Formats a Date object to YYYY-MM-DD string in local time
 */
export function formatDateYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the Monday of the current week (or reference date's week)
 */
export function getMondayOfWeek(referenceDate: Date = new Date()): Date {
  const d = new Date(referenceDate);
  const day = d.getDay();
  // day: 0 is Sunday, 1 is Monday...
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Calculates start and end YYYY-MM-DD strings for a ScheduleItem based on a week's Monday.
 * Note: Google Calendar end date for all-day events is exclusive.
 */
export function calculateMilestoneDates(
  dayString: string,
  mondayYMD: string
): { startDate: string; endDate: string; label: string } {
  // If the user already wrote an ISO date (e.g. 2026-09-15)
  if (/^\d{4}-\d{2}-\d{2}$/.test(dayString.trim())) {
    const single = dayString.trim();
    const [y, m, d] = single.split('-').map(Number);
    const start = new Date(y, m - 1, d);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return {
      startDate: single,
      endDate: formatDateYMD(end),
      label: single,
    };
  }

  const [y, m, d] = mondayYMD.split('-').map(Number);
  const baseMonday = new Date(y, m - 1, d);

  const normalized = dayString.trim().toLowerCase();

  // Offset mapping from Monday (Monday = 0)
  let startOffset = 0;
  let durationDays = 1;

  if (normalized.includes('mon')) {
    startOffset = 0;
  } else if (normalized.includes('tue')) {
    startOffset = 1;
  } else if (normalized.includes('wed')) {
    startOffset = 2;
  } else if (normalized.includes('thu')) {
    startOffset = 3;
  } else if (normalized.includes('fri') && normalized.includes('sun')) {
    // Weekend block Fri-Sun
    startOffset = 4;
    durationDays = 3; // Fri, Sat, Sun
  } else if (normalized.includes('fri')) {
    startOffset = 4;
  } else if (normalized.includes('sat')) {
    startOffset = 5;
  } else if (normalized.includes('sun')) {
    startOffset = 6;
  } else {
    // Default fallback to Monday
    startOffset = 0;
  }

  const startDateObj = new Date(baseMonday);
  startDateObj.setDate(startDateObj.getDate() + startOffset);

  const endDateObj = new Date(startDateObj);
  // Google Calendar all-day end date is exclusive
  endDateObj.setDate(endDateObj.getDate() + durationDays);

  return {
    startDate: formatDateYMD(startDateObj),
    endDate: formatDateYMD(endDateObj),
    label: durationDays > 1 ? `${dayString} (${durationDays} days)` : dayString,
  };
}

/**
 * Formats a clean description for the Google Calendar event
 */
export function formatCalendarEventDescription(item: ScheduleItem): string {
  const lines: string[] = [];

  lines.push(`📋 Category: ${item.category}`);
  lines.push(`👤 Responsible: ${item.responsible}`);
  lines.push(`📊 Progress: ${item.evaluation}%`);

  if (item.safetyNotes) {
    lines.push(`⚠️ Safety Protocol: ${item.safetyNotes}`);
  }

  if (item.location?.address) {
    lines.push(`📍 Tagged Location: ${item.location.address}`);
  }

  lines.push('');
  lines.push('--- Key Activities & Objectives ---');
  lines.push(item.keyActivities);

  if (item.subtasks && item.subtasks.length > 0) {
    lines.push('');
    lines.push('--- Subtasks Checklist ---');
    item.subtasks.forEach((st) => {
      lines.push(`${st.completed ? '✅' : '⬜'} ${st.text}`);
    });
  }

  lines.push('');
  lines.push('Exported from Weekly Activity Schedule applet.');

  return lines.join('\n');
}

/**
 * Fetches the user's Google Calendars list
 */
export async function getUserCalendars(): Promise<GoogleCalendarItem[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google to access your calendars.');
  }

  try {
    const res = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('Failed to fetch calendarList, defaulting to primary:', errText);
      return [{ id: 'primary', summary: 'Primary Personal Calendar', primary: true }];
    }

    const data = await res.json();
    if (data.items && Array.isArray(data.items)) {
      return data.items.map((c: any) => ({
        id: c.id,
        summary: c.summary || c.id,
        primary: !!c.primary,
        backgroundColor: c.backgroundColor,
      }));
    }

    return [{ id: 'primary', summary: 'Primary Personal Calendar', primary: true }];
  } catch (err) {
    console.warn('Error fetching calendar list:', err);
    return [{ id: 'primary', summary: 'Primary Personal Calendar', primary: true }];
  }
}

/**
 * Pushes a single schedule milestone to Google Calendar
 */
export async function createSingleCalendarEvent(
  item: ScheduleItem,
  weekStartDate: string,
  calendarId: string = 'primary',
  enableReminders: boolean = true
): Promise<CalendarEventLink> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google to export to Google Calendar.');
  }

  const { startDate, endDate } = calculateMilestoneDates(item.day, weekStartDate);
  const firstLine = item.keyActivities.split('\n')[0].trim();
  const summary = `[${item.category}] ${item.day}: ${firstLine.slice(0, 70)}${firstLine.length > 70 ? '...' : ''}`;
  const description = formatCalendarEventDescription(item);

  const eventPayload: any = {
    summary,
    description,
    start: {
      date: startDate,
    },
    end: {
      date: endDate,
    },
  };

  if (item.location?.address) {
    eventPayload.location = item.location.address;
  }

  if (enableReminders) {
    eventPayload.reminders = {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 }, // 1 day before (24 hours)
        { method: 'popup', minutes: 60 },   // 1 hour before
      ],
    };
  }

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    }
  );

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    const message = errorBody?.error?.message || `Google Calendar API error (HTTP ${res.status})`;
    throw new Error(message);
  }

  const created = await res.json();
  return {
    id: created.id,
    summary: created.summary || summary,
    htmlLink: created.htmlLink || `https://calendar.google.com/calendar/r/eventedit/${created.id}`,
    start: startDate,
    end: endDate,
  };
}

/**
 * Bulk pushes selected milestones to Google Calendar
 */
export async function exportMilestonesToGoogleCalendar(
  items: ScheduleItem[],
  weekStartDate: string,
  calendarId: string = 'primary',
  enableReminders: boolean = true,
  onProgress?: (current: number, total: number) => void
): Promise<CalendarExportResult> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Please sign in with Google to export to Google Calendar.');
  }

  const eventLinks: CalendarEventLink[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (onProgress) {
      onProgress(i + 1, items.length);
    }

    try {
      const created = await createSingleCalendarEvent(
        item,
        weekStartDate,
        calendarId,
        enableReminders
      );
      eventLinks.push(created);
    } catch (err: any) {
      console.error(`Failed to export item "${item.day} - ${item.category}":`, err);
      errors.push(`${item.day} (${item.category}): ${err.message || 'Unknown error'}`);
    }
  }

  return {
    success: eventLinks.length > 0,
    calendarId,
    totalRequested: items.length,
    createdEventsCount: eventLinks.length,
    eventLinks,
    calendarHtmlLink: 'https://calendar.google.com/calendar/u/0/r',
    errors: errors.length > 0 ? errors : undefined,
  };
}

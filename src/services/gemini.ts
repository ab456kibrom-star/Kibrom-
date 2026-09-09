import { ScheduleItem } from '../types';

export interface GeminiChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

export async function askGeminiScheduleAdvisor(
  message: string,
  history: { role: 'user' | 'model'; text: string }[] = [],
  scheduleContext: ScheduleItem[] = []
): Promise<string> {
  try {
    const response = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history,
        scheduleContext,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.reply;
  } catch (err: any) {
    console.error('Gemini chat request failed:', err);
    throw err;
  }
}

export async function analyzeScheduleFeasibility(
  tasks: ScheduleItem[],
  query?: string
): Promise<string> {
  try {
    const response = await fetch('/api/gemini/analyze-schedule', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tasks,
        query,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.analysis;
  } catch (err: any) {
    console.error('Gemini analyze schedule request failed:', err);
    throw err;
  }
}

export async function optimizeTaskWithGemini(
  task: Partial<ScheduleItem>,
  action: 'breakdown' | 'feasibility' | 'reschedule' = 'breakdown'
): Promise<string> {
  try {
    const response = await fetch('/api/gemini/optimize-task', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        task,
        action,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Server responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.result;
  } catch (err: any) {
    console.error('Gemini optimize task failed:', err);
    throw err;
  }
}

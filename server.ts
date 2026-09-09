import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

async function generateGeminiContent(
  ai: GoogleGenAI,
  contents: string,
  systemInstruction?: string,
  temperature = 0.7
): Promise<string> {
  const modelsToTry = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
  let lastError: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: systemInstruction
          ? { systemInstruction, temperature }
          : { temperature },
      });
      if (response && response.text) {
        return response.text;
      }
    } catch (err: any) {
      console.warn(`Model ${model} call failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('All Gemini model calls failed');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Gemini Chat & Assistant API
  app.post('/api/gemini/chat', async (req, res) => {
    try {
      const { message, history = [], scheduleContext } = req.body;

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'Message is required.' });
        return;
      }

      if (!process.env.GEMINI_API_KEY) {
        res.status(503).json({
          error: 'Gemini API key is not configured in the server environment.',
        });
        return;
      }

      const ai = getAI();

      // Build context from schedule if provided
      let scheduleSummary = '';
      if (scheduleContext && Array.isArray(scheduleContext) && scheduleContext.length > 0) {
        scheduleSummary = `\nCURRENT WEEKLY SCHEDULE DATA:\n` +
          scheduleContext.map((t: any, idx: number) =>
            `${idx + 1}. [${t.day}] ${t.category} (Responsible: ${t.responsible}, Status: ${t.status || 'Active'}, Evaluation: ${t.evaluation}%, Importance: ${t.importance || 'Medium'})${t.notes ? ` - Notes: ${t.notes}` : ''}`
          ).join('\n');
      }

      const systemInstruction = `You are the intelligent Gemini Operations & Schedule Copilot for the "Weekly Activity Schedule" platform.
Your objective is to help team managers, field technicians (like Kibrom, Assaye, and Sarah), and operators make their schedule achievable, realistic, and stress-free.

Core guidelines:
- If activities are flagged as unachievable or overloaded, offer actionable recommendations: which tasks to postpone, reassign, break into smaller stages, or defer to next week.
- Provide clear, empathetic, practical, and highly formatted advice (using bold titles, bullet points, and realistic timeframes).
- Keep responses concise, direct, and actionable. Avoid filler or corporate fluff.
${scheduleSummary}`;

      // Construct conversation prompt
      let fullPrompt = '';
      if (history && history.length > 0) {
        const recentHistory = history.slice(-6).map((h: any) => `${h.role === 'user' ? 'User' : 'Gemini'}: ${h.text}`).join('\n');
        fullPrompt = `${recentHistory}\nUser: ${message}\nGemini:`;
      } else {
        fullPrompt = message;
      }

      const replyText = await generateGeminiContent(ai, fullPrompt, systemInstruction, 0.7);
      res.json({ reply: replyText });
    } catch (error: any) {
      console.error('Gemini chat error:', error);
      res.status(500).json({
        error: error.message || 'Failed to process Gemini request',
      });
    }
  });

  // Gemini Schedule Feasibility & Optimization Analyzer
  app.post('/api/gemini/analyze-schedule', async (req, res) => {
    try {
      const { tasks, query } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        res.status(503).json({
          error: 'Gemini API key is not configured in the server environment.',
        });
        return;
      }

      const ai = getAI();

      const tasksText = Array.isArray(tasks) && tasks.length > 0
        ? tasks.map((t: any, i: number) =>
            `${i + 1}. Day: ${t.day} | Category: ${t.category} | Responsible: ${t.responsible} | Progress: ${t.evaluation}% | Status: ${t.status || 'Active'}`
          ).join('\n')
        : 'No tasks currently scheduled.';

      const prompt = `Analyze this weekly activity schedule with a focus on feasibility and achieving goals without team burnout:

SCHEDULE:
${tasksText}

${query ? `USER SPECIFIC FOCUS: ${query}` : 'The user indicated that some or most activities are not achievable right now.'}

Please return a structured, actionable evaluation:
1. **Feasibility Assessment**: Summary of current workload and bottlenecks.
2. **Immediate Recommendations (Achievable Right Now)**: Which 2-3 essential tasks must be kept and focused on first.
3. **Tasks to Postpone / Reschedule**: Specific activities that should be paused or moved to next week to make the workload achievable.
4. **Action Steps for Kibrom & Team**: Clear 1-2 sentence directives.`;

      const analysisText = await generateGeminiContent(
        ai,
        prompt,
        'You are an expert operations planner and project feasibility consultant. Provide clear, empathetic, and pragmatic analysis.',
        0.6
      );

      res.json({ analysis: analysisText });
    } catch (error: any) {
      console.error('Gemini analyze error:', error);
      res.status(500).json({
        error: error.message || 'Failed to analyze schedule with Gemini',
      });
    }
  });

  // Gemini Task Breakdown & Optimizer
  app.post('/api/gemini/optimize-task', async (req, res) => {
    try {
      const { task, action } = req.body;

      if (!process.env.GEMINI_API_KEY) {
        res.status(503).json({
          error: 'Gemini API key is not configured in the server environment.',
        });
        return;
      }

      if (!task) {
        res.status(400).json({ error: 'Task details are required.' });
        return;
      }

      const ai = getAI();

      let prompt = '';
      if (action === 'breakdown') {
        prompt = `The user has this scheduled milestone:
Day: ${task.day}
Category: ${task.category}
Responsible: ${task.responsible}
Current Progress: ${task.evaluation}%

Because the overall activity is currently too large or not fully achievable at once, break this down into 3-4 small, realistic, bite-sized micro-steps that can actually be achieved step-by-step. Provide an estimated realistic time for each step.`;
      } else if (action === 'reschedule') {
        prompt = `For this task: "${task.category}" scheduled on ${task.day} by ${task.responsible}:
Provide a practical recommendation on how to postpone or reschedule it effectively without disrupting operations or losing progress notes.`;
      } else {
        prompt = `Evaluate the feasibility and safety risks of this task: "${task.category}" on ${task.day} for ${task.responsible}. Give 3 concise tips to achieve it safely or know when to stop and postpone.`;
      }

      const resultText = await generateGeminiContent(
        ai,
        prompt,
        'You are an operations efficiency coach. Provide bulleted, practical guidance.',
        0.5
      );

      res.json({ result: resultText });
    } catch (error: any) {
      console.error('Gemini task advisor error:', error);
      res.status(500).json({
        error: error.message || 'Failed to optimize task with Gemini',
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

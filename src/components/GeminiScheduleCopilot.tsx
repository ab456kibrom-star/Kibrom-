import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  X,
  Send,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Clock,
  Copy,
  Check,
  Share2,
  Bot,
  Lightbulb,
} from 'lucide-react';
import { ScheduleItem } from '../types';
import {
  askGeminiScheduleAdvisor,
  analyzeScheduleFeasibility,
  GeminiChatMessage,
} from '../services/gemini';
import { shareChatMessageViaTelegram } from '../services/chat';

interface GeminiScheduleCopilotProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: ScheduleItem[];
  onOpenChatWithAdvice?: (text: string) => void;
}

const PRESET_PROMPTS = [
  'Which activities are currently not achievable and should be postponed?',
  'Create a realistic, balanced priority plan for Kibrom and Assaye',
  'What are the highest risk tasks and how can we simplify them?',
  'Draft a brief status update message for the team about delayed tasks',
];

export const GeminiScheduleCopilot: React.FC<GeminiScheduleCopilotProps> = ({
  isOpen,
  onClose,
  tasks,
  onOpenChatWithAdvice,
}) => {
  const [activeMode, setActiveMode] = useState<'copilot' | 'feasibility'>('feasibility');
  const [messages, setMessages] = useState<GeminiChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'model',
      text: 'Hello! I am your **Gemini Schedule Copilot**. I can evaluate your weekly activities, pinpoint unachievable bottlenecks, recommend what to postpone, and help you create a realistic plan.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Feasibility report state
  const [feasibilityReport, setFeasibilityReport] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeMode === 'copilot') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeMode]);

  // Automatically run feasibility analysis when opening the feasibility tab for the first time if not yet run
  useEffect(() => {
    if (isOpen && activeMode === 'feasibility' && !feasibilityReport && !isAnalyzing) {
      handleRunFeasibility();
    }
  }, [isOpen, activeMode]);

  const handleRunFeasibility = async () => {
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const report = await analyzeScheduleFeasibility(
        tasks,
        'The team notes that several scheduled activities are not achievable right now. Provide practical recommendations on what to keep, postpone, or simplify.'
      );
      setFeasibilityReport(report);
    } catch (err: any) {
      setErrorMessage(err.message || 'Could not complete feasibility analysis. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: GeminiChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const reply = await askGeminiScheduleAdvisor(query, history, tasks);

      const modelMsg: GeminiChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to get response from Gemini. Please verify your connection.');
      const errorModelMsg: GeminiChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        text: `⚠️ Error: ${err.message || 'Unable to reach Gemini service.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorModelMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />

      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh] overflow-hidden z-10">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-indigo-900/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  Gemini Operations Copilot
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  gemini-3.8-flash
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Workload analysis, feasibility checks, and achievable milestone planning
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            title="Close Gemini Copilot"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveMode('feasibility')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'feasibility'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Feasibility & Bottlenecks</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('copilot')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'copilot'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <Bot className="w-3.5 h-3.5" />
              <span>Interactive Copilot Chat</span>
            </button>
          </div>

          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-500 font-medium">
              Loaded: <strong>{tasks.length}</strong> activities
            </span>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 bg-white">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">Gemini Notice:</span> {errorMessage}
              </div>
            </div>
          )}

          {activeMode === 'feasibility' ? (
            <div className="space-y-4">
              {/* Card Banner */}
              <div className="p-4 rounded-xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900">
                      Unachievable Tasks Resolution
                    </h4>
                  </div>
                  <p className="text-xs text-indigo-800">
                    Gemini evaluates which tasks in your schedule are overloaded or unrealistic right now and structures achievable next steps.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleRunFeasibility}
                  disabled={isAnalyzing}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-2 cursor-pointer transition-colors flex-shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzing ? 'animate-spin' : ''}`} />
                  <span>{isAnalyzing ? 'Analyzing with Gemini...' : 'Re-run Analysis'}</span>
                </button>
              </div>

              {/* Report Display */}
              {isAnalyzing ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto animate-bounce">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">
                    Gemini is evaluating workload balance, time limits, and task feasibility...
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Pinpointing non-achievable items and formulating realistic solutions
                  </p>
                </div>
              ) : feasibilityReport ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Gemini Feasibility Recommendations
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopy(feasibilityReport)}
                        className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Copy analysis text"
                      >
                        {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedReport ? 'Copied' : 'Copy'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => shareChatMessageViaTelegram(feasibilityReport, 'Weekly Feasibility Analysis')}
                        className="px-2.5 py-1 text-xs bg-sky-500 hover:bg-sky-600 text-white rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors"
                        title="Share report to Telegram"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Send to Telegram</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 leading-relaxed font-sans whitespace-pre-wrap space-y-2 select-text">
                    {feasibilityReport}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Click "Re-run Analysis" to generate an assessment of your schedule.
                </div>
              )}
            </div>
          ) : (
            /* Interactive Chat Mode */
            <div className="flex flex-col h-full space-y-4">
              {/* Preset Chips */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Quick Inquiries:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(prompt)}
                      disabled={isLoading}
                      className="text-left px-2.5 py-1 rounded-lg text-[11px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chat Thread */}
              <div className="flex-1 min-h-[260px] max-h-[360px] overflow-y-auto space-y-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs ${
                          isUser
                            ? 'bg-indigo-600 text-white rounded-tr-xs'
                            : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-tl-xs whitespace-pre-wrap'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <span
                          className={`text-[9px] block mt-1 ${
                            isUser ? 'text-indigo-200 text-right' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex gap-2.5 items-center">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 px-3 py-2 rounded-2xl text-xs text-slate-500 shadow-2xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                      <span>Gemini is analyzing your schedule...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Composer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask Gemini anything about your schedule or tasks..."
                  disabled={isLoading}
                  className="flex-1 px-3.5 py-2.5 text-xs border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                >
                  <span>Send</span>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Powered by Google Gemini 3.8 Flash
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

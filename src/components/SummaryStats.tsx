import React from 'react';
import {
  CheckSquare,
  TrendingUp,
  UserCheck,
  ShieldCheck,
  Search,
  Users,
  X,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { ScheduleItem, FilterAssignee, FilterStatus } from '../types';

interface SummaryStatsProps {
  items: ScheduleItem[];
  selectedAssignee: FilterAssignee;
  onSelectAssignee: (assignee: FilterAssignee) => void;
  selectedStatus: FilterStatus;
  onSelectStatus: (status: FilterStatus) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenGemini?: () => void;
}

export const SummaryStats: React.FC<SummaryStatsProps> = ({
  items,
  selectedAssignee,
  onSelectAssignee,
  selectedStatus,
  onSelectStatus,
  searchQuery,
  onSearchChange,
  onOpenGemini,
}) => {
  const totalItems = items.length;
  const totalSubtasks = items.reduce((acc, item) => acc + item.subtasks.length, 0);
  const completedSubtasks = items.reduce(
    (acc, item) => acc + item.subtasks.filter((s) => s.completed).length,
    0
  );

  const avgEvaluation =
    totalItems > 0
      ? Math.round(items.reduce((acc, item) => acc + item.evaluation, 0) / totalItems)
      : 0;

  const subtaskPercent =
    totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

  const kibromCount = items.filter((i) => i.responsible.includes('Kibrom')).length;
  const jointCount = items.filter((i) => i.responsible.includes('Assaye')).length;

  const pendingCount = items.filter((i) => i.evaluation === 0).length;
  const inProgressCount = items.filter((i) => i.evaluation > 0 && i.evaluation < 100).length;
  const completedCount = items.filter((i) => i.evaluation === 100).length;

  const isFilterActive = selectedAssignee !== 'All' || selectedStatus !== 'all' || searchQuery.trim().length > 0;

  const handleClearFilters = () => {
    onSelectAssignee('All');
    onSelectStatus('all');
    onSearchChange('');
  };

  return (
    <div className="space-y-4 mb-6">
      {/* 4 Professional KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Evaluation Score */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Execution Score
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">{avgEvaluation}%</span>
              <span className="text-xs text-slate-500 font-medium">scheduled avg</span>
            </div>
            <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${avgEvaluation}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Metric 2: Subtask Action Items */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Action Checklist
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {completedSubtasks}
                <span className="text-sm font-normal text-slate-400">/{totalSubtasks}</span>
              </span>
              <span className="text-xs text-emerald-700 font-semibold">({subtaskPercent}% done)</span>
            </div>
            <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${subtaskPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Metric 3: Team Workload Allocation */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Team Workload
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Kibrom (Primary):</span>
              <span className="font-bold text-slate-900">{kibromCount} milestones</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Assaye & Kibrom:</span>
              <span className="font-bold text-slate-900">{jointCount} milestones</span>
            </div>
          </div>
        </div>

        {/* Metric 4: Protocol & Quality Compliance */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Safety & Compliance
            </span>
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-900 tracking-tight">100%</span>
              <span className="text-xs font-medium text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                Protocols Active
              </span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 truncate">
              Chemical seal 48h & PPE check logged
            </p>
          </div>
        </div>
      </div>

      {/* Unified Filter & Search Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-2xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="filter-search-input"
            type="text"
            placeholder="Search activities, days, categories, or notes..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs text-slate-900 bg-slate-50/70 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:bg-white transition-colors placeholder:text-slate-400 font-medium"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters cluster */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Assignee Filter Pills */}
          <div className="inline-flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
              <UserCheck className="w-3 h-3" />
              <span>Owner:</span>
            </span>
            {(['All', 'Kibrom', 'Assaye & Kibrom'] as FilterAssignee[]).map((assignee) => {
              const count =
                assignee === 'All'
                  ? totalItems
                  : assignee === 'Kibrom'
                  ? kibromCount
                  : jointCount;

              return (
                <button
                  key={assignee}
                  type="button"
                  onClick={() => onSelectAssignee(assignee)}
                  className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    selectedAssignee === assignee
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/80'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {assignee}
                  <span className="ml-1 text-[10px] text-slate-400 font-normal">({count})</span>
                </button>
              );
            })}
          </div>

          {/* Status Filter */}
          <div className="inline-flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200/80">
            <span className="text-[11px] font-semibold text-slate-400 px-2 flex items-center gap-1">
              <SlidersHorizontal className="w-3 h-3" />
              <span>Status:</span>
            </span>
            {(
              [
                { id: 'all', label: 'All', count: totalItems },
                { id: 'pending', label: 'Pending', count: pendingCount },
                { id: 'in_progress', label: 'In Progress', count: inProgressCount },
                { id: 'completed', label: 'Done', count: completedCount },
              ] as { id: FilterStatus; label: string; count: number }[]
            ).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelectStatus(s.id)}
                className={`px-2.5 py-1 text-xs rounded-md font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  selectedStatus === s.id
                    ? 'bg-white text-indigo-700 shadow-2xs border border-slate-200/80'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {s.label}
                <span className="ml-1 text-[10px] text-slate-400 font-normal">({s.count})</span>
              </button>
            ))}
          </div>

          {/* Clear Filters Button if any active */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          {/* Gemini Feasibility Check Button */}
          {onOpenGemini && (
            <button
              type="button"
              onClick={onOpenGemini}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50/90 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs ml-auto"
              title="Analyze schedule feasibility with Gemini"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
              <span>Gemini Feasibility Check</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

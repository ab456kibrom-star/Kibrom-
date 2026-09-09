import React from 'react';
import {
  PieChart,
  BarChart,
  CheckCircle2,
  Clock,
  Shield,
  Activity,
  Award,
} from 'lucide-react';
import { ScheduleItem } from '../types';

interface AnalyticsViewProps {
  items: ScheduleItem[];
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ items }) => {
  const totalItems = items.length;
  const avgEval =
    totalItems > 0
      ? Math.round(items.reduce((acc, i) => acc + i.evaluation, 0) / totalItems)
      : 0;

  const totalSubtasks = items.reduce((acc, i) => acc + i.subtasks.length, 0);
  const completedSubtasks = items.reduce(
    (acc, i) => acc + i.subtasks.filter((s) => s.completed).length,
    0
  );

  // Group by category
  const categories = ['Cleaning', 'Maintenance', 'Plumbing', 'Family', 'General'] as const;
  const categoryStats = categories.map((cat) => {
    const catItems = items.filter((i) => i.category === cat);
    const count = catItems.length;
    const catSubtasks = catItems.reduce((acc, i) => acc + i.subtasks.length, 0);
    const catCompleted = catItems.reduce(
      (acc, i) => acc + i.subtasks.filter((s) => s.completed).length,
      0
    );
    const catAvgEval =
      count > 0 ? Math.round(catItems.reduce((acc, i) => acc + i.evaluation, 0) / count) : 0;

    return {
      name: cat,
      count,
      catSubtasks,
      catCompleted,
      catAvgEval,
    };
  });

  // Assignee breakdown
  const assignees = ['Kibrom', 'Assaye & Kibrom'];
  const assigneeStats = assignees.map((name) => {
    const aItems = items.filter((i) => i.responsible === name);
    const count = aItems.length;
    const aSubtasks = aItems.reduce((acc, i) => acc + i.subtasks.length, 0);
    const aCompleted = aItems.reduce(
      (acc, i) => acc + i.subtasks.filter((s) => s.completed).length,
      0
    );
    const aAvg =
      count > 0 ? Math.round(aItems.reduce((acc, i) => acc + i.evaluation, 0) / count) : 0;
    return { name, count, aSubtasks, aCompleted, aAvg };
  });

  return (
    <div className="space-y-6">
      {/* Executive Performance Assessment Card */}
      <div className="bg-slate-900 text-white rounded-xl p-6 border border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider bg-slate-800 text-emerald-400 border border-slate-700">
            <Award className="w-3.5 h-3.5" />
            <span>Executive Performance Summary</span>
          </div>
          <h2 className="text-xl font-bold mt-2 tracking-tight">Milestone Execution & Quality Assessment</h2>
          <p className="text-slate-300 text-xs mt-1.5 max-w-xl leading-relaxed">
            Composite execution metric combining subtask action items, plumbing compliance checks, and manual milestone evaluations.
          </p>
        </div>
        <div className="flex items-center gap-4 bg-slate-800/80 p-4 rounded-xl border border-slate-700 shrink-0">
          <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-3xl font-extrabold tracking-tight">{avgEval}%</div>
            <div className="text-xs text-slate-300 font-medium">Average Evaluation</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Day-by-Day Evaluation Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-600" />
            <span>Progress Breakdown by Day</span>
          </h3>
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <span>{item.day}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 font-normal">
                      {item.responsible}
                    </span>
                  </div>
                  <span className="font-bold text-indigo-600">{item.evaluation}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      item.evaluation === 100
                        ? 'bg-emerald-500'
                        : item.evaluation > 0
                        ? 'bg-indigo-600'
                        : 'bg-slate-300'
                    }`}
                    style={{ width: `${item.evaluation}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Assignee Breakdown */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
          <h3 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Assignee Workload & Completion</span>
          </h3>
          <div className="space-y-4">
            {assigneeStats.map((stat) => (
              <div key={stat.name} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-900 text-sm">{stat.name}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    {stat.aAvg}% Avg Score
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mt-2">
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Schedule Milestones</span>
                    <span className="font-bold text-slate-800 text-sm">{stat.count} Days</span>
                  </div>
                  <div className="bg-white p-2 rounded border border-slate-200">
                    <span className="text-slate-400 block text-[10px]">Checklist Items</span>
                    <span className="font-bold text-slate-800 text-sm">
                      {stat.aCompleted}/{stat.aSubtasks} Done
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Matrices */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
        <h3 className="font-bold text-slate-900 text-sm mb-4">Category Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categoryStats
            .filter((c) => c.count > 0)
            .map((cat) => (
              <div
                key={cat.name}
                className="p-3 rounded-lg border border-slate-200/90 bg-slate-50/50 flex flex-col justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{cat.count} milestone(s)</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-200 flex items-baseline justify-between">
                  <span className="text-[10px] text-slate-500">Progress</span>
                  <span className="text-xs font-bold text-indigo-700">{cat.catAvgEval}%</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

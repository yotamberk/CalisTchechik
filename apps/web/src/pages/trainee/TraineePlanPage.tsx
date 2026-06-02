import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  PlayCircle,
  Clock,
  ChevronRight,
  MessageSquare,
  Dumbbell,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { PlanDto } from '@calist/shared';
import { formatDate, formatVolumeLabel } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { parseISO, isWithinInterval } from 'date-fns';

export function TraineePlanPage() {
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['trainee-plans'],
    queryFn: () => api.get<PlanDto[]>('/plans/trainee'),
  });

  const currentPlan = selectedPlanId
    ? plans.find((p) => p.id === selectedPlanId) ?? plans[0] ?? null
    : plans[0] ?? null;

  const today = new Date();

  const currentWeek =
    currentPlan?.weeks?.find((w) => {
      const start = parseISO(w.startDate as unknown as string);
      const end = w.endDate
        ? parseISO(w.endDate as unknown as string)
        : new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
      return isWithinInterval(today, { start, end });
    }) ??
    currentPlan?.weeks?.[currentPlan.weeks.length - 1] ??
    null;

  const displayWeek = selectedWeekId
    ? currentPlan?.weeks?.find((w) => w.id === selectedWeekId) ?? currentWeek
    : currentWeek;

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500">Loading your plan...</div>
      </div>
    );
  }

  if (!currentPlan) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Dumbbell size={40} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 text-lg font-medium">No training plan yet</p>
          <p className="text-gray-600 text-sm mt-2">Your trainer hasn't assigned a plan yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  const sessions = displayWeek?.sessions ?? [];
  const completedCount = sessions.filter((s) => s.logs?.[0]?.completedAt).length;
  const remainingCount = sessions.length - completedCount;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      {/* Plan selector */}
      {plans.length > 1 && (
        <select
          className="input text-sm"
          value={currentPlan.id}
          onChange={(e) => { setSelectedPlanId(e.target.value); setSelectedWeekId(null); }}
        >
          {plans.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      )}

      {/* Week tabs */}
      {currentPlan.weeks && currentPlan.weeks.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {currentPlan.weeks.map((week) => {
            const isSelected = displayWeek?.id === week.id;
            const weekSessions = week.sessions ?? [];
            const weekDone = weekSessions.filter((s) => s.logs?.[0]?.completedAt).length;
            return (
              <button
                key={week.id}
                onClick={() => setSelectedWeekId(week.id)}
                className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/40'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-750'
                }`}
              >
                <div>Week {week.weekNumber}</div>
                <div className="text-xs opacity-70 mt-0.5">{weekDone}/{weekSessions.length} done</div>
              </button>
            );
          })}
        </div>
      )}

      {/* Week header */}
      {displayWeek && (
        <div className="card">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">{currentPlan.name}</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Week {displayWeek.weekNumber}
                {' · '}
                {formatDate(displayWeek.startDate as unknown as string)}
                {displayWeek.endDate ? ` → ${formatDate(displayWeek.endDate as unknown as string)}` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-white">{remainingCount}</p>
              <p className="text-xs text-gray-500">sessions left</p>
            </div>
          </div>

          {/* Progress bar */}
          {sessions.length > 0 && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{completedCount} completed</span>
                <span>{sessions.length} total</span>
              </div>
              <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-500 rounded-full transition-all"
                  style={{ width: sessions.length ? `${(completedCount / sessions.length) * 100}%` : '0%' }}
                />
              </div>
            </div>
          )}

          {/* Trainer feedback */}
          {displayWeek.feedback && displayWeek.feedback.length > 0 && (
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
              <p className="text-xs font-semibold text-blue-400 mb-1 flex items-center gap-1">
                <MessageSquare size={12} />
                Trainer note
              </p>
              {displayWeek.feedback.map((fb) => (
                <p key={fb.id} className="text-sm text-gray-300">{fb.content}</p>
              ))}
            </div>
          )}

          {displayWeek.notes && (
            <p className="mt-2 text-sm text-gray-400 italic">"{displayWeek.notes}"</p>
          )}
        </div>
      )}

      {/* Session cards */}
      <div className="space-y-3">
        {sessions.map((session) => {
          const log = session.logs?.[0];
          const isComplete = !!log?.completedAt;
          const isInProgress = !!log?.startedAt && !log.completedAt;
          const totalExercises = session.sections?.reduce((acc, s) => acc + (s.rows?.length ?? 0), 0) ?? 0;

          return (
            <button
              key={session.id}
              onClick={() => navigate(`/trainee/session/${session.id}`)}
              className={`w-full card text-left transition-all hover:border-gray-600 active:scale-[0.99] ${
                isComplete
                  ? 'border-brand-800/60 bg-brand-900/10'
                  : isInProgress
                  ? 'border-amber-800/60 bg-amber-900/10'
                  : 'hover:bg-gray-800/60'
              }`}
            >
              <div className="flex items-center gap-3">
                {isComplete ? (
                  <CheckCircle2 size={22} className="text-brand-500 flex-shrink-0" />
                ) : isInProgress ? (
                  <Clock size={22} className="text-amber-500 flex-shrink-0 animate-pulse" />
                ) : (
                  <PlayCircle size={22} className="text-gray-600 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-100">{session.name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500">{totalExercises} exercises</span>
                    {isComplete && log?.completedAt && (
                      <Badge variant="green">Done {formatDate(log.completedAt)}</Badge>
                    )}
                    {isInProgress && (
                      <Badge variant="yellow">In progress</Badge>
                    )}
                  </div>

                  {/* Exercise preview */}
                  {!isComplete && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {session.sections?.flatMap((s) => s.rows ?? []).slice(0, 4).map((row) => (
                        <span
                          key={row.id}
                          className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400"
                        >
                          {row.exercise?.name}
                          {' '}
                          <span className="text-gray-600">
                            {row.sets}×{formatVolumeLabel(row.volumeType, row.volumeValue)}
                          </span>
                        </span>
                      ))}
                      {totalExercises > 4 && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-600">
                          +{totalExercises - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
              </div>
            </button>
          );
        })}

        {sessions.length === 0 && (
          <div className="card text-center py-10 text-gray-500">
            No sessions planned for this week.
          </div>
        )}
      </div>
    </div>
  );
}

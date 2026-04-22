import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Clock, Calendar, ChevronDown, ChevronRight, ExternalLink, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import type { PlanDto, SessionDto, SessionLogDto, RowLogDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatVolumeLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { addDays, parseISO, isWithinInterval } from 'date-fns';

function RPESelector({
  value,
  onChange,
}: {
  value: number | null | undefined;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-7 h-7 rounded text-xs font-medium transition-colors ${
            value === n
              ? n <= 3
                ? 'bg-brand-600 text-white'
                : n <= 7
                ? 'bg-yellow-600 text-white'
                : 'bg-red-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

export function TraineePlanPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['trainee-plans'],
    queryFn: () => api.get<PlanDto[]>('/plans/trainee'),
  });

  const { data: sessionLog, refetch: refetchLog } = useQuery({
    queryKey: ['session-log', activeSessionId],
    queryFn: () => api.get<SessionLogDto | null>(`/logs/session/${activeSessionId}`),
    enabled: !!activeSessionId,
  });

  const upsertSessionLog = useMutation({
    mutationFn: (data: { sessionId: string; performedOn?: string | null; completedAt?: string | null }) =>
      api.post<SessionLogDto>('/logs/session', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-log', activeSessionId] });
      qc.invalidateQueries({ queryKey: ['trainee-plans'] });
    },
  });

  const upsertRowLog = useMutation({
    mutationFn: ({
      sessionLogId,
      rowId,
      rpe,
      notes,
    }: {
      sessionLogId: string;
      rowId: string;
      rpe?: number | null;
      notes?: string | null;
    }) => api.post<RowLogDto>(`/logs/row/${sessionLogId}`, { rowId, rpe, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-log', activeSessionId] });
    },
  });

  function toggleSession(id: string) {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const currentPlan = selectedPlanId
    ? plans.find((p) => p.id === selectedPlanId)
    : plans[0] ?? null;

  // Find current week
  const today = new Date();
  const currentWeek =
    currentPlan?.weeks?.find((w) => {
      const start = parseISO(w.startDate as unknown as string);
      const end = addDays(start, 6);
      return isWithinInterval(today, { start, end });
    }) ??
    currentPlan?.weeks?.[currentPlan.weeks.length - 1] ??
    null;

  const displayWeek =
    selectedWeekId
      ? currentPlan?.weeks?.find((w) => w.id === selectedWeekId) ?? currentWeek
      : currentWeek;

  function getRowLog(rowId: string): RowLogDto | undefined {
    return sessionLog?.rowLogs.find((l) => l.rowId === rowId);
  }

  async function handleMarkComplete(sessionId: string) {
    await upsertSessionLog.mutateAsync({
      sessionId,
      completedAt: new Date().toISOString(),
    });
  }

  async function handleSetPerformedOn(sessionId: string, date: string) {
    await upsertSessionLog.mutateAsync({ sessionId, performedOn: date });
  }

  if (isLoading) return <div className="p-6 text-gray-500">Loading your plan...</div>;

  if (!currentPlan) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-400 text-lg font-medium">No training plan yet</p>
          <p className="text-gray-600 text-sm mt-2">Your trainer hasn't assigned a plan yet. Check back soon!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      {/* Plan selector */}
      {plans.length > 1 && (
        <div>
          <label className="label">Plan</label>
          <select
            className="input"
            value={selectedPlanId ?? plans[0]?.id ?? ''}
            onChange={(e) => setSelectedPlanId(e.target.value)}
          >
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Week selector */}
      {currentPlan.weeks && currentPlan.weeks.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {currentPlan.weeks.map((week) => (
            <button
              key={week.id}
              onClick={() => setSelectedWeekId(week.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                displayWeek?.id === week.id
                  ? 'bg-brand-900/60 text-brand-400 border border-brand-800/50'
                  : 'bg-gray-800 text-gray-400 hover:text-gray-200'
              }`}
            >
              Week {week.weekNumber}
            </button>
          ))}
        </div>
      )}

      {/* Week header */}
      {displayWeek && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-white">{currentPlan.name}</h1>
              <p className="text-sm text-gray-400">
                Week {displayWeek.weekNumber} · {formatDate(displayWeek.startDate as unknown as string)}
              </p>
            </div>
          </div>

          {/* Trainer feedback summary */}
          {displayWeek.feedback && displayWeek.feedback.length > 0 && (
            <div className="mt-3 p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
              <p className="text-xs font-semibold text-blue-400 mb-1 flex items-center gap-1">
                <MessageSquare size={12} />
                Trainer feedback
              </p>
              {displayWeek.feedback.map((fb: { id: string; content: string; author?: { name: string } }) => (
                <p key={fb.id} className="text-sm text-gray-300">
                  {fb.content}
                </p>
              ))}
            </div>
          )}

          {displayWeek.notes && (
            <p className="mt-2 text-sm text-gray-400 italic">"{displayWeek.notes}"</p>
          )}
        </div>
      )}

      {/* Sessions */}
      {displayWeek?.sessions?.map((session) => {
        const log = sessionLog && activeSessionId === session.id ? sessionLog : null;
        const isExpanded = expandedSessions.has(session.id);
        const isComplete = !!log?.completedAt;
        const isActive = activeSessionId === session.id;

        return (
          <div key={session.id} className={`card transition-all ${isComplete ? 'border-brand-800/50' : ''}`}>
            {/* Session header */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (!isActive) {
                    setActiveSessionId(session.id);
                    refetchLog();
                  }
                  toggleSession(session.id);
                }}
                className="flex items-center gap-3 flex-1 text-left"
              >
                {isComplete ? (
                  <CheckCircle2 size={20} className="text-brand-500 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-700 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-gray-100">{session.name}</p>
                  <p className="text-xs text-gray-500">
                    {session.sections?.reduce((acc, s) => acc + (s.rows?.length ?? 0), 0)} exercises
                  </p>
                </div>
                {isExpanded ? (
                  <ChevronDown size={16} className="text-gray-500 ml-auto" />
                ) : (
                  <ChevronRight size={16} className="text-gray-500 ml-auto" />
                )}
              </button>

              {!isComplete && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    setActiveSessionId(session.id);
                    toggleSession(session.id);
                  }}
                >
                  Start
                </Button>
              )}
            </div>

            {/* Session body */}
            {isExpanded && (
              <div className="mt-4 space-y-4">
                {/* Date picker + complete button */}
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Calendar size={14} className="text-gray-500" />
                    <input
                      type="date"
                      className="input text-sm py-1.5 w-40"
                      value={log?.performedOn ? log.performedOn.split('T')[0] : ''}
                      onChange={(e) => {
                        if (!activeSessionId) setActiveSessionId(session.id);
                        handleSetPerformedOn(session.id, e.target.value);
                      }}
                    />
                  </div>
                  {!isComplete && (
                    <Button
                      size="sm"
                      variant="primary"
                      loading={upsertSessionLog.isPending}
                      onClick={() => handleMarkComplete(session.id)}
                    >
                      <CheckCircle2 size={14} />
                      Mark Complete
                    </Button>
                  )}
                  {isComplete && (
                    <Badge variant="green">
                      <CheckCircle2 size={10} className="mr-1" />
                      Completed {log?.completedAt ? formatDate(log.completedAt) : ''}
                    </Badge>
                  )}
                </div>

                {/* Sections and exercises */}
                {session.sections?.map((section) => (
                  <div key={section.id}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-px flex-1 bg-gray-800" />
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {section.name}
                      </span>
                      <div className="h-px flex-1 bg-gray-800" />
                    </div>

                    <div className="space-y-3">
                      {section.rows?.map((row) => {
                        const rowLog = log ? getRowLog(row.id) : null;
                        const hasGroupSiblings = row.groupKey &&
                          section.rows?.filter((r) => r.groupKey === row.groupKey).length! > 1;

                        return (
                          <div
                            key={row.id}
                            className={`p-3 rounded-lg bg-gray-800/50 ${
                              hasGroupSiblings ? 'border-l-2 border-l-brand-600' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium text-gray-100 text-sm">
                                    {row.exercise?.name}
                                  </p>
                                  {row.variant && (
                                    <Badge variant="blue">{row.variant.name}</Badge>
                                  )}
                                  {hasGroupSiblings && (
                                    <Badge variant="purple">Superset</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {row.sets} × {formatVolumeLabel(row.volumeType, row.volumeValue)}
                                  {row.restMinutes > 0 && ` · Rest ${row.restMinutes}min`}
                                  {row.breakMinutes > 0 && ` · Break ${row.breakMinutes}min`}
                                </p>

                                {/* Trainer row feedback */}
                                {row.feedback && row.feedback.length > 0 && (
                                  <div className="mt-1 p-1.5 bg-blue-900/20 border border-blue-800/20 rounded text-xs text-blue-300">
                                    {row.feedback[0]?.content}
                                  </div>
                                )}
                              </div>

                              {/* Video link */}
                              {(row.variant?.videoUrl ?? row.exercise?.videoUrl) && (
                                <a
                                  href={row.variant?.videoUrl ?? row.exercise?.videoUrl ?? '#'}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn-ghost p-1.5 flex-shrink-0"
                                >
                                  <ExternalLink size={14} />
                                </a>
                              )}
                            </div>

                            {/* Trainee input */}
                            {isActive && log && (
                              <div className="mt-3 space-y-2">
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">RPE (effort 1-10)</p>
                                  <RPESelector
                                    value={rowLog?.rpe}
                                    onChange={(rpe) =>
                                      upsertRowLog.mutate({
                                        sessionLogId: log.id,
                                        rowId: row.id,
                                        rpe,
                                        notes: rowLog?.notes,
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <p className="text-xs text-gray-400 mb-1">Notes</p>
                                  <textarea
                                    value={rowLog?.notes ?? ''}
                                    onChange={(e) =>
                                      upsertRowLog.mutate({
                                        sessionLogId: log.id,
                                        rowId: row.id,
                                        rpe: rowLog?.rpe,
                                        notes: e.target.value,
                                      })
                                    }
                                    rows={2}
                                    className="input resize-none text-sm"
                                    placeholder="How did it feel? Any pain? Notes..."
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {displayWeek?.sessions?.length === 0 && (
        <div className="card text-center py-10 text-gray-500">
          No sessions planned for this week.
        </div>
      )}
    </div>
  );
}

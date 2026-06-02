import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, CheckCircle2, Clock, Dumbbell } from 'lucide-react';
import { api } from '@/lib/api';
import { formatDate, formatDuration, formatVolumeLabel } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { useAuthStore } from '@/store/authStore';

interface RowLogFull {
  id: string;
  rowId: string;
  rpe?: number | null;
  notes?: string | null;
}

interface RowFull {
  id: string;
  order: number;
  exercise?: { name: string } | null;
  variant?: { name: string } | null;
  volumeType: string;
  volumeValue: string;
  sets: number;
}

interface SectionFull {
  id: string;
  name: string;
  order: number;
  rows: RowFull[];
}

interface SessionFull {
  id: string;
  name: string;
  sections: SectionFull[];
  week: {
    weekNumber: number;
    plan: { name: string };
  };
}

interface SessionLogFull {
  id: string;
  sessionId: string;
  startedAt?: string | null;
  performedOn?: string | null;
  completedAt?: string | null;
  rowLogs: RowLogFull[];
  session: SessionFull;
}

function RPEChip({ value }: { value: number }) {
  const color = value <= 3 ? 'bg-emerald-900/40 text-emerald-400' : value <= 6 ? 'bg-amber-900/40 text-amber-400' : 'bg-red-900/40 text-red-400';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {value}/10
    </span>
  );
}

function SessionCard({ log }: { log: SessionLogFull }) {
  const [expanded, setExpanded] = useState(false);
  const isComplete = !!log.completedAt;
  const durationMs =
    log.startedAt && log.completedAt
      ? new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()
      : null;

  const allRows = log.session.sections
    .sort((a, b) => a.order - b.order)
    .flatMap((s) => s.rows.sort((a, b) => a.order - b.order));

  return (
    <div className="card overflow-hidden">
      <button className="w-full text-left" onClick={() => setExpanded((e) => !e)}>
        <div className="flex items-center gap-3">
          {isComplete ? (
            <CheckCircle2 size={18} className="text-brand-500 flex-shrink-0" />
          ) : (
            <Clock size={18} className="text-amber-500 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-100">{log.session.name}</p>
            <p className="text-xs text-gray-500">
              {log.session.week.plan.name} · Week {log.session.week.weekNumber}
            </p>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {log.performedOn && (
                <span className="text-xs text-gray-500">{formatDate(log.performedOn)}</span>
              )}
              {durationMs && (
                <span className="text-xs text-gray-500">{formatDuration(durationMs)}</span>
              )}
              {!isComplete && <Badge variant="yellow">In progress</Badge>}
            </div>
          </div>
          {expanded ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronRight size={16} className="text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-4 space-y-3 border-t border-gray-800 pt-4">
          {allRows.map((row) => {
            const rowLog = log.rowLogs.find((l) => l.rowId === row.id);
            return (
              <div key={row.id} className="flex items-start gap-3 p-3 bg-gray-800/50 rounded-lg">
                <Dumbbell size={14} className="text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-100">{row.exercise?.name}</p>
                    {row.variant && <Badge variant="blue">{row.variant.name}</Badge>}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {row.sets}×{formatVolumeLabel(row.volumeType, row.volumeValue)}
                  </p>
                  {rowLog && (
                    <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                      {rowLog.rpe && <RPEChip value={rowLog.rpe} />}
                      {rowLog.notes && (
                        <p className="text-xs text-gray-400 italic">"{rowLog.notes}"</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TraineeHistoryPage() {
  const { user } = useAuthStore();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['my-logs', user?.id],
    queryFn: () => api.get<SessionLogFull[]>(`/logs/trainee/${user!.id}`),
    enabled: !!user?.id,
  });

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading history...</div>;
  }

  const completedLogs = logs.filter((l) => l.completedAt);
  const inProgressLogs = logs.filter((l) => l.startedAt && !l.completedAt);

  if (logs.length === 0) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Dumbbell size={40} className="mx-auto mb-3 text-gray-700" />
          <p className="text-gray-400 text-lg font-medium">No sessions logged yet</p>
          <p className="text-gray-600 text-sm mt-1">Complete your first session to see it here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Session History</h1>
        <p className="text-gray-400 text-sm mt-1">{completedLogs.length} sessions completed</p>
      </div>

      {inProgressLogs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">In Progress</h2>
          <div className="space-y-3">
            {inProgressLogs.map((log) => <SessionCard key={log.id} log={log} />)}
          </div>
        </section>
      )}

      {completedLogs.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Completed</h2>
          <div className="space-y-3">
            {completedLogs.map((log) => <SessionCard key={log.id} log={log} />)}
          </div>
        </section>
      )}
    </div>
  );
}

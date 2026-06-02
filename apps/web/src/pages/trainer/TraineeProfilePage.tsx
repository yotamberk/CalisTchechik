import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { TrendingUp, ChevronLeft, Dumbbell, Clock, CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { TraineeProfileDto } from '@calist/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatVolumeLabel, formatDuration } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useState } from 'react';

interface ProgressPoint {
  date: string;
  variantName: string | null;
  volumeValue: string;
  volumeType: string;
  rpe: number | null;
}

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
  week: { weekNumber: number; plan: { name: string } };
}

interface SessionLogFull {
  id: string;
  startedAt?: string | null;
  performedOn?: string | null;
  completedAt?: string | null;
  rowLogs: RowLogFull[];
  session: SessionFull;
}

function RPEChip({ value }: { value: number }) {
  const color = value <= 3 ? 'bg-emerald-900/40 text-emerald-400' : value <= 6 ? 'bg-amber-900/40 text-amber-400' : 'bg-red-900/40 text-red-400';
  return <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>{value}/10</span>;
}

function SessionHistoryCard({ log }: { log: SessionLogFull }) {
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
            <CheckCircle2 size={16} className="text-brand-500 flex-shrink-0" />
          ) : (
            <Clock size={16} className="text-amber-500 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-100 text-sm">{log.session.name}</p>
            <p className="text-xs text-gray-500">
              {log.session.week.plan.name} · Week {log.session.week.weekNumber}
            </p>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {log.performedOn && <span className="text-xs text-gray-500">{formatDate(log.performedOn)}</span>}
              {durationMs && <span className="text-xs text-gray-500">{formatDuration(durationMs)}</span>}
              {!isComplete && <Badge variant="yellow">In progress</Badge>}
            </div>
          </div>
          {expanded ? <ChevronDown size={14} className="text-gray-500" /> : <ChevronRight size={14} className="text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 border-t border-gray-800 pt-3">
          {allRows.map((row) => {
            const rowLog = log.rowLogs.find((l) => l.rowId === row.id);
            return (
              <div key={row.id} className="flex items-start gap-2 p-2 bg-gray-800/50 rounded-lg">
                <Dumbbell size={12} className="text-gray-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium text-gray-200">{row.exercise?.name}</p>
                    {row.variant && <Badge variant="blue">{row.variant.name}</Badge>}
                  </div>
                  <p className="text-xs text-gray-600">{row.sets}×{formatVolumeLabel(row.volumeType, row.volumeValue)}</p>
                  {rowLog && (
                    <div className="mt-1 flex items-center gap-2 flex-wrap">
                      {rowLog.rpe && <RPEChip value={rowLog.rpe} />}
                      {rowLog.notes && <p className="text-xs text-gray-400 italic">"{rowLog.notes}"</p>}
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

export function TraineeProfilePage() {
  const { traineeId } = useParams<{ traineeId: string }>();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['trainee-profile', traineeId],
    queryFn: () => api.get<TraineeProfileDto>(`/trainees/${traineeId}/profile`),
    enabled: !!traineeId,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['trainee-progress', traineeId, selectedExercise],
    queryFn: () =>
      api.get<ProgressPoint[]>(`/trainees/${traineeId}/progress/${selectedExercise}`),
    enabled: !!traineeId && !!selectedExercise,
  });

  const { data: sessionLogs = [] } = useQuery({
    queryKey: ['trainee-logs', traineeId],
    queryFn: () => api.get<SessionLogFull[]>(`/logs/trainee/${traineeId}`),
    enabled: !!traineeId,
  });

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading trainee profile...</div>;
  }

  if (!profile) {
    return <div className="p-6 text-gray-500">Trainee not found.</div>;
  }

  const { user, currentVariants } = profile;
  const completedLogs = sessionLogs.filter((l) => l.completedAt);
  const inProgressLogs = sessionLogs.filter((l) => l.startedAt && !l.completedAt);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <Link to="/trainer/trainees" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-200">
        <ChevronLeft size={16} />
        Back to trainees
      </Link>

      {/* Profile header */}
      <div className="card flex items-center gap-4">
        <Avatar name={user.name} src={user.avatar} size="xl" />
        <div>
          <h1 className="text-2xl font-bold text-white">{user.name}</h1>
          <p className="text-gray-400">{user.email}</p>
          <p className="text-xs text-gray-500 mt-1">Member since {formatDate(user.createdAt)}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-3xl font-bold text-brand-400">{completedLogs.length}</p>
          <p className="text-xs text-gray-500">sessions done</p>
        </div>
      </div>

      {/* Current exercise status */}
      <section>
        <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2 mb-3">
          <Dumbbell size={16} className="text-brand-400" />
          Current Exercise Status
        </h2>

        {currentVariants.length === 0 ? (
          <div className="card text-center py-8 text-gray-500">
            No completed sessions yet.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentVariants.map((cv) => (
              <button
                key={cv.exerciseId}
                onClick={() => setSelectedExercise(cv.exerciseId === selectedExercise ? null : cv.exerciseId)}
                className={`card text-left hover:border-gray-700 transition-colors ${
                  selectedExercise === cv.exerciseId ? 'border-brand-600 bg-brand-900/20' : ''
                }`}
              >
                <p className="font-medium text-gray-100 text-sm">{cv.exerciseName}</p>
                {cv.variantName && (
                  <Badge variant="blue" className="mt-1">{cv.variantName}</Badge>
                )}
                <p className="text-brand-400 font-semibold mt-1 text-sm">
                  {formatVolumeLabel(cv.volumeType, cv.volumeValue)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{formatDate(cv.performedOn)}</p>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Progress graph */}
      {selectedExercise && (
        <section>
          <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2 mb-3">
            <TrendingUp size={16} className="text-brand-400" />
            Progress: {currentVariants.find((cv) => cv.exerciseId === selectedExercise)?.exerciseName}
          </h2>

          {progress.length < 2 ? (
            <div className="card text-center py-8 text-gray-500 text-sm">
              Not enough data yet to show a graph. Complete more sessions.
            </div>
          ) : (
            <div className="card">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={progress} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} width={30} />
                  <Tooltip
                    contentStyle={{ background: '#111827', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
                    labelFormatter={(v) => formatDate(v)}
                    formatter={(value, name) => [value, name === 'rpe' ? 'Difficulty' : 'Volume']}
                  />
                  <Line
                    type="monotone"
                    dataKey="rpe"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 3 }}
                    name="Difficulty"
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2">Difficulty (1–10) over time</p>
            </div>
          )}
        </section>
      )}

      {/* Session History */}
      <section>
        <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2 mb-3">
          <Clock size={16} className="text-brand-400" />
          Session History
        </h2>

        {sessionLogs.length === 0 ? (
          <div className="card text-center py-8 text-gray-500">No sessions logged yet.</div>
        ) : (
          <div className="space-y-3">
            {inProgressLogs.length > 0 && (
              <>
                <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">In Progress</p>
                {inProgressLogs.map((log) => <SessionHistoryCard key={log.id} log={log} />)}
              </>
            )}
            {completedLogs.length > 0 && (
              <>
                <p className="text-xs text-gray-600 uppercase tracking-wide font-medium">Completed</p>
                {completedLogs.map((log) => <SessionHistoryCard key={log.id} log={log} />)}
              </>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

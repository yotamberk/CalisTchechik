import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Dumbbell } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { TraineeProfileDto } from '@calist/shared';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatVolumeLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface ProgressPoint {
  date: string;
  variantName: string | null;
  volumeValue: string;
  volumeType: string;
  rpe: number | null;
}

export function TraineeProgressPage() {
  const { user } = useAuthStore();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: () => api.get<TraineeProfileDto>(`/trainees/${user?.id}/profile`),
    enabled: !!user?.id,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['my-progress', user?.id, selectedExercise],
    queryFn: () =>
      api.get<ProgressPoint[]>(`/trainees/${user?.id}/progress/${selectedExercise}`),
    enabled: !!user?.id && !!selectedExercise,
  });

  if (isLoading) return <div className="p-6 text-gray-500">Loading progress...</div>;
  if (!profile) return <div className="p-6 text-gray-500">No data yet.</div>;

  const { currentVariants } = profile;

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={24} className="text-brand-400" />
          My Progress
        </h1>
        <p className="text-gray-400 text-sm mt-1">Track your exercise milestones</p>
      </div>

      {/* Exercise status grid */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Dumbbell size={14} />
          Current Status
        </h2>

        {currentVariants.length === 0 ? (
          <div className="card text-center py-10 text-gray-500">
            Complete some sessions to see your progress here.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {currentVariants.map((cv) => (
              <button
                key={cv.exerciseId}
                onClick={() =>
                  setSelectedExercise(cv.exerciseId === selectedExercise ? null : cv.exerciseId)
                }
                className={`card text-left hover:border-gray-700 transition-colors ${
                  selectedExercise === cv.exerciseId ? 'border-brand-600 bg-brand-900/10' : ''
                }`}
              >
                <p className="font-semibold text-gray-100">{cv.exerciseName}</p>
                {cv.variantName && (
                  <Badge variant="blue" className="mt-1">
                    {cv.variantName}
                  </Badge>
                )}
                <p className="text-brand-400 font-bold text-lg mt-1">
                  {formatVolumeLabel(cv.volumeType, cv.volumeValue)}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">Last: {formatDate(cv.performedOn)}</p>
                <p className="text-xs text-brand-500 mt-1">Tap to see progress →</p>
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
            {currentVariants.find((cv) => cv.exerciseId === selectedExercise)?.exerciseName} — RPE over time
          </h2>

          {progress.length < 2 ? (
            <div className="card text-center py-8 text-gray-500 text-sm">
              Not enough data yet. Complete more sessions to see your progress graph.
            </div>
          ) : (
            <div className="card">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={progress} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                  />
                  <YAxis
                    domain={[1, 10]}
                    tickCount={5}
                    tick={{ fill: '#6b7280', fontSize: 11 }}
                    width={25}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#111827',
                      border: '1px solid #374151',
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    labelFormatter={(v) => formatDate(v)}
                    formatter={(value, name) => [value, 'RPE']}
                  />
                  <Line
                    type="monotone"
                    dataKey="rpe"
                    stroke="#22c55e"
                    strokeWidth={2.5}
                    dot={{ fill: '#22c55e', r: 4 }}
                    activeDot={{ r: 6 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

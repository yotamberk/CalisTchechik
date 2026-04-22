import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { TrendingUp, ChevronLeft, Dumbbell } from 'lucide-react';
import { api } from '@/lib/api';
import type { TraineeProfileDto } from '@calist/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatDate, formatVolumeLabel } from '@/lib/utils';
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

  if (isLoading) {
    return (
      <div className="p-6 text-gray-500">Loading trainee profile...</div>
    );
  }

  if (!profile) {
    return <div className="p-6 text-gray-500">Trainee not found.</div>;
  }

  const { user, currentVariants } = profile;

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
                    formatter={(value, name) => [value, name === 'rpe' ? 'RPE' : 'Volume']}
                  />
                  <Line
                    type="monotone"
                    dataKey="rpe"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: '#22c55e', r: 3 }}
                    name="RPE"
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-gray-500 mt-2">RPE over time (1-10)</p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

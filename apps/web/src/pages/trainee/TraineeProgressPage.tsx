import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Dumbbell, ChevronRight, X, Trophy, Target } from 'lucide-react';
import { api } from '@/lib/api';
import type { ExerciseProgressSummaryDto, ExerciseProgressPointDto } from '@calist/shared';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatVolumeLabel } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { useInfiniteVirtual } from '@/hooks/useInfiniteVirtual';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

// ---------------------------------------------------------------------------
// Exercise detail modal
// ---------------------------------------------------------------------------

function ExerciseDetailModal({
  summary,
  userId,
  onClose,
}: {
  summary: ExerciseProgressSummaryDto;
  userId: string;
  onClose: () => void;
}) {
  const { data: points = [], isLoading } = useQuery({
    queryKey: ['my-progress', userId, summary.exerciseId],
    queryFn: () =>
      api.get<ExerciseProgressPointDto[]>(
        `/trainees/${userId}/progress/${summary.exerciseId}`,
      ),
  });

  const hasVariants = summary.hasVariants && points.some((p) => p.variantDifficultyOrder !== null);

  return (
    <Modal
      open
      onClose={onClose}
      title={summary.exerciseName}
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center py-3">
            <p className="text-2xl font-bold text-brand-400">{summary.completedCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">Sets logged</p>
          </div>
          <div className="card text-center py-3">
            <p className="text-sm font-semibold text-white truncate">
              {summary.currentVariantName ?? formatVolumeLabel(summary.currentVolumeType, summary.currentVolumeValue)}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
              <Target size={10} /> Current
            </p>
          </div>
          {summary.maxVariantName && (
            <div className="card text-center py-3">
              <p className="text-sm font-semibold text-amber-400 truncate">{summary.maxVariantName}</p>
              <p className="text-xs text-gray-500 mt-0.5 flex items-center justify-center gap-1">
                <Trophy size={10} /> Best
              </p>
            </div>
          )}
        </div>

        {isLoading && (
          <div className="text-center text-gray-500 py-8">Loading progress...</div>
        )}

        {!isLoading && points.length < 2 && (
          <div className="card text-center py-8 text-gray-500 text-sm">
            Not enough data to show a chart yet. Complete more sessions.
          </div>
        )}

        {!isLoading && points.length >= 2 && (
          <div className="card">
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-3">
              Progress over time
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={points} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                />
                <YAxis
                  yAxisId="rpe"
                  domain={[1, 10]}
                  tickCount={5}
                  tick={{ fill: '#6b7280', fontSize: 10 }}
                  width={22}
                />
                {hasVariants && (
                  <YAxis
                    yAxisId="variant"
                    orientation="right"
                    tickFormatter={(v) => {
                      const pt = points.find((p) => p.variantDifficultyOrder === v);
                      return pt?.variantName?.split(' ')[0] ?? String(v);
                    }}
                    tick={{ fill: '#6b7280', fontSize: 9 }}
                    width={46}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    background: '#111827',
                    border: '1px solid #374151',
                    borderRadius: 8,
                    fontSize: 11,
                  }}
                  labelFormatter={(v) => formatDate(v)}
                  formatter={(value, name) => {
                    if (name === 'rpe') return [value, 'Difficulty'];
                    if (name === 'variantDifficultyOrder') {
                      const pt = points.find((p) => p.variantDifficultyOrder === value);
                      return [pt?.variantName ?? value, 'Variant'];
                    }
                    return [value, name];
                  }}
                />
                <Legend
                  formatter={(v) => v === 'rpe' ? 'Difficulty' : 'Variant level'}
                  wrapperStyle={{ fontSize: 11 }}
                />
                <Line
                  yAxisId="rpe"
                  type="monotone"
                  dataKey="rpe"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: '#22c55e', r: 3 }}
                  activeDot={{ r: 5 }}
                  connectNulls
                  name="rpe"
                />
                {hasVariants && (
                  <Line
                    yAxisId="variant"
                    type="stepAfter"
                    dataKey="variantDifficultyOrder"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b', r: 3 }}
                    connectNulls
                    name="variantDifficultyOrder"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
            <p className="text-xs text-gray-600 mt-2">
              Green = difficulty rating (1–10)
              {hasVariants && ' · Amber = variant progression'}
            </p>
          </div>
        )}

        {/* Recent log notes */}
        {points.filter((p) => p.notes).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Recent notes</p>
            {points
              .filter((p) => p.notes)
              .slice(-3)
              .reverse()
              .map((p, i) => (
                <div key={i} className="p-2 bg-gray-800/50 rounded-lg text-xs text-gray-400">
                  <span className="text-gray-600 mr-2">{formatDate(p.date)}</span>
                  {p.notes}
                </div>
              ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Exercise row card
// ---------------------------------------------------------------------------

function ExerciseCard({
  summary,
  onClick,
}: {
  summary: ExerciseProgressSummaryDto;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full card text-left hover:border-gray-600 active:scale-[0.99] transition-all flex items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-gray-100">{summary.exerciseName}</p>
          {summary.maxVariantName && (
            <span className="flex items-center gap-0.5 text-xs text-amber-400">
              <Trophy size={10} />
              {summary.maxVariantName}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 flex-wrap">
          <span className="text-sm text-brand-400 font-medium">
            {summary.currentVariantName
              ? summary.currentVariantName
              : formatVolumeLabel(summary.currentVolumeType, summary.currentVolumeValue)}
          </span>
          {summary.currentVariantName && summary.maxVariantName && summary.currentVariantName !== summary.maxVariantName && (
            <Badge variant="blue">Current: {summary.currentVariantName}</Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {summary.completedCount} sets · last {formatDate(summary.lastPerformedOn)}
        </p>
      </div>
      <ChevronRight size={16} className="text-gray-600 flex-shrink-0" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function TraineeProgressPage() {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<ExerciseProgressSummaryDto | null>(null);

  const { scrollRef, virtualizer, virtualItems, allItems, total, isLoading } =
    useInfiniteVirtual<ExerciseProgressSummaryDto>({
      queryKey: ['my-exercises', user?.id],
      fetchPage: (offset) =>
        api.get(`/trainees/${user!.id}/exercises?limit=20&offset=${offset}`),
      estimateSize: 88,
      overscan: 4,
    });

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading progress...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-2 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={22} className="text-brand-400" />
          My Progress
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          {total} exercise{total !== 1 ? 's' : ''} tracked
        </p>
      </div>

      {/* Virtualized list */}
      {allItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Dumbbell size={40} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-400 font-medium">No exercises logged yet</p>
            <p className="text-gray-600 text-sm mt-1">Complete some sessions to see your progress here.</p>
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 max-w-2xl mx-auto w-full"
        >
          <div
            style={{ height: virtualizer.getTotalSize(), position: 'relative' }}
          >
            {virtualItems.map((vItem) => {
              const item = allItems[vItem.index];
              return (
                <div
                  key={vItem.index}
                  data-index={vItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vItem.start}px)`,
                    paddingBottom: 10,
                  }}
                >
                  {item ? (
                    <ExerciseCard summary={item} onClick={() => setSelected(item)} />
                  ) : (
                    <div className="card text-center py-3 text-gray-600 text-sm">
                      Loading more...
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detail modal */}
      {selected && user && (
        <ExerciseDetailModal
          summary={selected}
          userId={user.id}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

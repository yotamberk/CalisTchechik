import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, Dumbbell, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { SessionTimelineItemDto, SessionLogDetailDto } from '@calist/shared';
import { formatDate, formatDuration } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';
import { useInfiniteVirtual } from '@/hooks/useInfiniteVirtual';

// ---------------------------------------------------------------------------
// Virtual row types — items OR date-group headers
// ---------------------------------------------------------------------------

type VirtualRow =
  | { kind: 'header'; dateLabel: string }
  | { kind: 'item'; log: SessionTimelineItemDto };

function buildVirtualRows(items: SessionTimelineItemDto[]): VirtualRow[] {
  const rows: VirtualRow[] = [];
  let lastLabel = '';
  for (const item of items) {
    const d = item.performedOn ?? item.startedAt ?? item.completedAt;
    const label = d
      ? new Date(d).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
      : 'Unknown date';
    if (label !== lastLabel) {
      rows.push({ kind: 'header', dateLabel: label });
      lastLabel = label;
    }
    rows.push({ kind: 'item', log: item });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Session detail modal
// ---------------------------------------------------------------------------

function SessionDetailModal({ logId, onClose }: { logId: string; onClose: () => void }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['session-log-detail', logId],
    queryFn: () => api.get<SessionLogDetailDto>(`/logs/session-log/${logId}`),
  });

  return (
    <Modal open onClose={onClose} title={detail?.sessionName ?? 'Session Detail'} className="max-w-lg">
      {isLoading ? (
        <div className="py-8 text-center text-gray-500">Loading...</div>
      ) : !detail ? (
        <div className="py-8 text-center text-gray-500">Not found.</div>
      ) : (
        <div className="space-y-4">
          {/* Meta */}
          <div className="flex items-center gap-4 flex-wrap text-sm text-gray-400">
            <span>{detail.planName} · Week {detail.weekNumber}</span>
            {detail.performedOn && <span>{formatDate(detail.performedOn)}</span>}
            {detail.durationMs && (
              <span className="text-brand-400 font-medium">{formatDuration(detail.durationMs)}</span>
            )}
            {detail.completedAt ? (
              <Badge variant="green">Completed</Badge>
            ) : (
              <Badge variant="yellow">In progress</Badge>
            )}
          </div>

          {/* Exercise rows */}
          <div className="space-y-2 max-h-[55vh] overflow-y-auto">
            {detail.rows.map((row) => (
              <div key={row.rowId} className="p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-100">{row.exerciseName}</p>
                  {row.variantName && <Badge variant="blue">{row.variantName}</Badge>}
                  {row.skipRating && (
                    <span className="text-xs text-amber-400 font-medium">Warm-up</span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {row.sets} sets · {row.volumeType === 'TIME_SEC'
                    ? `${row.volumeValue}"`
                    : row.volumeType === 'MAX_HOLD'
                    ? 'Max Hold'
                    : row.volumeType === 'MAX'
                    ? 'Max Reps'
                    : `${row.volumeValue} reps`}
                </p>
                {!row.skipRating && (
                  <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                    {row.rpe != null && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        row.rpe <= 3 ? 'bg-emerald-900/40 text-emerald-400'
                        : row.rpe <= 6 ? 'bg-amber-900/40 text-amber-400'
                        : 'bg-red-900/40 text-red-400'
                      }`}>
                        {row.rpe}/10
                      </span>
                    )}
                    {row.notes && (
                      <p className="text-xs text-gray-400 italic">"{row.notes}"</p>
                    )}
                    {row.rpe == null && (
                      <span className="text-xs text-gray-600">—</span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Timeline item
// ---------------------------------------------------------------------------

function TimelineItem({
  log,
  onClick,
}: {
  log: SessionTimelineItemDto;
  onClick: () => void;
}) {
  const durationMs = log.durationMs;

  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-3 py-2 group"
    >
      {/* Rail */}
      <div className="flex flex-col items-center flex-shrink-0 mt-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          log.completed ? 'bg-brand-900/60 border border-brand-700' : 'bg-amber-900/40 border border-amber-700'
        }`}>
          {log.completed
            ? <CheckCircle2 size={15} className="text-brand-400" />
            : <Clock size={15} className="text-amber-400" />
          }
        </div>
        <div className="w-px flex-1 bg-gray-800 mt-1" style={{ minHeight: 16 }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-2 border-b border-gray-800/60 group-last:border-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-100 text-sm group-hover:text-white transition-colors">
              {log.sessionName}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {log.planName} · Week {log.weekNumber}
            </p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs text-gray-600">{log.exerciseCount} exercises</span>
              {durationMs && (
                <span className="text-xs text-brand-400">{formatDuration(durationMs)}</span>
              )}
              {!log.completed && <Badge variant="yellow">In progress</Badge>}
            </div>
          </div>
          <ChevronRight size={14} className="text-gray-600 flex-shrink-0 mt-1 group-hover:text-gray-400 transition-colors" />
        </div>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export function TraineeHistoryPage() {
  const { user } = useAuthStore();
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  const { scrollRef, virtualizer, virtualItems, allItems, total, isLoading, isFetchingNextPage } =
    useInfiniteVirtual<SessionTimelineItemDto>({
      queryKey: ['my-timeline', user?.id],
      fetchPage: (offset) =>
        api.get(`/logs/trainee/${user!.id}/timeline?limit=20&offset=${offset}`),
      estimateSize: 80,
      overscan: 4,
    });

  // Build virtual rows (with date-group headers inserted)
  const virtualRows = buildVirtualRows(allItems);

  if (isLoading) {
    return <div className="p-6 text-gray-500">Loading history...</div>;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-shrink-0 p-4 pb-2 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-white">History</h1>
        <p className="text-gray-400 text-sm mt-1">
          {total} session{total !== 1 ? 's' : ''} logged
        </p>
      </div>

      {allItems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Dumbbell size={40} className="mx-auto mb-3 text-gray-700" />
            <p className="text-gray-400 font-medium">No sessions logged yet</p>
            <p className="text-gray-600 text-sm mt-1">Complete your first session to see it here.</p>
          </div>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto px-4 max-w-2xl mx-auto w-full"
        >
          {/*
            For the virtualized timeline we virtualise the flat `allItems`
            but render the full `virtualRows` list inside a positioned container.
            We keep an absolute-positioning approach keyed to allItems for
            correct offset tracking, and insert headers inline.
          */}
          <div style={{ position: 'relative', height: virtualizer.getTotalSize() }}>
            {virtualItems.map((vItem) => {
              const log = allItems[vItem.index];
              // Gather virtual rows up to and including this index to find headers
              const vRows = buildVirtualRows(allItems.slice(0, vItem.index + 1));
              const prevVRows = buildVirtualRows(allItems.slice(0, vItem.index));
              const newHeaders = vRows
                .filter((r) => r.kind === 'header')
                .filter((r) => !prevVRows.some((pr) => pr.kind === 'header' && pr.dateLabel === r.dateLabel));

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
                  }}
                >
                  {newHeaders.map((h) => (
                    <div
                      key={h.kind === 'header' ? h.dateLabel : ''}
                      className="pt-4 pb-1"
                    >
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {h.kind === 'header' ? h.dateLabel : ''}
                      </p>
                    </div>
                  ))}
                  {log && (
                    <TimelineItem log={log} onClick={() => setSelectedLogId(log.logId)} />
                  )}
                </div>
              );
            })}
          </div>
          {isFetchingNextPage && (
            <div className="py-4 text-center text-xs text-gray-600">Loading more...</div>
          )}
        </div>
      )}

      {selectedLogId && (
        <SessionDetailModal logId={selectedLogId} onClose={() => setSelectedLogId(null)} />
      )}
    </div>
  );
}

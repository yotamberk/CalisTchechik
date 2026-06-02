import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  List,
  X,
  Settings,
  CheckCircle2,
  MessageSquare,
  Flame,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { PlanDto, SessionLogDto, ExerciseRowDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatVolumeLabel, cn } from '@/lib/utils';
import { Timer } from '@/components/trainee/Timer';
import { RestTimer } from '@/components/trainee/RestTimer';
import { RatingInput } from '@/components/trainee/RatingInput';
import { Celebration } from '@/components/trainee/Celebration';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type StepKind = 'set' | 'rest' | 'rate';

interface Step {
  kind: StepKind;
  row: ExerciseRowDto;
  setIndex: number;  // 1-based, for 'set' and 'rest'
  totalSets: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSteps(rows: ExerciseRowDto[]): Step[] {
  const steps: Step[] = [];
  for (const row of rows) {
    for (let i = 1; i <= row.sets; i++) {
      steps.push({ kind: 'set', row, setIndex: i, totalSets: row.sets });
      if (i < row.sets && row.restMinutes > 0) {
        steps.push({ kind: 'rest', row, setIndex: i, totalSets: row.sets });
      }
    }
    // Skip the rating step for warm-up exercises
    if (!row.skipRating) {
      steps.push({ kind: 'rate', row, setIndex: row.sets, totalSets: row.sets });
    }
  }
  return steps;
}

function getAllRows(plan: PlanDto, sessionId: string): ExerciseRowDto[] {
  for (const week of plan.weeks ?? []) {
    for (const session of week.sessions ?? []) {
      if (session.id === sessionId) {
        return (session.sections ?? [])
          .sort((a, b) => a.order - b.order)
          .flatMap((s) => (s.rows ?? []).sort((a, b) => a.order - b.order));
      }
    }
  }
  return [];
}

function getSessionName(plan: PlanDto, sessionId: string): string {
  for (const week of plan.weeks ?? []) {
    for (const session of week.sessions ?? []) {
      if (session.id === sessionId) return session.name;
    }
  }
  return 'Session';
}

const BUFFER_KEY = 'calist_buffer_seconds';
const STEP_KEY = (sessionId: string) => `calist_step_${sessionId}`;

// ---------------------------------------------------------------------------
// Overview screen (before starting)
// ---------------------------------------------------------------------------

function SessionOverview({
  rows,
  sessionName,
  existingLog,
  onStart,
}: {
  rows: ExerciseRowDto[];
  sessionName: string;
  existingLog: SessionLogDto | null | undefined;
  onStart: () => void;
}) {
  const isComplete = !!existingLog?.completedAt;
  const isResume = !!existingLog?.startedAt && !isComplete;

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">{sessionName}</h1>
            <p className="text-gray-400 text-sm">{rows.length} exercises</p>
          </div>
          {isComplete && (
            <Badge variant="green">
              <CheckCircle2 size={12} className="mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row, i) => {
          const isTimed = row.volumeType === 'TIME_SEC' || row.volumeType === 'MAX_HOLD';
          const videoUrl = row.variant?.videoUrl ?? row.exercise?.videoUrl;
          return (
            <div key={row.id} className="card flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-gray-800 text-xs font-bold text-gray-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-100 text-sm">{row.exercise?.name}</p>
                  {row.variant && <Badge variant="blue">{row.variant.name}</Badge>}
                  {isTimed && <Badge variant="purple">Timed</Badge>}
                  {row.groupKey && <Badge variant="purple">Superset {row.groupKey}</Badge>}
                  {row.skipRating && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-400 font-medium">
                      <Flame size={10} /> Warm-up
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {row.sets} sets × {formatVolumeLabel(row.volumeType, row.volumeValue)}
                  {row.restMinutes > 0 && ` · ${row.restMinutes}min rest`}
                </p>
                {row.feedback && row.feedback.length > 0 && (
                  <div className="mt-1 flex items-start gap-1">
                    <MessageSquare size={10} className="text-blue-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-300 italic">{row.feedback[0]?.content}</p>
                  </div>
                )}
              </div>
              {videoUrl && (
                <a href={videoUrl} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-brand-400 flex-shrink-0">
                  <ExternalLink size={14} />
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-4 space-y-2">
        <Button variant="primary" className="w-full text-base py-3" onClick={onStart}>
          {isComplete ? '🔁 Review / Redo Session' : isResume ? '▶ Continue Session' : '🏋️ Go for it!'}
        </Button>
        {isComplete && (
          <p className="text-center text-xs text-gray-500">
            Your previous ratings will be pre-filled. Saving new ratings will overwrite them.
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main player
// ---------------------------------------------------------------------------

export function SessionPlayerPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  // -- Buffer setting --
  const [bufferSeconds, setBufferSeconds] = useState(() => {
    const stored = localStorage.getItem(BUFFER_KEY);
    return stored ? parseInt(stored) : 3;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [showOverview, setShowOverview] = useState(true);
  const [celebrating, setCelebrating] = useState(false);

  // -- Step index (persisted) --
  const [stepIndex, setStepIndex] = useState(() => {
    if (!sessionId) return 0;
    const stored = localStorage.getItem(STEP_KEY(sessionId));
    return stored ? parseInt(stored) : 0;
  });

  // -- Data --
  const { data: plans = [] } = useQuery({
    queryKey: ['trainee-plans'],
    queryFn: () => api.get<PlanDto[]>('/plans/trainee'),
  });

  // Search all plans for the session (not just plans[0]) so completed sessions
  // from older plans are still accessible.
  const plan = useMemo(
    () => plans.find((p) => p.weeks?.some((w) => w.sessions?.some((s) => s.id === sessionId))) ?? plans[0] ?? null,
    [plans, sessionId],
  );
  const rows = useMemo(() => (plan && sessionId ? getAllRows(plan, sessionId) : []), [plan, sessionId]);
  const sessionName = useMemo(() => (plan && sessionId ? getSessionName(plan, sessionId) : 'Session'), [plan, sessionId]);
  const steps = useMemo(() => buildSteps(rows), [rows]);

  const { data: sessionLog, refetch: refetchLog } = useQuery({
    queryKey: ['session-log', sessionId],
    queryFn: () => api.get<SessionLogDto | null>(`/logs/session/${sessionId}`),
    enabled: !!sessionId,
  });

  const upsertLog = useMutation({
    mutationFn: (data: { sessionId: string; startedAt?: string; performedOn?: string; completedAt?: string }) =>
      api.post<SessionLogDto>('/logs/session', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-log', sessionId] });
      qc.invalidateQueries({ queryKey: ['trainee-plans'] });
    },
  });

  const upsertRowLog = useMutation({
    mutationFn: ({ sessionLogId, rowId, rpe, notes }: { sessionLogId: string; rowId: string; rpe: number; notes: string }) =>
      api.post(`/logs/row/${sessionLogId}`, { rowId, rpe, notes }),
    onSuccess: () => refetchLog(),
  });

  // Resume: if already started and not yet complete, skip overview and jump back in
  useEffect(() => {
    if (sessionLog?.startedAt && !sessionLog.completedAt) {
      setShowOverview(false);
    }
    // Completed sessions intentionally stay on the overview (Review/Redo flow)
  }, [sessionLog]);

  // Persist step
  useEffect(() => {
    if (sessionId) localStorage.setItem(STEP_KEY(sessionId), String(stepIndex));
  }, [stepIndex, sessionId]);

  // Group steps by row for the overview drawer — must be unconditional (Rules of Hooks)
  const rowStepGroups = useMemo((): { row: ExerciseRowDto; firstStepIdx: number; done: boolean }[] => {
    const seen = new Set<string>();
    const groups: { row: ExerciseRowDto; firstStepIdx: number; done: boolean }[] = [];
    steps.forEach((step, idx) => {
      if (!seen.has(step.row.id)) {
        seen.add(step.row.id);
        const lastIdx = steps.map((s, i) => (s.row.id === step.row.id ? i : -1)).filter((i) => i >= 0).pop()!;
        groups.push({ row: step.row, firstStepIdx: idx, done: stepIndex > lastIdx });
      }
    });
    return groups;
  }, [steps, stepIndex]);

  // -- Handlers --
  function handleStart() {
    if (!sessionId) return;

    if (sessionLog?.completedAt) {
      // Redo: reset to first step and enter player without touching the existing log
      setStepIndex(0);
      setShowOverview(false);
      return;
    }

    if (sessionLog?.startedAt) {
      // Resume in-progress: step index was already restored from localStorage
      setShowOverview(false);
      return;
    }

    // Fresh start: create the session log with startedAt
    upsertLog.mutate(
      { sessionId, startedAt: new Date().toISOString() },
      { onSuccess: () => setShowOverview(false) },
    );
  }

  async function handleRateSave(rowId: string, rpe: number, notes: string) {
    if (!sessionLog) return;
    await upsertRowLog.mutateAsync({ sessionLogId: sessionLog.id, rowId, rpe, notes });
    goNext();
  }

  function goNext() {
    if (stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    } else {
      handleFinish();
    }
  }

  function goPrev() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  function handleFinish() {
    if (!sessionId) return;
    const now = new Date().toISOString();
    upsertLog.mutate(
      { sessionId, completedAt: now, performedOn: now },
      {
        onSuccess: () => {
          if (sessionId) localStorage.removeItem(STEP_KEY(sessionId));
          setCelebrating(true);
        },
      },
    );
  }

  function getRowLog(rowId: string) {
    return sessionLog?.rowLogs?.find((l) => l.rowId === rowId);
  }

  // -- Render states --
  if (!plan) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
        Loading session...
      </div>
    );
  }

  if (celebrating && sessionLog) {
    return (
      <Celebration
        sessionName={sessionName}
        startedAt={sessionLog.startedAt}
        completedAt={sessionLog.completedAt ?? new Date().toISOString()}
        onDone={() => navigate('/trainee', { replace: true })}
      />
    );
  }

  if (showOverview) {
    return (
      <>
        <div className="sticky top-0 z-10 bg-gray-950/95 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/trainee')} className="text-gray-400 hover:text-gray-200">
            <ChevronLeft size={20} />
          </button>
          <span className="font-semibold text-gray-100 flex-1">{sessionName}</span>
        </div>
        <SessionOverview
          rows={rows}
          sessionName={sessionName}
          existingLog={sessionLog}
          onStart={handleStart}
        />
      </>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        No exercises in this session.
      </div>
    );
  }

  const currentStep = steps[stepIndex]!;
  const doneStepCount = stepIndex;
  const totalSteps = steps.length;

  const videoUrl = currentStep.row.variant?.videoUrl ?? currentStep.row.exercise?.videoUrl;

  return (
    <div className="flex flex-col h-screen bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-3 border-b border-gray-800 bg-gray-950/95">
        <button onClick={() => navigate('/trainee')} className="text-gray-400 hover:text-gray-200">
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-100 truncate">{sessionName}</p>
          <p className="text-xs text-gray-500">Step {stepIndex + 1} of {totalSteps}</p>
        </div>
        <button onClick={() => setOverviewOpen(true)} className="text-gray-400 hover:text-gray-200">
          <List size={18} />
        </button>
        <button onClick={() => setSettingsOpen(true)} className="text-gray-400 hover:text-gray-200">
          <Settings size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex-shrink-0 h-1 bg-gray-800">
        <div
          className="h-full bg-brand-500 transition-all duration-300"
          style={{ width: `${(doneStepCount / totalSteps) * 100}%` }}
        />
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-6 space-y-4">

          {/* Exercise header */}
          {currentStep.kind !== 'rate' && (
            <div className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h2 className="text-xl font-bold text-white">{currentStep.row.exercise?.name}</h2>
                    {currentStep.row.variant && (
                      <Badge variant="blue">{currentStep.row.variant.name}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">
                    {currentStep.kind === 'rest'
                      ? `Rest after set ${currentStep.setIndex} of ${currentStep.totalSets}`
                      : `Set ${currentStep.setIndex} of ${currentStep.totalSets} · ${formatVolumeLabel(currentStep.row.volumeType, currentStep.row.volumeValue)}`
                    }
                  </p>
                </div>
                {videoUrl && (
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer"
                    className="text-gray-500 hover:text-brand-400 flex-shrink-0 p-1">
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>

              {/* Trainer note */}
              {currentStep.row.feedback && currentStep.row.feedback.length > 0 && (
                <div className="mt-2 p-2 bg-blue-900/20 border border-blue-800/20 rounded-lg flex items-start gap-1.5">
                  <MessageSquare size={12} className="text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-blue-300 italic">{currentStep.row.feedback[0]?.content}</p>
                </div>
              )}
            </div>
          )}

          {/* Step body */}
          {currentStep.kind === 'set' && (() => {
            const isTimed = currentStep.row.volumeType === 'TIME_SEC' || currentStep.row.volumeType === 'MAX_HOLD';
            if (isTimed) {
              return (
                <div className="card">
                  <Timer
                    key={`timer-${currentStep.row.id}-${currentStep.setIndex}`}
                    volumeType={currentStep.row.volumeType as 'TIME_SEC' | 'MAX_HOLD'}
                    volumeValue={currentStep.row.volumeValue}
                    bufferSeconds={bufferSeconds}
                    onDone={goNext}
                  />
                </div>
              );
            }
            return (
              <div className="card flex flex-col items-center gap-4 py-6">
                <div className="text-5xl font-bold text-white">
                  {formatVolumeLabel(currentStep.row.volumeType, currentStep.row.volumeValue)}
                </div>
                <p className="text-gray-500 text-sm">Complete your set, then mark done</p>
                <Button variant="primary" className="w-full max-w-xs" onClick={goNext}>
                  ✓ Set Done
                </Button>
              </div>
            );
          })()}

          {currentStep.kind === 'rest' && (
            <div className="card">
              <RestTimer
                key={`rest-${currentStep.row.id}-${currentStep.setIndex}`}
                restMinutes={currentStep.row.restMinutes}
                onDone={goNext}
              />
            </div>
          )}

          {currentStep.kind === 'rate' && (() => {
            const existingRowLog = getRowLog(currentStep.row.id);
            return (
              <div className="card">
                <RatingInput
                  key={`rate-${currentStep.row.id}`}
                  exerciseName={`${currentStep.row.exercise?.name ?? ''}${currentStep.row.variant ? ` – ${currentStep.row.variant.name}` : ''}`}
                  initialRpe={existingRowLog?.rpe}
                  initialNotes={existingRowLog?.notes}
                  onSave={(rpe, notes) => handleRateSave(currentStep.row.id, rpe, notes)}
                  isSaving={upsertRowLog.isPending}
                />
              </div>
            );
          })()}
        </div>
      </div>

      {/* Footer nav */}
      <div className="flex-shrink-0 flex items-center gap-3 px-4 py-4 border-t border-gray-800 bg-gray-950/95">
        <button
          onClick={goPrev}
          disabled={stepIndex === 0}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex-1 flex gap-1 justify-center">
          {steps.slice(0, Math.min(steps.length, 20)).map((_, i) => (
            <button
              key={i}
              onClick={() => setStepIndex(i)}
              className={cn(
                'w-2 h-2 rounded-full transition-all',
                i === stepIndex ? 'bg-brand-500 scale-125' : i < stepIndex ? 'bg-brand-800' : 'bg-gray-700',
              )}
            />
          ))}
          {steps.length > 20 && (
            <span className="text-xs text-gray-600 ml-1">+{steps.length - 20}</span>
          )}
        </div>
        <button
          onClick={goNext}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-800 transition-all"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Overview drawer */}
      <Modal
        open={overviewOpen}
        onClose={() => setOverviewOpen(false)}
        title="Session Overview"
        className="max-w-md"
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {rowStepGroups.map(({ row, firstStepIdx, done }) => {
            const isCurrent = !done && steps[stepIndex]?.row.id === row.id;
            return (
              <button
                key={row.id}
                onClick={() => { setStepIndex(firstStepIdx); setOverviewOpen(false); }}
                className={cn(
                  'w-full text-left p-3 rounded-lg transition-all flex items-center gap-3',
                  done ? 'bg-brand-900/20 border border-brand-800/30' :
                  isCurrent ? 'bg-gray-700 border border-gray-600' :
                  'bg-gray-800/60 hover:bg-gray-700',
                )}
              >
                {done ? (
                  <CheckCircle2 size={16} className="text-brand-500 flex-shrink-0" />
                ) : (
                  <div className={cn('w-4 h-4 rounded-full border-2 flex-shrink-0', isCurrent ? 'border-brand-400' : 'border-gray-600')} />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-100 truncate">{row.exercise?.name}</p>
                  <p className="text-xs text-gray-500">
                    {row.sets}×{formatVolumeLabel(row.volumeType, row.volumeValue)}
                  </p>
                </div>
                {isCurrent && <Badge variant="blue">Now</Badge>}
              </button>
            );
          })}
        </div>
      </Modal>

      {/* Settings modal */}
      <Modal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Player Settings"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Pre-exercise buffer (seconds)</label>
            <p className="text-xs text-gray-500 mb-2">Countdown before timed exercises start, giving you time to get in position.</p>
            <div className="flex items-center gap-3">
              {[0, 3, 5, 10].map((v) => (
                <button
                  key={v}
                  onClick={() => { setBufferSeconds(v); localStorage.setItem(BUFFER_KEY, String(v)); }}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                    bufferSeconds === v ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                  )}
                >
                  {v}s
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="primary" onClick={() => setSettingsOpen(false)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

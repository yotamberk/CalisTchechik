import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  ChevronLeft,
  Copy,
  MessageSquare,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { PlanDto, ExerciseDto, WeekDto, SessionDto, SectionDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { SessionEditor } from '@/components/trainer/SessionEditor';

export function PlanDetailPage() {
  const { planId } = useParams<{ planId: string }>();
  const qc = useQueryClient();

  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);
  const [weekModal, setWeekModal] = useState(false);
  const [weekForm, setWeekForm] = useState({ weekNumber: 1, startDate: '' });
  const [sessionModal, setSessionModal] = useState<{ open: boolean; weekId?: string }>({ open: false });
  const [sessionForm, setSessionForm] = useState({ name: '', order: 0 });
  const [feedbackModal, setFeedbackModal] = useState<{ open: boolean; weekId?: string }>({ open: false });
  const [feedbackContent, setFeedbackContent] = useState('');
  const [copyWeekModal, setCopyWeekModal] = useState<{ open: boolean; weekId?: string; weekNumber?: number }>({ open: false });
  const [copyTarget, setCopyTarget] = useState({ targetWeekNumber: '', targetStartDate: '' });

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', planId],
    queryFn: () => api.get<PlanDto>(`/plans/${planId}`),
    enabled: !!planId,
  });

  const { data: exercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api.get<ExerciseDto[]>('/exercises'),
  });

  const createWeek = useMutation({
    mutationFn: () =>
      api.post<WeekDto>('/weeks', {
        planId,
        weekNumber: weekForm.weekNumber,
        startDate: weekForm.startDate,
      }),
    onSuccess: (week) => {
      qc.invalidateQueries({ queryKey: ['plan', planId] });
      setWeekModal(false);
      setSelectedWeekId(week.id);
    },
  });

  const deleteWeek = useMutation({
    mutationFn: (id: string) => api.delete(`/weeks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', planId] });
      setSelectedWeekId(null);
    },
  });

  const createSession = useMutation({
    mutationFn: () =>
      api.post<SessionDto>('/sessions', {
        weekId: sessionModal.weekId,
        name: sessionForm.name,
        order: sessionForm.order,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', planId] });
      setSessionModal({ open: false });
      setSessionForm({ name: '', order: 0 });
    },
  });

  const deleteSession = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', planId] }),
  });

  const addFeedback = useMutation({
    mutationFn: () =>
      api.post('/feedback', { weekId: feedbackModal.weekId, content: feedbackContent }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', planId] });
      setFeedbackModal({ open: false });
      setFeedbackContent('');
    },
  });

  const copyWeek = useMutation({
    mutationFn: () =>
      api.post('/copy/week', {
        sourcePlanId: planId,
        sourceWeekNumber: copyWeekModal.weekNumber,
        targetPlanId: planId,
        targetWeekNumber: parseInt(copyTarget.targetWeekNumber),
        targetStartDate: copyTarget.targetStartDate,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', planId] });
      setCopyWeekModal({ open: false });
      setCopyTarget({ targetWeekNumber: '', targetStartDate: '' });
    },
  });

  if (isLoading) return <div className="p-6 text-gray-500">Loading plan...</div>;
  if (!plan) return <div className="p-6 text-gray-500">Plan not found.</div>;

  const selectedWeek = plan.weeks?.find((w) => w.id === selectedWeekId) ?? plan.weeks?.[0] ?? null;
  const nextWeekNumber = Math.max(0, ...(plan.weeks?.map((w) => w.weekNumber) ?? [0])) + 1;

  return (
    <div className="flex h-full">
      {/* Week sidebar */}
      <div className="w-56 flex-shrink-0 bg-gray-900/50 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <Link
            to="/trainer/plans"
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 mb-3"
          >
            <ChevronLeft size={14} />
            Plans
          </Link>
          <h2 className="font-semibold text-gray-100 text-sm truncate">{plan.name}</h2>
          <p className="text-xs text-gray-500">{plan.trainee?.name}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {plan.weeks?.map((week) => (
            <button
              key={week.id}
              onClick={() => setSelectedWeekId(week.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm mb-1 transition-colors ${
                (selectedWeek?.id === week.id)
                  ? 'bg-brand-900/60 text-brand-400 border border-brand-800/50'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`}
            >
              <div className="font-medium">Week {week.weekNumber}</div>
              <div className="text-xs opacity-70">{formatDate(week.startDate as unknown as string)}</div>
              <div className="text-xs opacity-50 mt-0.5">{week.sessions?.length ?? 0} sessions</div>
            </button>
          ))}
        </div>

        <div className="p-2 border-t border-gray-800">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-center text-xs"
            onClick={() => {
              setWeekForm({ weekNumber: nextWeekNumber, startDate: '' });
              setWeekModal(true);
            }}
          >
            <Plus size={12} />
            Add Week
          </Button>
        </div>
      </div>

      {/* Week content */}
      <div className="flex-1 overflow-y-auto">
        {!selectedWeek ? (
          <div className="flex items-center justify-center h-full text-gray-500 flex-col gap-3">
            <p>No weeks yet.</p>
            <Button
              variant="primary"
              onClick={() => {
                setWeekForm({ weekNumber: nextWeekNumber, startDate: '' });
                setWeekModal(true);
              }}
            >
              <Plus size={16} />
              Create Week 1
            </Button>
          </div>
        ) : (
          <div className="p-5">
            {/* Week header */}
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold text-white">
                  Week {selectedWeek.weekNumber}
                </h2>
                <p className="text-sm text-gray-400">
                  {formatDate(selectedWeek.startDate as unknown as string)}
                </p>
                {selectedWeek.notes && (
                  <p className="text-sm text-gray-300 mt-1 italic">"{selectedWeek.notes}"</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setFeedbackModal({ open: true, weekId: selectedWeek.id })
                  }
                >
                  <MessageSquare size={14} />
                  Feedback
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    setCopyWeekModal({
                      open: true,
                      weekId: selectedWeek.id,
                      weekNumber: selectedWeek.weekNumber,
                    })
                  }
                >
                  <Copy size={14} />
                  Copy week
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setSessionModal({ open: true, weekId: selectedWeek.id })}
                >
                  <Plus size={14} />
                  Add Session
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => deleteWeek.mutate(selectedWeek.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>

            {/* Week feedback summary */}
            {selectedWeek.feedback && selectedWeek.feedback.length > 0 && (
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-800/30 rounded-xl">
                <p className="text-xs font-medium text-blue-400 mb-1">Trainer feedback:</p>
                {selectedWeek.feedback.map((fb: { id: string; content: string }) => (
                  <p key={fb.id} className="text-sm text-gray-300">{fb.content}</p>
                ))}
              </div>
            )}

            {/* Sessions */}
            {selectedWeek.sessions?.length === 0 ? (
              <div className="card text-center py-10 text-gray-500">
                No sessions yet.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedWeek.sessions?.map((session) => (
                  <div key={session.id} className="card">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-100">{session.name}</h3>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deleteSession.mutate(session.id)}
                        >
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </div>
                    <SessionEditor
                      session={session}
                      exercises={exercises}
                      planId={planId!}
                      onRefresh={() => qc.invalidateQueries({ queryKey: ['plan', planId] })}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Week modal */}
      <Modal
        open={weekModal}
        onClose={() => setWeekModal(false)}
        title="Add Week"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <Input
            label="Week number"
            type="number"
            min={1}
            value={weekForm.weekNumber}
            onChange={(e) => setWeekForm((p) => ({ ...p, weekNumber: parseInt(e.target.value) }))}
          />
          <Input
            label="Start date"
            type="date"
            value={weekForm.startDate}
            onChange={(e) => setWeekForm((p) => ({ ...p, startDate: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setWeekModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={createWeek.isPending}
              onClick={() => createWeek.mutate()}
            >
              Add Week
            </Button>
          </div>
        </div>
      </Modal>

      {/* Session modal */}
      <Modal
        open={sessionModal.open}
        onClose={() => setSessionModal({ open: false })}
        title="Add Session"
        className="max-w-sm"
      >
        <div className="space-y-4">
          <Input
            label="Session name"
            value={sessionForm.name}
            onChange={(e) => setSessionForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Session A, Warm-up, Handstand"
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSessionModal({ open: false })}>Cancel</Button>
            <Button
              variant="primary"
              loading={createSession.isPending}
              onClick={() => createSession.mutate()}
            >
              Add
            </Button>
          </div>
        </div>
      </Modal>

      {/* Feedback modal */}
      <Modal
        open={feedbackModal.open}
        onClose={() => setFeedbackModal({ open: false })}
        title="Add Week Feedback"
        className="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="label">Feedback for trainee</label>
            <textarea
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              rows={4}
              className="input resize-none"
              placeholder="Overall notes for this week..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFeedbackModal({ open: false })}>Cancel</Button>
            <Button
              variant="primary"
              loading={addFeedback.isPending}
              onClick={() => addFeedback.mutate()}
            >
              Save Feedback
            </Button>
          </div>
        </div>
      </Modal>

      {/* Copy week modal */}
      <Modal
        open={copyWeekModal.open}
        onClose={() => setCopyWeekModal({ open: false })}
        title={`Copy Week ${copyWeekModal.weekNumber}`}
        className="max-w-sm"
      >
        <div className="space-y-4">
          <Input
            label="Target week number"
            type="number"
            min={1}
            value={copyTarget.targetWeekNumber}
            onChange={(e) => setCopyTarget((p) => ({ ...p, targetWeekNumber: e.target.value }))}
          />
          <Input
            label="Target start date"
            type="date"
            value={copyTarget.targetStartDate}
            onChange={(e) => setCopyTarget((p) => ({ ...p, targetStartDate: e.target.value }))}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setCopyWeekModal({ open: false })}>Cancel</Button>
            <Button
              variant="primary"
              loading={copyWeek.isPending}
              onClick={() => copyWeek.mutate()}
            >
              Copy
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

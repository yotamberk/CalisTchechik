import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Trash2, ChevronRight, BookOpen, Calendar } from 'lucide-react';
import { api } from '@/lib/api';
import type { UserDto, PlanDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Avatar } from '@/components/ui/Avatar';
import { formatDate, nextSundayStr, addDaysToStr } from '@/lib/utils';

export function PlansPage() {
  const qc = useQueryClient();
  const [createModal, setCreateModal] = useState(false);

  const defaultStart = nextSundayStr();
  const defaultEnd = addDaysToStr(defaultStart, 7);
  const [form, setForm] = useState({ traineeId: '', name: '', startDate: defaultStart, endDate: defaultEnd });

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<PlanDto[]>('/plans'),
  });

  const { data: trainees = [] } = useQuery({
    queryKey: ['trainees'],
    queryFn: () => api.get<UserDto[]>('/trainees'),
  });

  const createPlan = useMutation({
    mutationFn: (data: typeof form) => api.post<PlanDto>('/plans', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      setCreateModal(false);
      const s = nextSundayStr();
      setForm({ traineeId: '', name: '', startDate: s, endDate: addDaysToStr(s, 7) });
    },
  });

  const deletePlan = useMutation({
    mutationFn: (id: string) => api.delete(`/plans/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plans'] }),
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createPlan.mutate(form);
  }

  function handleStartDateChange(startDate: string) {
    setForm((p) => ({ ...p, startDate, endDate: addDaysToStr(startDate, 7) }));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Training Plans</h1>
          <p className="text-gray-400 text-sm mt-1">Create and manage training programs</p>
        </div>
        <Button variant="primary" onClick={() => setCreateModal(true)}>
          <Plus size={16} />
          New Plan
        </Button>
      </div>

      {loadingPlans ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : plans.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <BookOpen size={32} className="mx-auto mb-3 text-gray-700" />
          <p>No plans yet. Create your first training plan.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {plans.map((plan) => (
            <div key={plan.id} className="card flex items-center gap-4">
              {plan.trainee && (
                <Avatar name={plan.trainee.name} src={plan.trainee.avatar} size="md" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-100">{plan.name}</p>
                <p className="text-sm text-gray-400 flex items-center gap-1">
                  {plan.trainee?.name} · {plan.weeks?.length ?? 0} weeks
                </p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <Calendar size={11} />
                  {formatDate(plan.startDate)}
                  {plan.endDate ? ` → ${formatDate(plan.endDate)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/trainer/plans/${plan.id}`}
                  className="btn-secondary text-sm px-3 py-1.5 flex items-center gap-1"
                >
                  Open
                  <ChevronRight size={14} />
                </Link>
                <Button
                  size="icon"
                  variant="danger"
                  onClick={() => deletePlan.mutate(plan.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Plan Modal */}
      <Modal
        open={createModal}
        onClose={() => setCreateModal(false)}
        title="Create Training Plan"
        className="max-w-md"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Trainee"
            value={form.traineeId}
            onChange={(e) => setForm((p) => ({ ...p, traineeId: e.target.value }))}
            required
          >
            <option value="">Select trainee...</option>
            {trainees.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.email})
              </option>
            ))}
          </Select>
          <Input
            label="Plan name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Strength Phase 1"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start date"
              type="date"
              value={form.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              required
            />
            <Input
              label="End date"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((p) => ({ ...p, endDate: e.target.value }))}
            />
          </div>
          <p className="text-xs text-gray-500">Defaults to one week (Sunday → Sunday). Adjust as needed.</p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button type="submit" variant="primary" loading={createPlan.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Bell, Shield, Users } from 'lucide-react';
import { api } from '@/lib/api';
import type { UserDto, PendingAccessRequestDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { RoleBadge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';

export function AdminPage() {
  const qc = useQueryClient();
  const [newTrainerEmail, setNewTrainerEmail] = useState('');
  const [addError, setAddError] = useState('');

  const { data: trainers = [], isLoading: loadingTrainers } = useQuery({
    queryKey: ['admin', 'trainers'],
    queryFn: () => api.get<UserDto[]>('/admin/trainers'),
  });

  const { data: pendingRequests = [], isLoading: loadingPending } = useQuery({
    queryKey: ['admin', 'pending'],
    queryFn: () => api.get<PendingAccessRequestDto[]>('/admin/pending-requests'),
  });

  const addTrainerMutation = useMutation({
    mutationFn: (email: string) => api.post<UserDto>('/admin/trainers', { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'trainers'] });
      setNewTrainerEmail('');
      setAddError('');
    },
    onError: (err: Error) => setAddError(err.message),
  });

  const removeTrainerMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/admin/trainers/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'trainers'] }),
  });

  const dismissRequestMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/pending-requests/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pending'] }),
  });

  function handleAddTrainer(e: React.FormEvent) {
    e.preventDefault();
    if (!newTrainerEmail.trim()) return;
    addTrainerMutation.mutate(newTrainerEmail.trim());
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-red-900/50 border border-red-800/50 rounded-lg flex items-center justify-center">
          <Shield size={20} className="text-red-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-gray-400 text-sm">Manage trainers and access requests</p>
        </div>
      </div>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-yellow-400" />
            <h2 className="text-base font-semibold text-gray-100">
              Pending Access Requests
              <span className="ml-2 px-2 py-0.5 bg-yellow-900/50 text-yellow-400 text-xs rounded-full">
                {pendingRequests.length}
              </span>
            </h2>
          </div>
          <div className="space-y-2">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="card flex items-center gap-4 bg-yellow-900/10 border-yellow-800/30"
              >
                <Avatar name={req.name || req.email} src={req.avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-100">{req.name || 'Unknown'}</p>
                  <p className="text-sm text-gray-400">{req.email}</p>
                  <p className="text-xs text-gray-500">Attempted: {formatDate(req.attemptedAt)}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      setNewTrainerEmail(req.email);
                    }}
                  >
                    Grant Trainer
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => dismissRequestMutation.mutate(req.id)}
                    loading={dismissRequestMutation.isPending}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Add Trainer */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <UserPlus size={16} className="text-brand-400" />
          <h2 className="text-base font-semibold text-gray-100">Add Trainer</h2>
        </div>
        <div className="card">
          <form onSubmit={handleAddTrainer} className="flex gap-3">
            <Input
              placeholder="trainer@email.com"
              type="email"
              value={newTrainerEmail}
              onChange={(e) => setNewTrainerEmail(e.target.value)}
              error={addError}
              className="flex-1"
            />
            <Button
              type="submit"
              variant="primary"
              loading={addTrainerMutation.isPending}
            >
              Add
            </Button>
          </form>
        </div>
      </section>

      {/* Trainers List */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users size={16} className="text-blue-400" />
          <h2 className="text-base font-semibold text-gray-100">
            Trainers ({trainers.length})
          </h2>
        </div>
        {loadingTrainers ? (
          <div className="text-gray-500 text-sm">Loading...</div>
        ) : trainers.length === 0 ? (
          <div className="card text-center py-8 text-gray-500">No trainers yet.</div>
        ) : (
          <div className="space-y-2">
            {trainers.map((trainer) => (
              <div key={trainer.id} className="card flex items-center gap-4">
                <Avatar name={trainer.name} src={trainer.avatar} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-100">{trainer.name}</p>
                  <p className="text-sm text-gray-400">{trainer.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {trainer.roles.map((role) => (
                    <RoleBadge key={role} role={role} />
                  ))}
                  <Button
                    size="icon"
                    variant="danger"
                    onClick={() => removeTrainerMutation.mutate(trainer.id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

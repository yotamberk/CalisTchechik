import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import type { UserDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';

export function TraineesPage() {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const { data: trainees = [], isLoading } = useQuery({
    queryKey: ['trainees'],
    queryFn: () => api.get<UserDto[]>('/trainees'),
  });

  const addTrainee = useMutation({
    mutationFn: (email: string) => api.post<UserDto>('/trainees', { email }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['trainees'] });
      setEmail('');
      setError('');
    },
    onError: (err: Error) => setError(err.message),
  });

  const removeTrainee = useMutation({
    mutationFn: (id: string) => api.delete(`/trainees/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['trainees'] }),
  });

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    addTrainee.mutate(email.trim());
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Trainees</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your trainees</p>
      </div>

      {/* Add trainee */}
      <div className="card">
        <h2 className="text-sm font-semibold text-gray-300 mb-3">Add Trainee</h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <Input
            type="email"
            placeholder="trainee@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={error}
            className="flex-1"
          />
          <Button type="submit" variant="primary" loading={addTrainee.isPending}>
            <UserPlus size={16} />
            Add
          </Button>
        </form>
      </div>

      {/* Trainee list */}
      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading...</div>
      ) : trainees.length === 0 ? (
        <div className="card text-center py-10 text-gray-500">No trainees yet.</div>
      ) : (
        <div className="space-y-2">
          {trainees.map((trainee) => (
            <div key={trainee.id} className="card flex items-center gap-4">
              <Avatar name={trainee.name} src={trainee.avatar} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-100">{trainee.name}</p>
                <p className="text-sm text-gray-400">{trainee.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to={`/trainer/trainees/${trainee.id}`}
                  className="btn-ghost p-2 rounded-lg text-gray-400 hover:text-gray-100"
                >
                  <ChevronRight size={16} />
                </Link>
                <Button
                  size="icon"
                  variant="danger"
                  onClick={() => removeTrainee.mutate(trainee.id)}
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

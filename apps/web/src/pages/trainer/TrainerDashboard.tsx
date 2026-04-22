import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Users, BookOpen, CalendarDays, CheckCircle2, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import type { UserDto, PlanDto, WeekDto } from '@calist/shared';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/store/authStore';
import { addDays, isThisWeek, parseISO } from 'date-fns';

export function TrainerDashboard() {
  const { user } = useAuthStore();

  const { data: trainees = [] } = useQuery({
    queryKey: ['trainees'],
    queryFn: () => api.get<UserDto[]>('/trainees'),
  });

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => api.get<PlanDto[]>('/plans'),
  });

  // Compute current week status per trainee
  function getTraineeStatus(traineeId: string) {
    const traineePlans = plans.filter((p) => p.traineeId === traineeId);
    if (!traineePlans.length) return null;

    const latestPlan = traineePlans[0]!;
    const today = new Date();

    const currentWeek = latestPlan.weeks?.find((w) => {
      const start = parseISO(w.startDate as unknown as string);
      const end = addDays(start, 6);
      return today >= start && today <= end;
    });

    return { plan: latestPlan, currentWeek };
  }

  // Find upcoming weeks that need to be created (next 2 weeks with no content)
  const upcomingWeeksNeeded = plans.flatMap((plan) => {
    const maxWeek = Math.max(0, ...(plan.weeks?.map((w) => w.weekNumber) ?? [0]));
    const suggestions = [];
    for (let i = maxWeek + 1; i <= maxWeek + 2; i++) {
      suggestions.push({ plan, weekNumber: i });
    }
    return suggestions;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good to see you, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-gray-400 text-sm mt-1">Here's your training overview.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Trainees', value: trainees.length, icon: Users, color: 'text-blue-400' },
          { label: 'Plans', value: plans.length, icon: BookOpen, color: 'text-purple-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className={`${color}`}>
              <Icon size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-sm text-gray-400">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Trainee Status Cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2">
            <Users size={16} className="text-blue-400" />
            Trainee Status
          </h2>
          <Link to="/trainer/trainees" className="text-sm text-brand-400 hover:text-brand-300">
            Manage trainees →
          </Link>
        </div>

        {trainees.length === 0 ? (
          <div className="card text-center py-12 text-gray-500">
            <Users size={32} className="mx-auto mb-3 text-gray-700" />
            <p>No trainees yet.</p>
            <Link to="/trainer/trainees" className="text-brand-400 hover:text-brand-300 text-sm mt-2 inline-block">
              Add your first trainee →
            </Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trainees.map((trainee) => {
              const status = getTraineeStatus(trainee.id);
              const currentWeek = status?.currentWeek;
              const plan = status?.plan;

              const completedSessions = currentWeek?.sessions?.filter(
                (s) => s.logs && s.logs.length > 0 && s.logs.some((l: { completedAt?: string | null }) => l.completedAt),
              ).length ?? 0;
              const totalSessions = currentWeek?.sessions?.length ?? 0;

              return (
                <div key={trainee.id} className="card hover:border-gray-700 transition-colors">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar name={trainee.name} src={trainee.avatar} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-100 truncate">{trainee.name}</p>
                      <p className="text-xs text-gray-500 truncate">{trainee.email}</p>
                    </div>
                  </div>

                  {plan ? (
                    <>
                      <p className="text-xs text-gray-500 mb-2 truncate">
                        <BookOpen size={10} className="inline mr-1" />
                        {plan.name}
                      </p>
                      {currentWeek ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">Week {currentWeek.weekNumber}</span>
                            <Badge variant={completedSessions === totalSessions && totalSessions > 0 ? 'green' : 'yellow'}>
                              {completedSessions}/{totalSessions} sessions
                            </Badge>
                          </div>
                          <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full transition-all"
                              style={{ width: totalSessions ? `${(completedSessions / totalSessions) * 100}%` : '0%' }}
                            />
                          </div>
                        </div>
                      ) : (
                        <Badge variant="gray">No current week</Badge>
                      )}
                    </>
                  ) : (
                    <Link
                      to="/trainer/plans"
                      className="text-xs text-brand-400 hover:text-brand-300"
                    >
                      + Create plan
                    </Link>
                  )}

                  <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2">
                    <Link
                      to={`/trainer/trainees/${trainee.id}`}
                      className="text-xs text-gray-400 hover:text-gray-300"
                    >
                      View profile →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming weeks to fill */}
      {upcomingWeeksNeeded.length > 0 && (
        <section>
          <h2 className="text-base font-semibold text-gray-100 flex items-center gap-2 mb-4">
            <Clock size={16} className="text-yellow-400" />
            Upcoming Weeks to Plan
          </h2>
          <div className="space-y-2">
            {upcomingWeeksNeeded.slice(0, 6).map(({ plan, weekNumber }) => (
              <div
                key={`${plan.id}-${weekNumber}`}
                className="card flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-100">{plan.name}</p>
                  <p className="text-xs text-gray-500">
                    Week {weekNumber} · {plan.trainee?.name}
                  </p>
                </div>
                <Link
                  to={`/trainer/plans/${plan.id}`}
                  className="btn-primary text-xs px-3 py-1.5"
                >
                  Plan week →
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

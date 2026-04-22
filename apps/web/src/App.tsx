import { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import type { AuthMeResponse } from '@calist/shared';
import { LoadingScreen } from '@/components/ui/Spinner';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { AdminPage } from '@/pages/admin/AdminPage';
import { TrainerDashboard } from '@/pages/trainer/TrainerDashboard';
import { ExercisesPage } from '@/pages/trainer/ExercisesPage';
import { TraineesPage } from '@/pages/trainer/TraineesPage';
import { TraineeProfilePage } from '@/pages/trainer/TraineeProfilePage';
import { PlansPage } from '@/pages/trainer/PlansPage';
import { PlanDetailPage } from '@/pages/trainer/PlanDetailPage';
import { TraineePlanPage } from '@/pages/trainee/TraineePlanPage';
import { TraineeProgressPage } from '@/pages/trainee/TraineeProgressPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireRole({
  roles,
  children,
}: {
  roles: string[];
  children: React.ReactNode;
}) {
  const { activeRole } = useAuthStore();
  if (!activeRole || !roles.includes(activeRole)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function DefaultRedirect() {
  const { activeRole } = useAuthStore();
  const routes: Record<string, string> = {
    ADMIN: '/admin',
    TRAINER: '/trainer',
    TRAINEE: '/trainee',
  };
  return <Navigate to={routes[activeRole ?? ''] ?? '/login'} replace />;
}

export default function App() {
  const { setAuth, clearAuth, setLoading } = useAuthStore();
  const navigate = useNavigate();

  // Restore session on mount
  useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const me = await api.get<AuthMeResponse & { impersonating?: boolean; realUserId?: string }>(
          '/auth/me',
        );
        setAuth(me);
        return me;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearAuth();
        } else {
          clearAuth();
        }
        return null;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DefaultRedirect />} />

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <RequireRole roles={['ADMIN']}>
              <AdminPage />
            </RequireRole>
          }
        />

        {/* Trainer routes */}
        <Route
          path="/trainer"
          element={
            <RequireRole roles={['TRAINER', 'ADMIN']}>
              <TrainerDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/trainer/exercises"
          element={
            <RequireRole roles={['TRAINER', 'ADMIN']}>
              <ExercisesPage />
            </RequireRole>
          }
        />
        <Route
          path="/trainer/trainees"
          element={
            <RequireRole roles={['TRAINER', 'ADMIN']}>
              <TraineesPage />
            </RequireRole>
          }
        />
        <Route
          path="/trainer/trainees/:traineeId"
          element={
            <RequireRole roles={['TRAINER', 'ADMIN']}>
              <TraineeProfilePage />
            </RequireRole>
          }
        />
        <Route
          path="/trainer/plans"
          element={
            <RequireRole roles={['TRAINER', 'ADMIN']}>
              <PlansPage />
            </RequireRole>
          }
        />
        <Route
          path="/trainer/plans/:planId"
          element={
            <RequireRole roles={['TRAINER', 'ADMIN']}>
              <PlanDetailPage />
            </RequireRole>
          }
        />

        {/* Trainee routes */}
        <Route
          path="/trainee"
          element={
            <RequireRole roles={['TRAINEE', 'TRAINER', 'ADMIN']}>
              <TraineePlanPage />
            </RequireRole>
          }
        />
        <Route
          path="/trainee/progress"
          element={
            <RequireRole roles={['TRAINEE', 'TRAINER', 'ADMIN']}>
              <TraineeProgressPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

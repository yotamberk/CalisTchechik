import { create } from 'zustand';
import type { AuthMeResponse, Role, UserDto } from '@calist/shared';

interface AuthState {
  user: UserDto | null;
  activeRole: Role | null;
  availableRoles: Role[];
  impersonating: boolean;
  realUserId: string | undefined;
  isLoading: boolean;
  setAuth: (data: AuthMeResponse & { impersonating?: boolean; realUserId?: string }) => void;
  clearAuth: () => void;
  setLoading: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  activeRole: null,
  availableRoles: [],
  impersonating: false,
  realUserId: undefined,
  isLoading: true,
  setAuth: (data) =>
    set({
      user: data.user,
      activeRole: data.activeRole,
      availableRoles: data.availableRoles,
      impersonating: data.impersonating ?? false,
      realUserId: data.realUserId,
      isLoading: false,
    }),
  clearAuth: () =>
    set({
      user: null,
      activeRole: null,
      availableRoles: [],
      impersonating: false,
      realUserId: undefined,
      isLoading: false,
    }),
  setLoading: (v) => set({ isLoading: v }),
}));

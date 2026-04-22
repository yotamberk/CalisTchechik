import { useGoogleLogin } from '@react-oauth/google';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, ApiError } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useQueryClient } from '@tanstack/react-query';
import type { AuthMeResponse } from '@calist/shared';

export function GoogleLoginButton() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      // tokenResponse has access_token; we need id_token via credential flow
    },
    onError: () => setError('Google sign-in failed. Please try again.'),
    flow: 'implicit',
  });

  return (
    <div className="text-center text-sm text-gray-400">
      Use the Google button above to sign in.
    </div>
  );
}

interface GoogleOneTapProps {
  onSuccess: (credential: string) => void;
  onError: (msg: string) => void;
}

export function useGoogleCredentialLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setAuth = useAuthStore((s) => s.setAuth);

  async function handleCredential(credential: string) {
    setLoading(true);
    setError('');
    try {
      const data = await api.post<AuthMeResponse & { impersonating?: boolean; realUserId?: string }>(
        '/auth/google',
        { credential },
      );
      setAuth(data);
      qc.invalidateQueries({ queryKey: ['me'] });
      const defaultRoute = data.activeRole === 'ADMIN'
        ? '/admin'
        : data.activeRole === 'TRAINER'
        ? '/trainer'
        : '/trainee';
      navigate(defaultRoute);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return { handleCredential, loading, error };
}

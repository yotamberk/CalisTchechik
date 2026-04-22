import { GoogleLogin } from '@react-oauth/google';
import { Dumbbell } from 'lucide-react';
import { useGoogleCredentialLogin } from '@/components/auth/GoogleLoginButton';

export function LoginPage() {
  const { handleCredential, loading, error } = useGoogleCredentialLogin();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl mb-4 shadow-lg shadow-brand-900/50">
            <Dumbbell size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CalisTchechik</h1>
          <p className="text-gray-400 mt-2 text-sm">Calisthenics training, structured.</p>
        </div>

        {/* Card */}
        <div className="card shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-100 mb-1">Welcome back</h2>
          <p className="text-gray-400 text-sm mb-6">Sign in with your Google account to continue.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div className={`flex justify-center ${loading ? 'opacity-50 pointer-events-none' : ''}`}>
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  handleCredential(credentialResponse.credential);
                }
              }}
              onError={() => {}}
              theme="filled_black"
              size="large"
              shape="rectangular"
              logo_alignment="center"
              text="signin_with"
            />
          </div>

          {loading && (
            <p className="text-center text-sm text-gray-400 mt-4">Signing you in...</p>
          )}

          <p className="text-xs text-gray-600 text-center mt-6">
            Access is granted by invitation only. If you don't have access, your sign-in attempt will be reviewed by an admin.
          </p>
        </div>
      </div>
    </div>
  );
}

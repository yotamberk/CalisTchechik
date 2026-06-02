import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';

interface CelebrationProps {
  sessionName: string;
  startedAt: string | null | undefined;
  completedAt: string;
  onDone: () => void;
}

export function Celebration({ sessionName, startedAt, completedAt, onDone }: CelebrationProps) {
  const durationMs = startedAt
    ? new Date(completedAt).getTime() - new Date(startedAt).getTime()
    : null;

  useEffect(() => {
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        origin: { y: 0.7 },
        ...opts,
        particleCount: Math.floor(200 * particleRatio),
      });
    };

    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
      <div className="text-6xl animate-bounce">🎉</div>

      <div>
        <h1 className="text-3xl font-bold text-white mb-1">Session Complete!</h1>
        <p className="text-gray-400 text-lg">{sessionName}</p>
      </div>

      {durationMs && (
        <div className="card w-full max-w-xs text-center">
          <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Duration</p>
          <p className="text-3xl font-bold text-brand-400">{formatDuration(durationMs)}</p>
        </div>
      )}

      <div className="space-y-3 w-full max-w-xs">
        <p className="text-gray-500 text-sm">
          Great work! Your session has been saved and your trainer can see your results.
        </p>
        <Button variant="primary" className="w-full" onClick={onDone}>
          Back to My Plan
        </Button>
      </div>
    </div>
  );
}

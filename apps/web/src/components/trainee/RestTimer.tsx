import { useState, useEffect, useRef } from 'react';
import { SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface RestTimerProps {
  restMinutes: number;
  onDone: () => void;
}

export function RestTimer({ restMinutes, onDone }: RestTimerProps) {
  const totalSeconds = Math.round(restMinutes * 60);
  const [remaining, setRemaining] = useState(totalSeconds);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (totalSeconds <= 0) {
      onDone();
      return;
    }
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          // small beep via AudioContext
          try {
            const ctx = new AudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.frequency.value = 660;
            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.3);
          } catch { /* ignore */ }
          setTimeout(onDone, 400);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSeconds]);

  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0;
  const circumference = 2 * Math.PI * 44;
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;

  return (
    <div className="flex flex-col items-center gap-5 py-6">
      <p className="text-sm font-semibold text-gray-300 uppercase tracking-widest">Rest</p>

      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="44" fill="none" stroke="#1f2937" strokeWidth="7" />
          <circle
            cx="50" cy="50" r="44" fill="none"
            stroke="#3b82f6" strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-3xl font-bold tabular-nums text-blue-400">
            {m}:{String(s).padStart(2, '0')}
          </span>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onDone}>
        <SkipForward size={14} /> Skip rest
      </Button>
    </div>
  );
}

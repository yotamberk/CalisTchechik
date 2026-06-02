import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, SkipForward } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface TimerProps {
  volumeType: 'TIME_SEC' | 'MAX_HOLD';
  volumeValue: string;
  bufferSeconds: number;
  onDone: () => void;
}

type Phase = 'buffer' | 'active' | 'done';

function useAudioBeep() {
  const ctxRef = useRef<AudioContext | null>(null);

  return useCallback((freq = 880, duration = 0.12) => {
    try {
      if (!ctxRef.current) ctxRef.current = new AudioContext();
      const ctx = ctxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch { /* ignore */ }
  }, []);
}

export function Timer({ volumeType, volumeValue, bufferSeconds, onDone }: TimerProps) {
  const targetSeconds = volumeType === 'TIME_SEC' ? parseInt(volumeValue) || 0 : 0;
  const isCountUp = volumeType === 'MAX_HOLD';

  const [phase, setPhase] = useState<Phase>(bufferSeconds > 0 ? 'buffer' : 'active');
  const [bufferLeft, setBufferLeft] = useState(bufferSeconds);
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const beep = useAudioBeep();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => {
    if (phase === 'buffer') {
      clearTimer();
      intervalRef.current = setInterval(() => {
        setBufferLeft((prev) => {
          if (prev <= 1) {
            clearTimer();
            beep(660, 0.15);
            setPhase('active');
            return 0;
          }
          beep(440, 0.08);
          return prev - 1;
        });
      }, 1000);
    } else if (phase === 'active' && !paused) {
      clearTimer();
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          const next = prev + 1;
          if (!isCountUp && next >= targetSeconds) {
            clearTimer();
            beep(880, 0.2);
            setTimeout(() => beep(880, 0.2), 250);
            setPhase('done');
          }
          return next;
        });
      }, 1000);
    } else {
      clearTimer();
    }
    return clearTimer;
  }, [phase, paused, isCountUp, targetSeconds, beep]);

  function handleSkipBuffer() {
    clearTimer();
    setBufferLeft(0);
    setPhase('active');
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  const remaining = isCountUp ? elapsed : Math.max(0, targetSeconds - elapsed);
  const progress = isCountUp ? 0 : targetSeconds > 0 ? elapsed / targetSeconds : 0;
  const circumference = 2 * Math.PI * 52;

  if (phase === 'buffer') {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <p className="text-sm text-gray-400 font-medium uppercase tracking-wide">Get ready…</p>
        <div className="relative w-32 h-32">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1f2937" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="#f59e0b" strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - bufferLeft / bufferSeconds)}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-4xl font-bold text-amber-400">{bufferLeft}</span>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSkipBuffer}>
          <SkipForward size={14} /> Skip
        </Button>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="flex flex-col items-center gap-4 py-4">
        <div className="w-20 h-20 rounded-full bg-brand-900/40 border-2 border-brand-500 flex items-center justify-center">
          <span className="text-3xl">✓</span>
        </div>
        <p className="text-brand-400 font-semibold">Time's up!</p>
        <Button variant="primary" onClick={onDone}>Mark Done</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">
        {isCountUp ? 'Elapsed' : 'Remaining'}
      </p>
      <div className="relative w-36 h-36">
        {!isCountUp && (
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1f2937" strokeWidth="8" />
            <circle
              cx="60" cy="60" r="52" fill="none"
              stroke="#22c55e" strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * progress}
              strokeLinecap="round"
              className="transition-all duration-1000"
            />
          </svg>
        )}
        {isCountUp && (
          <svg className="w-full h-full" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#1f2937" strokeWidth="8" />
          </svg>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn('text-4xl font-bold tabular-nums', isCountUp ? 'text-amber-400' : 'text-white')}>
            {formatTime(isCountUp ? elapsed : remaining)}
          </span>
          {isCountUp && <span className="text-xs text-gray-500 mt-0.5">max hold</span>}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <><Play size={14} /> Resume</> : 'Pause'}
        </Button>
        <Button variant="primary" onClick={onDone}>
          Done
        </Button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface RatingInputProps {
  exerciseName: string;
  initialRpe?: number | null;
  initialNotes?: string | null;
  onSave: (rpe: number, notes: string) => Promise<void> | void;
  isSaving?: boolean;
}

const RPE_LABELS: Record<number, string> = {
  1: 'Very easy', 2: 'Easy', 3: 'Moderate',
  4: 'Somewhat hard', 5: 'Hard', 6: 'Hard+',
  7: 'Very hard', 8: 'Very hard+', 9: 'Max effort', 10: 'All out!',
};

const RPE_COLOR: (n: number) => string = (n) => {
  if (n <= 3) return 'bg-emerald-600 text-white ring-emerald-500';
  if (n <= 6) return 'bg-amber-600 text-white ring-amber-500';
  return 'bg-red-600 text-white ring-red-500';
};

export function RatingInput({ exerciseName, initialRpe, initialNotes, onSave, isSaving }: RatingInputProps) {
  const [rpe, setRpe] = useState<number | null>(initialRpe ?? null);
  const [notes, setNotes] = useState(initialNotes ?? '');

  async function handleSave() {
    if (!rpe) return;
    await onSave(rpe, notes);
  }

  return (
    <div className="space-y-5 py-2">
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-1">Exercise</p>
        <p className="text-lg font-semibold text-gray-100">{exerciseName}</p>
      </div>

      <div>
        <p className="text-sm font-medium text-gray-300 mb-3">
          How difficult was this exercise?
          <span className="text-red-400 ml-1">*</span>
        </p>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={n}
              onClick={() => setRpe(n)}
              className={cn(
                'h-11 rounded-xl text-sm font-bold transition-all',
                rpe === n
                  ? `${RPE_COLOR(n)} ring-2 scale-110 shadow-lg`
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200',
              )}
            >
              {n}
            </button>
          ))}
        </div>
        {rpe && (
          <p className="mt-2 text-center text-sm text-gray-400 italic">
            {RPE_LABELS[rpe]}
          </p>
        )}
      </div>

      <div>
        <label className="text-sm font-medium text-gray-300 mb-1 block">
          Comment <span className="text-gray-600 font-normal">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="input resize-none text-sm"
          placeholder="How did it feel? Any notes..."
        />
      </div>

      <Button
        variant="primary"
        className="w-full"
        disabled={!rpe}
        loading={isSaving}
        onClick={handleSave}
      >
        Save & Continue
      </Button>
    </div>
  );
}

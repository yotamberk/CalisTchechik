import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, ExternalLink, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import type { SessionDto, SectionDto, ExerciseDto, ExerciseRowDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

interface SessionEditorProps {
  session: SessionDto;
  exercises: ExerciseDto[];
  planId: string;
  onRefresh: () => void;
}

const VOLUME_TYPES = [
  { value: 'NUMBER', label: '# Reps' },
  { value: 'MAX', label: 'MAX reps' },
  { value: 'HEIGHT_CM', label: 'Height (cm)' },
];

function getGroupColor(groupKey: string | null | undefined): string {
  if (!groupKey) return '';
  const colors = [
    'border-l-blue-500',
    'border-l-purple-500',
    'border-l-yellow-500',
    'border-l-pink-500',
    'border-l-orange-500',
  ];
  const hash = groupKey.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return colors[hash % colors.length] ?? 'border-l-blue-500';
}

interface RowEditorProps {
  row: ExerciseRowDto;
  exercises: ExerciseDto[];
  onRefresh: () => void;
  onDelete: () => void;
}

function RowEditor({ row, exercises, onRefresh, onDelete }: RowEditorProps) {
  const exercise = exercises.find((e) => e.id === row.exerciseId);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');

  const updateRow = useMutation({
    mutationFn: (data: Partial<ExerciseRowDto>) => api.patch(`/sessions/rows/${row.id}`, data),
    onSuccess: onRefresh,
  });

  const addFeedback = useMutation({
    mutationFn: () =>
      api.post('/feedback', { rowId: row.id, content: feedbackContent }),
    onSuccess: () => {
      onRefresh();
      setFeedbackModal(false);
      setFeedbackContent('');
    },
  });

  const groupColor = getGroupColor(row.groupKey);

  return (
    <div
      className={cn(
        'flex items-center gap-2 py-2 px-2 rounded-lg bg-gray-800/40 border-l-2 border-l-transparent',
        row.groupKey && `border-l-2 ${groupColor}`,
      )}
    >
      <div className="text-gray-600 cursor-grab flex-shrink-0">
        <GripVertical size={14} />
      </div>

      {/* Exercise select */}
      <Select
        value={row.exerciseId}
        onChange={(e) => updateRow.mutate({ exerciseId: e.target.value, variantId: null })}
        className="flex-1 min-w-0 text-sm py-1.5"
      >
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>
            {ex.name}
          </option>
        ))}
      </Select>

      {/* Variant select */}
      {exercise && exercise.variants.length > 0 && (
        <Select
          value={row.variantId ?? ''}
          onChange={(e) => updateRow.mutate({ variantId: e.target.value || null })}
          className="w-36 text-sm py-1.5"
        >
          <option value="">No variant</option>
          {exercise.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </Select>
      )}

      {/* Sets */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-gray-500">Sets</span>
        <input
          type="number"
          min={1}
          value={row.sets}
          onChange={(e) => updateRow.mutate({ sets: parseInt(e.target.value) || 1 })}
          className="input w-12 text-sm py-1.5 text-center px-1"
        />
      </div>

      {/* Volume */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Select
          value={row.volumeType}
          onChange={(e) => updateRow.mutate({ volumeType: e.target.value as 'NUMBER' | 'MAX' | 'HEIGHT_CM' })}
          className="w-28 text-sm py-1.5"
        >
          {VOLUME_TYPES.map((vt) => (
            <option key={vt.value} value={vt.value}>
              {vt.label}
            </option>
          ))}
        </Select>
        {row.volumeType !== 'MAX' && (
          <input
            type="text"
            value={row.volumeValue}
            onChange={(e) => updateRow.mutate({ volumeValue: e.target.value })}
            className="input w-14 text-sm py-1.5 text-center px-1"
            placeholder="10"
          />
        )}
      </div>

      {/* Rest */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <span className="text-xs text-gray-500">Rest</span>
        <input
          type="number"
          min={0}
          step={0.5}
          value={row.restMinutes}
          onChange={(e) => updateRow.mutate({ restMinutes: parseFloat(e.target.value) })}
          className="input w-14 text-sm py-1.5 text-center px-1"
        />
        <span className="text-xs text-gray-500">min</span>
      </div>

      {/* Group key */}
      <input
        type="text"
        value={row.groupKey ?? ''}
        onChange={(e) => updateRow.mutate({ groupKey: e.target.value || null })}
        className="input w-16 text-sm py-1.5 text-center px-1"
        placeholder="grp"
        title="Group key (same key = superset)"
      />

      {/* Feedback & video */}
      <div className="flex gap-1 flex-shrink-0">
        {(exercise?.videoUrl || row.variant?.videoUrl) && (
          <a
            href={row.variant?.videoUrl ?? exercise?.videoUrl ?? '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-ghost p-1.5 text-xs"
          >
            <ExternalLink size={12} />
          </a>
        )}
        <Button size="icon" variant="ghost" onClick={() => setFeedbackModal(true)}>
          <MessageSquare size={12} />
        </Button>
        <Button size="icon" variant="danger" onClick={onDelete}>
          <Trash2 size={12} />
        </Button>
      </div>

      {/* Row feedback modal */}
      <Modal
        open={feedbackModal}
        onClose={() => setFeedbackModal(false)}
        title="Add Exercise Feedback"
        className="max-w-md"
      >
        <div className="space-y-4">
          <textarea
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            rows={3}
            className="input resize-none"
            placeholder="Feedback for this exercise..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFeedbackModal(false)}>Cancel</Button>
            <Button
              variant="primary"
              loading={addFeedback.isPending}
              onClick={() => addFeedback.mutate()}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export function SessionEditor({ session, exercises, planId, onRefresh }: SessionEditorProps) {
  const [sectionName, setSectionName] = useState('');

  const createSection = useMutation({
    mutationFn: (name: string) =>
      api.post<SectionDto>('/sessions/sections', {
        sessionId: session.id,
        name,
        order: session.sections?.length ?? 0,
      }),
    onSuccess: () => {
      onRefresh();
      setSectionName('');
    },
  });

  const deleteSection = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/sections/${id}`),
    onSuccess: onRefresh,
  });

  const createRow = useMutation({
    mutationFn: ({ sectionId, exerciseId }: { sectionId: string; exerciseId: string }) =>
      api.post('/sessions/rows', {
        sectionId,
        exerciseId,
        order: 0,
        volumeType: 'NUMBER',
        volumeValue: '10',
        sets: 3,
        restMinutes: 2,
        breakMinutes: 1,
      }),
    onSuccess: onRefresh,
  });

  const deleteRow = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/rows/${id}`),
    onSuccess: onRefresh,
  });

  return (
    <div className="space-y-4">
      {/* Column headers */}
      <div className="grid grid-cols-12 text-xs text-gray-500 px-2 gap-2 hidden lg:grid">
        <div className="col-span-3">Exercise</div>
        <div className="col-span-2">Variant</div>
        <div>Sets</div>
        <div className="col-span-2">Volume</div>
        <div>Rest</div>
        <div>Break</div>
        <div>Grp</div>
      </div>

      {session.sections?.map((section) => (
        <div key={section.id}>
          {/* Section header */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-px flex-1 bg-gray-800" />
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
              {section.name}
            </span>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => {
                if (exercises.length === 0) return;
                createRow.mutate({ sectionId: section.id, exerciseId: exercises[0]!.id });
              }}
              title="Add row"
            >
              <Plus size={12} />
            </Button>
            <Button
              size="icon"
              variant="danger"
              onClick={() => deleteSection.mutate(section.id)}
            >
              <Trash2 size={12} />
            </Button>
            <div className="h-px flex-1 bg-gray-800" />
          </div>

          {/* Rows */}
          <div className="space-y-1">
            {section.rows?.map((row) => (
              <RowEditor
                key={row.id}
                row={row}
                exercises={exercises}
                onRefresh={onRefresh}
                onDelete={() => deleteRow.mutate(row.id)}
              />
            ))}
            {section.rows?.length === 0 && (
              <p className="text-xs text-gray-600 italic px-2">
                No exercises. Click + to add.
              </p>
            )}
          </div>
        </div>
      ))}

      {/* Add section */}
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
          placeholder="Section name (e.g. Strength, Skill work)"
          className="input text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && sectionName.trim()) createSection.mutate(sectionName.trim());
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          loading={createSection.isPending}
          onClick={() => {
            if (sectionName.trim()) createSection.mutate(sectionName.trim());
          }}
        >
          <Plus size={14} />
          Add Section
        </Button>
      </div>
    </div>
  );
}

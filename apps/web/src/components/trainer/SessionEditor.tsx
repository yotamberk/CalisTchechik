import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, ExternalLink, MessageSquare } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';
import type { SessionDto, SectionDto, ExerciseDto, ExerciseRowDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Volume type options
// ---------------------------------------------------------------------------

const VOLUME_TYPES = [
  { value: 'NUMBER', label: '# Reps' },
  { value: 'MAX', label: 'Max Reps' },
  { value: 'TIME_SEC', label: 'Time (sec)' },
  { value: 'MAX_HOLD', label: 'Max Hold' },
  { value: 'HEIGHT_CM', label: 'Height (cm)' },
] as const;

const NO_VALUE_TYPES = new Set(['MAX', 'MAX_HOLD']);

// ---------------------------------------------------------------------------
// Group colour strip — a dedicated 4px column, not a border
// ---------------------------------------------------------------------------

const GROUP_BG: Record<number, string> = {
  0: 'bg-sky-500',
  1: 'bg-violet-500',
  2: 'bg-amber-500',
  3: 'bg-rose-500',
  4: 'bg-emerald-500',
  5: 'bg-orange-500',
  6: 'bg-cyan-500',
  7: 'bg-pink-500',
};

function groupBg(key: string | null | undefined): string {
  if (!key) return 'bg-transparent';
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xff;
  return GROUP_BG[h % 8] ?? 'bg-sky-500';
}

// ---------------------------------------------------------------------------
// Next auto group letter
// ---------------------------------------------------------------------------

function nextGroupLetter(rows: ExerciseRowDto[]): string {
  const used = new Set(rows.map((r) => r.groupKey?.toUpperCase()).filter(Boolean));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return 'A';
}

// ---------------------------------------------------------------------------
// Shared grid — colour-strip is column 1, so header and rows are identical
// Columns: strip(4px) | grip(24px) | exercise(1.8fr) | variant(1fr) |
//          sets(52px) | vol-type(120px) | vol-value(56px) | rest(72px) |
//          group(48px) | actions(auto)
// ---------------------------------------------------------------------------

const GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '4px 24px minmax(120px,1.8fr) minmax(100px,1fr) 52px 120px 56px 72px 48px auto',
  gap: '0 6px',
  alignItems: 'center',
};

// ---------------------------------------------------------------------------
// Column header (rendered once above all sections)
// ---------------------------------------------------------------------------

export function SessionColumnHeader() {
  return (
    <div style={GRID_STYLE} className="text-xs text-gray-500 px-0 pb-1 select-none">
      <div /> {/* strip */}
      <div /> {/* grip */}
      <div className="pl-1">Exercise</div>
      <div>Variant</div>
      <div className="text-center">Sets</div>
      <div>Volume</div>
      <div className="text-center">Value</div>
      <div className="text-center">Rest</div>
      <div className="text-center">Grp</div>
      <div />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sortable row wrapper
// ---------------------------------------------------------------------------

function SortableRow({
  id,
  row,
  exercises,
  onRefresh,
  onDelete,
}: {
  id: string;
  row: ExerciseRowDto;
  exercises: ExerciseDto[];
  onRefresh: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}
    >
      <RowEditor
        row={row}
        exercises={exercises}
        onRefresh={onRefresh}
        onDelete={onDelete}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row editor
// ---------------------------------------------------------------------------

function RowEditor({
  row,
  exercises,
  onRefresh,
  onDelete,
  dragHandleProps,
}: {
  row: ExerciseRowDto;
  exercises: ExerciseDto[];
  onRefresh: () => void;
  onDelete: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const exercise = exercises.find((e) => e.id === row.exerciseId);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');

  const updateRow = useMutation({
    mutationFn: (data: Partial<ExerciseRowDto>) => api.patch(`/sessions/rows/${row.id}`, data),
    onSuccess: onRefresh,
  });

  const addFeedback = useMutation({
    mutationFn: () => api.post('/feedback', { rowId: row.id, content: feedbackContent }),
    onSuccess: () => { onRefresh(); setFeedbackModal(false); setFeedbackContent(''); },
  });

  const noValue = NO_VALUE_TYPES.has(row.volumeType);

  return (
    <div
      style={GRID_STYLE}
      className="py-1 rounded-lg bg-gray-800/40"
    >
      {/* Colour strip */}
      <div className={cn('w-1 self-stretch rounded-l-lg', groupBg(row.groupKey))} />

      {/* Drag handle */}
      <div
        className="flex items-center justify-center text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none"
        {...dragHandleProps}
      >
        <GripVertical size={14} />
      </div>

      {/* Exercise */}
      <select
        value={row.exerciseId}
        onChange={(e) => updateRow.mutate({ exerciseId: e.target.value, variantId: null })}
        className="input text-xs py-1 truncate"
      >
        {exercises.map((ex) => (
          <option key={ex.id} value={ex.id}>{ex.name}</option>
        ))}
      </select>

      {/* Variant */}
      <select
        value={row.variantId ?? ''}
        onChange={(e) => updateRow.mutate({ variantId: e.target.value || null })}
        className="input text-xs py-1"
        disabled={!exercise || exercise.variants.length === 0}
      >
        <option value="">—</option>
        {exercise?.variants.map((v) => (
          <option key={v.id} value={v.id}>{v.name}</option>
        ))}
      </select>

      {/* Sets */}
      <input
        type="number" min={1}
        value={row.sets}
        onChange={(e) => updateRow.mutate({ sets: parseInt(e.target.value) || 1 })}
        className="input text-xs py-1 text-center px-1 w-full"
      />

      {/* Volume type */}
      <select
        value={row.volumeType}
        onChange={(e) =>
          updateRow.mutate({
            volumeType: e.target.value as ExerciseRowDto['volumeType'],
            volumeValue: NO_VALUE_TYPES.has(e.target.value) ? '' : row.volumeValue,
          })
        }
        className="input text-xs py-1"
      >
        {VOLUME_TYPES.map((vt) => (
          <option key={vt.value} value={vt.value}>{vt.label}</option>
        ))}
      </select>

      {/* Volume value */}
      <input
        type="text"
        value={row.volumeValue}
        onChange={(e) => updateRow.mutate({ volumeValue: e.target.value })}
        className="input text-xs py-1 text-center px-1 w-full"
        placeholder={noValue ? '—' : '10'}
        disabled={noValue}
      />

      {/* Rest */}
      <div className="flex items-center gap-0.5">
        <input
          type="number" min={0} step={0.5}
          value={row.restMinutes}
          onChange={(e) => updateRow.mutate({ restMinutes: parseFloat(e.target.value) || 0 })}
          className="input text-xs py-1 text-center px-1 w-full"
        />
        <span className="text-xs text-gray-600 flex-shrink-0">'</span>
      </div>

      {/* Group key */}
      <input
        type="text"
        value={row.groupKey ?? ''}
        onChange={(e) => updateRow.mutate({ groupKey: e.target.value.toUpperCase() || null })}
        maxLength={2}
        className="input text-xs py-1 text-center px-1 w-full font-mono"
        placeholder="—"
      />

      {/* Actions */}
      <div className="flex items-center gap-0.5 pr-1">
        {(exercise?.videoUrl || row.variant?.videoUrl) && (
          <a
            href={row.variant?.videoUrl ?? exercise?.videoUrl ?? '#'}
            target="_blank" rel="noopener noreferrer"
            className="p-1 text-gray-500 hover:text-brand-400 rounded transition-colors"
          >
            <ExternalLink size={12} />
          </a>
        )}
        <button
          onClick={() => setFeedbackModal(true)}
          className="p-1 text-gray-500 hover:text-blue-400 rounded transition-colors"
        >
          <MessageSquare size={12} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Feedback modal */}
      <Modal open={feedbackModal} onClose={() => setFeedbackModal(false)} title="Add Exercise Feedback" className="max-w-md">
        <div className="space-y-4">
          <textarea
            value={feedbackContent}
            onChange={(e) => setFeedbackContent(e.target.value)}
            rows={3} className="input resize-none"
            placeholder="Feedback for this exercise..."
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFeedbackModal(false)}>Cancel</Button>
            <Button variant="primary" loading={addFeedback.isPending} onClick={() => addFeedback.mutate()}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section component with DnD
// ---------------------------------------------------------------------------

function SectionEditor({
  section,
  exercises,
  onRefresh,
  onDeleteSection,
  onAddRow,
}: {
  section: SectionDto;
  exercises: ExerciseDto[];
  onRefresh: () => void;
  onDeleteSection: () => void;
  onAddRow: (sectionId: string, groupKey: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const reorderRows = useMutation({
    mutationFn: (orderedIds: string[]) => api.post('/sessions/rows/reorder', { orderedIds }),
    onSuccess: onRefresh,
  });

  const deleteRow = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/rows/${id}`),
    onSuccess: onRefresh,
  });

  // Sort: group same groupKeys together
  const sortedRows = [...(section.rows ?? [])].sort((a, b) => {
    const gA = a.groupKey ?? `\x00${String(a.order).padStart(6, '0')}`;
    const gB = b.groupKey ?? `\x00${String(b.order).padStart(6, '0')}`;
    if (gA !== gB) return gA < gB ? -1 : 1;
    return a.order - b.order;
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sortedRows.findIndex((r) => r.id === active.id);
    const newIdx = sortedRows.findIndex((r) => r.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = [...sortedRows];
    const [moved] = reordered.splice(oldIdx, 1);
    reordered.splice(newIdx, 0, moved!);
    reorderRows.mutate(reordered.map((r) => r.id));
  }

  const nextGroup = nextGroupLetter(section.rows ?? []);

  return (
    <div>
      {/* Section divider */}
      <div className="flex items-center gap-2 my-2">
        <div className="h-px flex-1 bg-gray-800" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{section.name}</span>
        <button
          onClick={() => onAddRow(section.id, nextGroup)}
          className="flex items-center gap-0.5 text-xs text-gray-500 hover:text-brand-400 transition-colors"
        >
          <Plus size={11} /> row
        </button>
        <button onClick={onDeleteSection} className="text-gray-700 hover:text-red-400 transition-colors">
          <Trash2 size={11} />
        </button>
        <div className="h-px flex-1 bg-gray-800" />
      </div>

      {sortedRows.length === 0 ? (
        <p className="text-xs text-gray-700 italic pl-10 py-1">Empty — click "+ row" above.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={sortedRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {sortedRows.map((row) => (
                <SortableRow
                  key={row.id} id={row.id}
                  row={row} exercises={exercises}
                  onRefresh={onRefresh}
                  onDelete={() => deleteRow.mutate(row.id)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main SessionEditor
// ---------------------------------------------------------------------------

interface SessionEditorProps {
  session: SessionDto;
  exercises: ExerciseDto[];
  planId: string;
  onRefresh: () => void;
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
    onSuccess: () => { onRefresh(); setSectionName(''); },
  });

  const deleteSection = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/sections/${id}`),
    onSuccess: onRefresh,
  });

  const createRow = useMutation({
    mutationFn: ({ sectionId, groupKey }: { sectionId: string; groupKey: string }) => {
      const sec = session.sections?.find((s) => s.id === sectionId);
      return api.post('/sessions/rows', {
        sectionId,
        exerciseId: exercises[0]?.id ?? '',
        order: sec?.rows?.length ?? 0,
        groupKey,
        volumeType: 'NUMBER',
        volumeValue: '10',
        sets: 3,
        restMinutes: 2,
      });
    },
    onSuccess: onRefresh,
  });

  const hasSections = (session.sections?.length ?? 0) > 0;

  return (
    <div className="space-y-1">
      {/* Single column header row for the whole session */}
      {hasSections && <SessionColumnHeader />}

      {session.sections?.map((section) => (
        <SectionEditor
          key={section.id}
          section={section}
          exercises={exercises}
          onRefresh={onRefresh}
          onDeleteSection={() => deleteSection.mutate(section.id)}
          onAddRow={(sectionId, groupKey) => createRow.mutate({ sectionId, groupKey })}
        />
      ))}

      {/* Add section */}
      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800/60">
        <input
          type="text"
          value={sectionName}
          onChange={(e) => setSectionName(e.target.value)}
          placeholder="New section name (e.g. Strength, Skill work)"
          className="input text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && sectionName.trim()) createSection.mutate(sectionName.trim());
          }}
        />
        <Button
          variant="ghost" size="sm"
          loading={createSection.isPending}
          onClick={() => { if (sectionName.trim()) createSection.mutate(sectionName.trim()); }}
        >
          <Plus size={14} /> Add Section
        </Button>
      </div>
    </div>
  );
}

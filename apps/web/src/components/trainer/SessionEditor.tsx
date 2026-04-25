import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Plus, Trash2, GripVertical, ExternalLink, MessageSquare, X } from 'lucide-react';
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
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '@/lib/api';
import type { SessionDto, SectionDto, ExerciseDto, ExerciseRowDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const VOLUME_TYPES = [
  { value: 'NUMBER', label: '# Reps' },
  { value: 'MAX', label: 'Max Reps' },
  { value: 'TIME_SEC', label: 'Time (sec)' },
  { value: 'MAX_HOLD', label: 'Max Hold' },
  { value: 'HEIGHT_CM', label: 'Height (cm)' },
] as const;

const NO_VALUE_TYPES = new Set(['MAX', 'MAX_HOLD']);

const GROUP_BG: Record<number, string> = {
  0: 'bg-sky-500',   1: 'bg-violet-500', 2: 'bg-amber-500',  3: 'bg-rose-500',
  4: 'bg-emerald-500', 5: 'bg-orange-500', 6: 'bg-cyan-500', 7: 'bg-pink-500',
};

function groupBg(key: string | null | undefined): string {
  if (!key) return 'bg-transparent';
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) & 0xff;
  return GROUP_BG[h % 8] ?? 'bg-sky-500';
}

function nextGroupLetter(rows: ExerciseRowDto[]): string {
  const used = new Set(rows.map((r) => r.groupKey?.toUpperCase()).filter(Boolean));
  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i);
    if (!used.has(letter)) return letter;
  }
  return 'A';
}

// Shared grid: strip | grip | exercise | variant | sets | vol-type | vol-value | rest | group | actions
const GRID_STYLE: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '4px 24px minmax(120px,1.8fr) minmax(100px,1fr) 52px 120px 56px 72px 48px 76px',
  gap: '0 6px',
  alignItems: 'center',
};

// ---------------------------------------------------------------------------
// Column header
// ---------------------------------------------------------------------------

export function SessionColumnHeader() {
  return (
    <div style={GRID_STYLE} className="text-xs text-gray-500 pb-1 select-none">
      <div /><div />
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
// Sortable wrapper
// ---------------------------------------------------------------------------

function SortableRow({
  id, row, exercises, onUpdate, onDelete, onRefresh,
}: {
  id: string;
  row: ExerciseRowDto;
  exercises: ExerciseDto[];
  onUpdate: (data: Partial<ExerciseRowDto>) => void;
  onDelete: () => void;
  onRefresh: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}>
      <RowEditor row={row} exercises={exercises} onUpdate={onUpdate} onDelete={onDelete} onRefresh={onRefresh} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row editor — fully local state, optimistic by design
// ---------------------------------------------------------------------------

function RowEditor({
  row, exercises, onUpdate, onDelete, onRefresh, dragHandleProps,
}: {
  row: ExerciseRowDto;
  exercises: ExerciseDto[];
  onUpdate: (data: Partial<ExerciseRowDto>) => void;
  onDelete: () => void;
  onRefresh: () => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const [exerciseId, setExerciseId] = useState(row.exerciseId);
  const [variantId, setVariantId] = useState(row.variantId ?? '');
  const [sets, setSets] = useState(String(row.sets));
  const [volumeType, setVolumeType] = useState(row.volumeType);
  const [volumeValue, setVolumeValue] = useState(row.volumeValue);
  const [restMinutes, setRestMinutes] = useState(String(row.restMinutes));
  const [groupKey, setGroupKey] = useState(row.groupKey ?? '');
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');

  const prevId = useRef(row.id);
  useEffect(() => {
    if (prevId.current !== row.id) {
      prevId.current = row.id;
      setExerciseId(row.exerciseId);
      setVariantId(row.variantId ?? '');
      setSets(String(row.sets));
      setVolumeType(row.volumeType);
      setVolumeValue(row.volumeValue);
      setRestMinutes(String(row.restMinutes));
      setGroupKey(row.groupKey ?? '');
    }
  });

  const addFeedback = useMutation({
    mutationFn: () => api.post('/feedback', { rowId: row.id, content: feedbackContent }),
    onSuccess: () => { setFeedbackContent(''); onRefresh(); },
  });

  const deleteFeedback = useMutation({
    mutationFn: (id: string) => api.delete(`/feedback/${id}`),
    onSuccess: onRefresh,
  });

  const exercise = exercises.find((e) => e.id === exerciseId);
  const noValue = NO_VALUE_TYPES.has(volumeType);
  const hasFeedback = (row.feedback?.length ?? 0) > 0;

  return (
    <div className="rounded-lg bg-gray-800/40 overflow-hidden">
      {/* Grid row */}
      <div style={GRID_STYLE} className="py-1">
        {/* Colour strip */}
        <div className={cn('w-1 self-stretch rounded-l-lg', groupBg(groupKey || null))} />

        {/* Drag handle */}
        <div className="flex items-center justify-center text-gray-600 hover:text-gray-400 cursor-grab active:cursor-grabbing touch-none" {...dragHandleProps}>
          <GripVertical size={14} />
        </div>

        {/* Exercise */}
        <select value={exerciseId}
          onChange={(e) => { setExerciseId(e.target.value); setVariantId(''); onUpdate({ exerciseId: e.target.value, variantId: null }); }}
          className="input text-xs py-1 truncate">
          {exercises.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
        </select>

        {/* Variant */}
        <select value={variantId}
          onChange={(e) => { setVariantId(e.target.value); onUpdate({ variantId: e.target.value || null }); }}
          className="input text-xs py-1" disabled={!exercise || exercise.variants.length === 0}>
          <option value="">—</option>
          {exercise?.variants.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>

        {/* Sets */}
        <input type="number" min={1} value={sets}
          onChange={(e) => setSets(e.target.value)}
          onBlur={() => { const v = parseInt(sets) || 1; setSets(String(v)); onUpdate({ sets: v }); }}
          className="input text-xs py-1 text-center px-1 w-full" />

        {/* Volume type */}
        <select value={volumeType}
          onChange={(e) => {
            const vt = e.target.value as ExerciseRowDto['volumeType'];
            const vv = NO_VALUE_TYPES.has(vt) ? '' : volumeValue;
            setVolumeType(vt); setVolumeValue(vv);
            onUpdate({ volumeType: vt, volumeValue: vv });
          }}
          className="input text-xs py-1">
          {VOLUME_TYPES.map((vt) => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
        </select>

        {/* Volume value */}
        <input type="text" value={volumeValue}
          onChange={(e) => setVolumeValue(e.target.value)}
          onBlur={() => onUpdate({ volumeValue })}
          className="input text-xs py-1 text-center px-1 w-full"
          placeholder={noValue ? '—' : '10'} disabled={noValue} />

        {/* Rest */}
        <div className="flex items-center gap-0.5">
          <input type="number" min={0} step={0.5} value={restMinutes}
            onChange={(e) => setRestMinutes(e.target.value)}
            onBlur={() => { const v = parseFloat(restMinutes) || 0; setRestMinutes(String(v)); onUpdate({ restMinutes: v }); }}
            className="input text-xs py-1 text-center px-1 w-full" />
          <span className="text-xs text-gray-600 flex-shrink-0">'</span>
        </div>

        {/* Group key */}
        <input type="text" value={groupKey}
          onChange={(e) => { const v = e.target.value.toUpperCase(); setGroupKey(v); onUpdate({ groupKey: v || null }); }}
          maxLength={2} className="input text-xs py-1 text-center px-1 w-full font-mono" placeholder="—" />

        {/* Actions */}
        <div className="flex items-center gap-0.5 pr-1">
          {(exercise?.videoUrl || row.variant?.videoUrl) && (
            <a href={row.variant?.videoUrl ?? exercise?.videoUrl ?? '#'} target="_blank" rel="noopener noreferrer"
              className="p-1 text-gray-500 hover:text-brand-400 rounded transition-colors">
              <ExternalLink size={12} />
            </a>
          )}
          {/* Note button — blue dot when note exists */}
          <button
            onClick={() => setFeedbackModal(true)}
            className={cn(
              'relative p-1 rounded transition-colors',
              hasFeedback ? 'text-blue-400 hover:text-blue-300' : 'text-gray-500 hover:text-blue-400',
            )}
            title={hasFeedback ? 'View / edit note' : 'Add note'}
          >
            <MessageSquare size={12} />
            {hasFeedback && (
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-blue-400 rounded-full" />
            )}
          </button>
          <button onClick={onDelete} className="p-1 text-gray-600 hover:text-red-400 rounded transition-colors">
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Inline note preview */}
      {hasFeedback && (
        <div className="flex items-start gap-1.5 px-3 pb-1.5 pt-0">
          <MessageSquare size={10} className="text-blue-400 mt-0.5 flex-shrink-0" />
          <p
            className="text-xs text-blue-300 italic leading-relaxed cursor-pointer hover:text-blue-200"
            onClick={() => setFeedbackModal(true)}
          >
            {row.feedback![0]!.content}
            {(row.feedback?.length ?? 0) > 1 && (
              <span className="ml-1 text-blue-500 not-italic">+{row.feedback!.length - 1} more</span>
            )}
          </p>
        </div>
      )}

      {/* Feedback modal */}
      <Modal
        open={feedbackModal}
        onClose={() => setFeedbackModal(false)}
        title="Exercise Notes"
        className="max-w-md"
      >
        <div className="space-y-4">
          {/* Existing notes */}
          {hasFeedback && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Existing notes</p>
              {row.feedback!.map((fb) => (
                <div key={fb.id} className="flex items-start gap-2 p-2.5 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                  <p className="text-sm text-blue-200 flex-1 leading-relaxed">{fb.content}</p>
                  <button
                    onClick={() => deleteFeedback.mutate(fb.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0 mt-0.5"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new note */}
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
              {hasFeedback ? 'Add another note' : 'Add note'}
            </p>
            <textarea
              value={feedbackContent}
              onChange={(e) => setFeedbackContent(e.target.value)}
              rows={3} className="input resize-none"
              placeholder="Notes for this exercise..."
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFeedbackModal(false)}>Close</Button>
            <Button
              variant="primary"
              loading={addFeedback.isPending}
              disabled={!feedbackContent.trim()}
              onClick={() => addFeedback.mutate()}
            >
              Save Note
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section editor
// ---------------------------------------------------------------------------

function SectionEditor({
  section, exercises, onRefresh, onDeleteSection, onAddRow,
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

  function sortRows(rows: ExerciseRowDto[]) {
    return [...rows].sort((a, b) => {
      const gA = a.groupKey ?? `\x00${String(a.order).padStart(6, '0')}`;
      const gB = b.groupKey ?? `\x00${String(b.order).padStart(6, '0')}`;
      if (gA !== gB) return gA < gB ? -1 : 1;
      return a.order - b.order;
    });
  }

  const [localRows, setLocalRows] = useState<ExerciseRowDto[]>(() => sortRows(section.rows ?? []));

  // Sync from server on external changes (add row, delete row)
  useEffect(() => { setLocalRows(sortRows(section.rows ?? [])); }, [section.rows]);

  // --- Optimistic row update ---
  const updateRowApi = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExerciseRowDto> }) =>
      api.patch(`/sessions/rows/${id}`, data),
    onError: (_err, _vars, context) => {
      // Rollback to snapshot taken in onMutate
      if (context) setLocalRows((context as ExerciseRowDto[]));
    },
  });

  const handleRowUpdate = useCallback((rowId: string, data: Partial<ExerciseRowDto>) => {
    // Snapshot for rollback
    setLocalRows((prev) => {
      const snapshot = prev;
      // Apply optimistic update
      const next = prev.map((r) => (r.id === rowId ? { ...r, ...data } : r));
      // Fire API with snapshot attached as context
      updateRowApi.mutate({ id: rowId, data }, { onError: () => setLocalRows(snapshot) });
      return next;
    });
  }, []);

  // --- Optimistic delete ---
  const deleteRowApi = useMutation({
    mutationFn: (id: string) => api.delete(`/sessions/rows/${id}`),
    onError: () => onRefresh, // fallback: re-fetch if delete fails
  });

  const handleDeleteRow = useCallback((rowId: string) => {
    setLocalRows((prev) => {
      const snapshot = prev;
      deleteRowApi.mutate(rowId, { onError: () => setLocalRows(snapshot) });
      return prev.filter((r) => r.id !== rowId);
    });
  }, []);

  // --- Drag reorder ---
  const reorderApi = useMutation({
    mutationFn: (orderedIds: string[]) => api.post('/sessions/rows/reorder', { orderedIds }),
  });

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = localRows.findIndex((r) => r.id === active.id);
    const newIdx = localRows.findIndex((r) => r.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;
    const reordered = arrayMove(localRows, oldIdx, newIdx);
    setLocalRows(reordered);
    reorderApi.mutate(reordered.map((r) => r.id));
  }

  const nextGroup = nextGroupLetter(localRows);

  return (
    <div>
      <div className="flex items-center gap-2 my-2">
        <div className="h-px flex-1 bg-gray-800" />
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{section.name}</span>
        <button onClick={() => onAddRow(section.id, nextGroup)}
          className="flex items-center gap-0.5 text-xs text-gray-500 hover:text-brand-400 transition-colors">
          <Plus size={11} /> row
        </button>
        <button onClick={onDeleteSection} className="text-gray-700 hover:text-red-400 transition-colors">
          <Trash2 size={11} />
        </button>
        <div className="h-px flex-1 bg-gray-800" />
      </div>

      {localRows.length === 0 ? (
        <p className="text-xs text-gray-700 italic pl-10 py-1">Empty — click "+ row" above.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={localRows.map((r) => r.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-0.5">
              {localRows.map((row) => (
                <SortableRow
                  key={row.id} id={row.id}
                  row={row} exercises={exercises}
                  onUpdate={(data) => handleRowUpdate(row.id, data)}
                  onDelete={() => handleDeleteRow(row.id)}
                  onRefresh={onRefresh}
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

export function SessionEditor({
  session, exercises, planId, onRefresh,
}: {
  session: SessionDto;
  exercises: ExerciseDto[];
  planId: string;
  onRefresh: () => void;
}) {
  const [sectionName, setSectionName] = useState('');

  const createSection = useMutation({
    mutationFn: (name: string) =>
      api.post<SectionDto>('/sessions/sections', { sessionId: session.id, name, order: session.sections?.length ?? 0 }),
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
        sectionId, exerciseId: exercises[0]?.id ?? '',
        order: sec?.rows?.length ?? 0, groupKey,
        volumeType: 'NUMBER', volumeValue: '10', sets: 3, restMinutes: 2,
      });
    },
    onSuccess: onRefresh,
  });

  return (
    <div className="space-y-1">
      {(session.sections?.length ?? 0) > 0 && <SessionColumnHeader />}

      {session.sections?.map((section) => (
        <SectionEditor
          key={section.id} section={section} exercises={exercises}
          onRefresh={onRefresh}
          onDeleteSection={() => deleteSection.mutate(section.id)}
          onAddRow={(sectionId, groupKey) => createRow.mutate({ sectionId, groupKey })}
        />
      ))}

      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-800/60">
        <input type="text" value={sectionName} onChange={(e) => setSectionName(e.target.value)}
          placeholder="New section name (e.g. Strength, Skill work)"
          className="input text-sm flex-1"
          onKeyDown={(e) => { if (e.key === 'Enter' && sectionName.trim()) createSection.mutate(sectionName.trim()); }}
        />
        <Button variant="ghost" size="sm" loading={createSection.isPending}
          onClick={() => { if (sectionName.trim()) createSection.mutate(sectionName.trim()); }}>
          <Plus size={14} /> Add Section
        </Button>
      </div>
    </div>
  );
}

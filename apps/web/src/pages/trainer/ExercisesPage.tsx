import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, GripVertical, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';
import type { ExerciseDto, ExerciseVariantDto } from '@calist/shared';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';

interface ExerciseFormData {
  name: string;
  videoUrl: string;
}

interface VariantFormData {
  name: string;
  videoUrl: string;
}

export function ExercisesPage() {
  const qc = useQueryClient();
  const [expandedExercises, setExpandedExercises] = useState<Set<string>>(new Set());
  const [exerciseModal, setExerciseModal] = useState<{
    open: boolean;
    editId?: string;
    data: ExerciseFormData;
  }>({ open: false, data: { name: '', videoUrl: '' } });
  const [variantModal, setVariantModal] = useState<{
    open: boolean;
    exerciseId?: string;
    editId?: string;
    data: VariantFormData;
  }>({ open: false, data: { name: '', videoUrl: '' } });

  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => api.get<ExerciseDto[]>('/exercises'),
  });

  const createExercise = useMutation({
    mutationFn: (data: ExerciseFormData) => api.post<ExerciseDto>('/exercises', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      setExerciseModal({ open: false, data: { name: '', videoUrl: '' } });
    },
  });

  const updateExercise = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExerciseFormData> }) =>
      api.patch<ExerciseDto>(`/exercises/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      setExerciseModal({ open: false, data: { name: '', videoUrl: '' } });
    },
  });

  const deleteExercise = useMutation({
    mutationFn: (id: string) => api.delete(`/exercises/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });

  const createVariant = useMutation({
    mutationFn: ({ exerciseId, data }: { exerciseId: string; data: VariantFormData }) =>
      api.post<ExerciseVariantDto>(`/exercises/${exerciseId}/variants`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      setVariantModal({ open: false, data: { name: '', videoUrl: '' } });
    },
  });

  const updateVariant = useMutation({
    mutationFn: ({ exerciseId, variantId, data }: { exerciseId: string; variantId: string; data: Partial<VariantFormData> }) =>
      api.patch<ExerciseVariantDto>(`/exercises/${exerciseId}/variants/${variantId}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exercises'] });
      setVariantModal({ open: false, data: { name: '', videoUrl: '' } });
    },
  });

  const deleteVariant = useMutation({
    mutationFn: ({ exerciseId, variantId }: { exerciseId: string; variantId: string }) =>
      api.delete(`/exercises/${exerciseId}/variants/${variantId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });

  const reorderVariants = useMutation({
    mutationFn: ({ exerciseId, orderedIds }: { exerciseId: string; orderedIds: string[] }) =>
      api.post(`/exercises/${exerciseId}/variants/reorder`, { orderedIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });

  function toggleExpand(id: string) {
    setExpandedExercises((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleMoveVariant(exerciseId: string, variants: ExerciseVariantDto[], fromIdx: number, toIdx: number) {
    const reordered = [...variants];
    const [item] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, item!);
    reorderVariants.mutate({ exerciseId, orderedIds: reordered.map((v) => v.id) });
  }

  function handleExerciseSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { editId, data } = exerciseModal;
    if (editId) {
      updateExercise.mutate({ id: editId, data });
    } else {
      createExercise.mutate(data);
    }
  }

  function handleVariantSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { exerciseId, editId, data } = variantModal;
    if (!exerciseId) return;
    if (editId) {
      updateVariant.mutate({ exerciseId, variantId: editId, data });
    } else {
      createVariant.mutate({ exerciseId, data });
    }
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Exercise Pool</h1>
          <p className="text-gray-400 text-sm mt-1">Define exercises and their difficulty variants</p>
        </div>
        <Button
          variant="primary"
          onClick={() => setExerciseModal({ open: true, data: { name: '', videoUrl: '' } })}
        >
          <Plus size={16} />
          Add Exercise
        </Button>
      </div>

      {isLoading ? (
        <div className="text-gray-500 text-sm">Loading exercises...</div>
      ) : exercises.length === 0 ? (
        <div className="card text-center py-12 text-gray-500">
          <p>No exercises yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exercises.map((exercise) => {
            const expanded = expandedExercises.has(exercise.id);
            return (
              <div key={exercise.id} className="card">
                {/* Exercise header */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggleExpand(exercise.id)}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    {expanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-100">{exercise.name}</p>
                    {exercise.videoUrl && (
                      <a
                        href={exercise.videoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 mt-0.5"
                      >
                        <ExternalLink size={10} />
                        Video
                      </a>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{exercise.variants.length} variants</span>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setExerciseModal({
                          open: true,
                          editId: exercise.id,
                          data: { name: exercise.name, videoUrl: exercise.videoUrl ?? '' },
                        })
                      }
                    >
                      <Pencil size={14} />
                    </Button>
                    <Button
                      size="icon"
                      variant="danger"
                      onClick={() => deleteExercise.mutate(exercise.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>

                {/* Variants */}
                {expanded && (
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                        Variants (difficulty order, lowest → highest)
                      </p>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setVariantModal({
                            open: true,
                            exerciseId: exercise.id,
                            data: { name: '', videoUrl: '' },
                          })
                        }
                      >
                        <Plus size={12} />
                        Add variant
                      </Button>
                    </div>

                    {exercise.variants.length === 0 ? (
                      <p className="text-xs text-gray-600 italic">No variants yet</p>
                    ) : (
                      <div className="space-y-1">
                        {exercise.variants.map((variant, idx) => (
                          <div
                            key={variant.id}
                            className="flex items-center gap-2 px-2 py-1.5 bg-gray-800/50 rounded-lg"
                          >
                            <div className="text-gray-600 cursor-grab">
                              <GripVertical size={14} />
                            </div>
                            <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400 font-mono flex-shrink-0">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-200">{variant.name}</span>
                              {variant.videoUrl && (
                                <a
                                  href={variant.videoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="ml-2 text-xs text-brand-400 hover:text-brand-300"
                                >
                                  <ExternalLink size={10} className="inline" />
                                </a>
                              )}
                            </div>
                            <div className="flex gap-1">
                              {idx > 0 && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    handleMoveVariant(exercise.id, exercise.variants, idx, idx - 1)
                                  }
                                >
                                  ↑
                                </Button>
                              )}
                              {idx < exercise.variants.length - 1 && (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() =>
                                    handleMoveVariant(exercise.id, exercise.variants, idx, idx + 1)
                                  }
                                >
                                  ↓
                                </Button>
                              )}
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() =>
                                  setVariantModal({
                                    open: true,
                                    exerciseId: exercise.id,
                                    editId: variant.id,
                                    data: { name: variant.name, videoUrl: variant.videoUrl ?? '' },
                                  })
                                }
                              >
                                <Pencil size={12} />
                              </Button>
                              <Button
                                size="icon"
                                variant="danger"
                                onClick={() =>
                                  deleteVariant.mutate({
                                    exerciseId: exercise.id,
                                    variantId: variant.id,
                                  })
                                }
                              >
                                <Trash2 size={12} />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Exercise Modal */}
      <Modal
        open={exerciseModal.open}
        onClose={() => setExerciseModal({ open: false, data: { name: '', videoUrl: '' } })}
        title={exerciseModal.editId ? 'Edit Exercise' : 'New Exercise'}
        className="max-w-md"
      >
        <form onSubmit={handleExerciseSubmit} className="space-y-4">
          <Input
            label="Exercise name"
            value={exerciseModal.data.name}
            onChange={(e) =>
              setExerciseModal((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))
            }
            placeholder="e.g. Pull-up"
            required
          />
          <Input
            label="Video URL (optional)"
            type="url"
            value={exerciseModal.data.videoUrl}
            onChange={(e) =>
              setExerciseModal((prev) => ({
                ...prev,
                data: { ...prev.data, videoUrl: e.target.value },
              }))
            }
            placeholder="https://youtube.com/..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setExerciseModal({ open: false, data: { name: '', videoUrl: '' } })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createExercise.isPending || updateExercise.isPending}
            >
              {exerciseModal.editId ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Variant Modal */}
      <Modal
        open={variantModal.open}
        onClose={() => setVariantModal({ open: false, data: { name: '', videoUrl: '' } })}
        title={variantModal.editId ? 'Edit Variant' : 'Add Variant'}
        className="max-w-md"
      >
        <form onSubmit={handleVariantSubmit} className="space-y-4">
          <Input
            label="Variant name"
            value={variantModal.data.name}
            onChange={(e) =>
              setVariantModal((prev) => ({ ...prev, data: { ...prev.data, name: e.target.value } }))
            }
            placeholder="e.g. Band-assisted"
            required
          />
          <Input
            label="Video URL (optional)"
            type="url"
            value={variantModal.data.videoUrl}
            onChange={(e) =>
              setVariantModal((prev) => ({
                ...prev,
                data: { ...prev.data, videoUrl: e.target.value },
              }))
            }
            placeholder="https://youtube.com/..."
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setVariantModal({ open: false, data: { name: '', videoUrl: '' } })}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createVariant.isPending || updateVariant.isPending}
            >
              {variantModal.editId ? 'Save' : 'Add'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

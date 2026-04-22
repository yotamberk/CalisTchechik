import { z } from 'zod';

export const GoogleAuthSchema = z.object({
  credential: z.string(),
});

export const SwitchRoleSchema = z.object({
  role: z.enum(['ADMIN', 'TRAINER', 'TRAINEE']),
  targetUserId: z.string().optional(),
});

export const AddTrainerSchema = z.object({
  email: z.string().email(),
});

export const AddTraineeSchema = z.object({
  email: z.string().email(),
});

export const CreateExerciseSchema = z.object({
  name: z.string().min(1),
  videoUrl: z.string().url().optional().or(z.literal('')),
});

export const UpdateExerciseSchema = CreateExerciseSchema.partial();

export const CreateVariantSchema = z.object({
  name: z.string().min(1),
  videoUrl: z.string().url().optional().or(z.literal('')),
  difficultyOrder: z.number().int().default(0),
});

export const UpdateVariantSchema = CreateVariantSchema.partial();

export const ReorderVariantsSchema = z.object({
  orderedIds: z.array(z.string()),
});

export const CreatePlanSchema = z.object({
  traineeId: z.string(),
  name: z.string().min(1),
  startDate: z.string(),
});

export const CreateWeekSchema = z.object({
  planId: z.string(),
  weekNumber: z.number().int().positive(),
  startDate: z.string(),
  notes: z.string().optional(),
});

export const CreateSessionSchema = z.object({
  weekId: z.string(),
  name: z.string().min(1),
  order: z.number().int().default(0),
});

export const CreateSectionSchema = z.object({
  sessionId: z.string(),
  name: z.string().min(1),
  order: z.number().int().default(0),
});

export const VolumeTypeEnum = z.enum(['NUMBER', 'MAX', 'HEIGHT_CM']);

export const CreateExerciseRowSchema = z.object({
  sectionId: z.string(),
  order: z.number().int().default(0),
  groupKey: z.string().optional().nullable(),
  exerciseId: z.string(),
  variantId: z.string().optional().nullable(),
  restMinutes: z.number().default(2),
  volumeType: VolumeTypeEnum.default('NUMBER'),
  volumeValue: z.string().default('10'),
  breakMinutes: z.number().default(1),
  sets: z.number().int().default(3),
});

export const UpdateExerciseRowSchema = CreateExerciseRowSchema.partial();

export const UpsertSessionLogSchema = z.object({
  sessionId: z.string(),
  performedOn: z.string().optional().nullable(),
  completedAt: z.string().optional().nullable(),
});

export const UpsertRowLogSchema = z.object({
  rowId: z.string(),
  rpe: z.number().int().min(1).max(10).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const CreateFeedbackSchema = z.object({
  weekId: z.string().optional(),
  rowId: z.string().optional(),
  content: z.string().min(1),
});

export const CopyWeekSchema = z.object({
  sourcePlanId: z.string(),
  sourceWeekNumber: z.number().int(),
  targetPlanId: z.string(),
  targetWeekNumber: z.number().int(),
  targetStartDate: z.string(),
});

export const CopySessionSchema = z.object({
  sourceSessionId: z.string(),
  targetWeekId: z.string(),
  newName: z.string().optional(),
  newOrder: z.number().int().optional(),
});

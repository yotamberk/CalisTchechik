export type Role = 'ADMIN' | 'TRAINER' | 'TRAINEE';
export type VolumeType = 'NUMBER' | 'MAX' | 'HEIGHT_CM' | 'TIME_SEC' | 'MAX_HOLD';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  roles: Role[];
  createdAt: string;
}

export interface AuthMeResponse {
  user: UserDto;
  activeRole: Role;
  availableRoles: Role[];
}

export interface ExerciseVariantDto {
  id: string;
  exerciseId: string;
  name: string;
  videoUrl?: string | null;
  difficultyOrder: number;
}

export interface ExerciseDto {
  id: string;
  trainerId: string;
  name: string;
  videoUrl?: string | null;
  order: number;
  variants: ExerciseVariantDto[];
}

export interface ExerciseRowDto {
  id: string;
  sectionId: string;
  order: number;
  groupKey?: string | null;
  exerciseId: string;
  exercise?: ExerciseDto;
  variantId?: string | null;
  variant?: ExerciseVariantDto | null;
  restMinutes: number;
  volumeType: VolumeType;
  volumeValue: string;
  sets: number;
  skipRating: boolean;
  feedback?: TrainerFeedbackDto[];
}

export interface SectionDto {
  id: string;
  sessionId: string;
  name: string;
  order: number;
  rows: ExerciseRowDto[];
}

export interface SessionDto {
  id: string;
  weekId: string;
  name: string;
  order: number;
  sections: SectionDto[];
  logs?: SessionLogDto[];
}

export interface WeekDto {
  id: string;
  planId: string;
  weekNumber: number;
  startDate: string;
  endDate?: string | null;
  notes?: string | null;
  sessions: SessionDto[];
  feedback?: TrainerFeedbackDto[];
}

export interface PlanDto {
  id: string;
  trainerId: string;
  traineeId: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  trainee?: UserDto;
  weeks: WeekDto[];
}

export interface RowLogDto {
  id: string;
  sessionLogId: string;
  rowId: string;
  rpe?: number | null;
  notes?: string | null;
}

export interface SessionLogDto {
  id: string;
  sessionId: string;
  traineeId: string;
  startedAt?: string | null;
  performedOn?: string | null;
  completedAt?: string | null;
  rowLogs: RowLogDto[];
}

export interface TrainerFeedbackDto {
  id: string;
  authorId: string;
  author?: UserDto;
  weekId?: string | null;
  rowId?: string | null;
  content: string;
  createdAt: string;
}

export interface TraineeProfileDto {
  user: UserDto;
  currentVariants: CurrentExerciseStatus[];
}

export interface CurrentExerciseStatus {
  exerciseId: string;
  exerciseName: string;
  variantId?: string | null;
  variantName?: string | null;
  volumeValue: string;
  volumeType: VolumeType;
  performedOn: string;
}

export interface PendingAccessRequestDto {
  id: string;
  email: string;
  name?: string | null;
  avatar?: string | null;
  attemptedAt: string;
}

export interface TraineePlanStatus {
  trainee: UserDto;
  activePlan?: PlanDto | null;
  currentWeek?: WeekDto | null;
  completedSessions: number;
  totalSessions: number;
}

// ---------------------------------------------------------------------------
// Paginated wrapper
// ---------------------------------------------------------------------------

export interface Paginated<T> {
  items: T[];
  total: number;
  nextOffset: number | null;
}

// ---------------------------------------------------------------------------
// Progress page types
// ---------------------------------------------------------------------------

export interface ExerciseProgressSummaryDto {
  exerciseId: string;
  exerciseName: string;
  hasVariants: boolean;
  /** Best (highest difficultyOrder) variant the trainee has completed */
  maxVariantName?: string | null;
  maxDifficultyOrder?: number | null;
  /** Most recently logged variant */
  currentVariantName?: string | null;
  currentVolumeType: VolumeType;
  currentVolumeValue: string;
  lastPerformedOn: string;
  completedCount: number;
}

export interface ExerciseProgressPointDto {
  date: string;
  variantName: string | null;
  variantDifficultyOrder: number | null;
  volumeValue: string;
  volumeType: string;
  rpe: number | null;
  notes?: string | null;
}

// ---------------------------------------------------------------------------
// History page types
// ---------------------------------------------------------------------------

export interface SessionTimelineItemDto {
  logId: string;
  sessionId: string;
  sessionName: string;
  planName: string;
  weekNumber: number;
  performedOn: string | null;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  exerciseCount: number;
  completed: boolean;
}

export interface SessionLogDetailRowDto {
  rowId: string;
  exerciseName: string;
  variantName?: string | null;
  volumeType: string;
  volumeValue: string;
  sets: number;
  skipRating: boolean;
  rpe?: number | null;
  notes?: string | null;
}

export interface SessionLogDetailDto {
  logId: string;
  sessionId: string;
  sessionName: string;
  planName: string;
  weekNumber: number;
  startedAt: string | null;
  performedOn: string | null;
  completedAt: string | null;
  durationMs: number | null;
  rows: SessionLogDetailRowDto[];
}

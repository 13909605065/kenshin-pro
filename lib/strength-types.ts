export type BodyPart = "chest" | "back" | "legs" | "shoulders" | "arms" | "core" | "lower" | "upper_push" | "upper_pull" | "full_body";
export type Equipment = "barbell" | "dumbbell" | "cable" | "bodyweight" | "machine" | "kettlebell" | "med_ball" | "band" | "bosu" | "bench" | "other";

export interface ExerciseLibItem {
  id: string;
  name: string;
  body_part: BodyPart;
  equipment: Equipment;
  description: string;
  cue_points: string[];     // 动作要点
  progression: string;       // 进阶变式（更难）
  regression: string;        // 退阶变式（更易）
  image_url?: string;
}

export interface PlanExercise extends ExerciseLibItem {
  sets: number;
  reps: number;
  load: string;              // e.g. "80% 1RM" or "60kg"
  rest: number;              // seconds
}

export interface StrengthTemplate {
  id: string;
  name: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  exercises: {
    exerciseId: string;
    sets: number;
    reps: number;
    load: string;
    rest: number;
  }[];
}

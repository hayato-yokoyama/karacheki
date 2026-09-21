import type { SegmentOption } from "@/components/segmentedControl";
import {
	LIFT_EXERCISE_LABEL,
	LIFT_EXERCISES,
	type LiftExercise,
} from "@/services/oneRepMax";

/**
 * BIG3 の種目切り替えの選択肢
 *
 * 一覧と 1RM換算表で同じ並び・同じ文言にするため、ここで 1 つだけ作る
 */
export const LIFT_EXERCISE_SEGMENTS: SegmentOption<LiftExercise>[] =
	LIFT_EXERCISES.map((value) => ({ value, label: LIFT_EXERCISE_LABEL[value] }));

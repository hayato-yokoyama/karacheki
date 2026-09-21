import { format, isSameDay, parseISO } from "date-fns";
import {
	estimateOneRepMax,
	type LiftRecord,
	roundOneRepMax,
} from "@/services/oneRepMax";

/**
 * BIG3 の表示フォーマット（#81）
 *
 * 一覧・記録の詳細・追加／編集で同じ値の見せ方を揃えるため、
 * 日付と重量の整形はここに集める
 */

/** 実施日（YYYY-MM-DD）を Date にする。時刻を持たないのでローカルの 0 時になる */
export const parsePerformedAt = (performedAt: string) => parseISO(performedAt);

/** 挙上重量。入力した値をそのまま小数第1位まで見せる */
export const formatWeight = (weight: number) => weight.toFixed(1);

/** 推定 1RM。整数に丸めてから出す */
export const formatEstimated = (
	record: Pick<LiftRecord, "exercise" | "weight" | "reps">,
) => String(roundOneRepMax(estimateOneRepMax(record)));

/** 記録の行の 1 行目に置く年 */
export const formatRecordYear = (performedAt: string) =>
	format(parsePerformedAt(performedAt), "yyyy");

/** 記録の行の 2 行目に置く月日 */
export const formatRecordMonthDay = (performedAt: string) =>
	format(parsePerformedAt(performedAt), "M/d");

/** 自己ベストのヒーローの右上に置く日付 */
export const formatHeroDate = (performedAt: string) =>
	format(parsePerformedAt(performedAt), "yyyy.M.d");

/** 記録の詳細と日付チップに置く日付 */
export const formatFullDate = (performedAt: string | Date) =>
	format(
		typeof performedAt === "string"
			? parsePerformedAt(performedAt)
			: performedAt,
		"yyyy/MM/dd",
	);

/** 日付チップに「今日」を出すかどうかの判定 */
export const isToday = (date: Date) => isSameDay(date, new Date());

/** 自己ベストのヒーローに添える、推定値の出どころ（`90.0kg × 5`） */
export const formatSet = (record: Pick<LiftRecord, "weight" | "reps">) =>
	`${formatWeight(record.weight)}kg × ${record.reps}`;

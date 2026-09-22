/** BIG3 の種目 */
export type LiftExercise = "benchPress" | "squat" | "deadlift";

/** 画面に出す順番 */
export const LIFT_EXERCISES = [
	"benchPress",
	"squat",
	"deadlift",
] as const satisfies readonly LiftExercise[];

export const LIFT_EXERCISE_LABEL: Record<LiftExercise, string> = {
	benchPress: "ベンチプレス",
	squat: "スクワット",
	deadlift: "デッドリフト",
};

/** 画面間で受け渡した値が BIG3 の種目かどうかを確かめる */
export const isLiftExercise = (value: unknown): value is LiftExercise =>
	typeof value === "string" &&
	(LIFT_EXERCISES as readonly string[]).includes(value);

/** 入力できるレップ数の上限。これを超えると推定の精度が落ちる */
export const MAX_REPS = 12;

/** 1 回の挙上記録 */
export type LiftRecord = {
	id: string;
	exercise: LiftExercise;
	/** 挙上重量(kg)。小数第1位まで */
	weight: number;
	/** レップ数。1〜12 */
	reps: number;
	/** 実施日（YYYY-MM-DD） */
	performedAt: string;
	/** 保存日時（ISO文字列） */
	createdAt: string;
};

/** 自己ベスト */
export type LiftPr = {
	/** 実際に 1 レップで挙げた最高重量。まだ無ければ undefined */
	actual?: LiftRecord;
	/** 推定 1RM が最も高い記録 */
	estimated?: LiftRecord;
};

/**
 * 種目ごとの RM 換算の除数
 *
 * FWJ の RM 換算表（https://fwj.jp/magazine/rm/）の実値と計算結果が一致する値。
 * 画面には出典を出さないが、値の根拠が分からなくなるとあとから検証できないため残す
 */
const RM_DIVISOR: Record<LiftExercise, number> = {
	benchPress: 40,
	squat: 33.3,
	deadlift: 33.3,
};

/** 換算表に並べる重量(kg)の下限・上限・刻み */
const RM_TABLE_MIN_WEIGHT = 60;
const RM_TABLE_MAX_WEIGHT = 300;
const RM_TABLE_WEIGHT_STEP = 2.5;

/**
 * 換算表の行になる重量
 *
 * 刻みはプレートの最小単位に近い 2.5kg にして、実際に組める重量がそのまま
 * 表にあるようにする
 */
export const RM_TABLE_WEIGHTS = Array.from(
	{
		length:
			(RM_TABLE_MAX_WEIGHT - RM_TABLE_MIN_WEIGHT) / RM_TABLE_WEIGHT_STEP + 1,
	},
	(_, index) => RM_TABLE_MIN_WEIGHT + index * RM_TABLE_WEIGHT_STEP,
);

/**
 * 換算表の列になるレップ数
 *
 * 1 レップは換算せず挙上重量をそのまま返すので、列にしても重量を繰り返すだけ。
 * 2 から始める
 */
export const RM_TABLE_REPS = Array.from(
	{ length: MAX_REPS - 1 },
	(_, index) => index + 2,
);

/**
 * 画面に出す換算式。推定値の出どころを見せるためのもの
 *
 * 演算子を全角にしているのは、日本語の文中で半角だと前後の余白が詰まって読みにくいため
 */
export const RM_FORMULA_LABEL: Record<LiftExercise, string> = {
	benchPress: "重量 × レップ ÷ 40 ＋ 重量",
	squat: "重量 × レップ ÷ 33.3 ＋ 重量",
	deadlift: "重量 × レップ ÷ 33.3 ＋ 重量",
};

/** 1RM そのものの説明。ヒーローの下に添える */
export const ONE_REP_MAX_DESCRIPTION = "1RM ＝ 1回しか挙げられない最大重量";

/**
 * 推定 1RM を返す
 *
 * 1 レップはそれ自体が 1RM なので換算しない。
 * 式をそのまま当てると 1.025 倍になり、実測 PR を換算 PR が上回ってしまう
 */
export const estimateOneRepMax = ({
	exercise,
	weight,
	reps,
}: Pick<LiftRecord, "exercise" | "weight" | "reps">) =>
	reps === 1 ? weight : weight * (1 + reps / RM_DIVISOR[exercise]);

/**
 * 推定 1RM を表示用の整数に丸める
 *
 * 100 × (1 + 11 / 40) は 127.49999... になり Math.round が 127 を返してしまう。
 * 小数第1位で一度丸めてから整数にすることで、換算表と同じ 128 に揃える
 */
export const roundOneRepMax = (value: number) =>
	Math.round(Math.round(value * 10) / 10);

/**
 * 換算表の 1 行ぶんの推定 1RM を返す
 *
 * 画面に出す値をそのまま並べるため、丸めたあとの値を返す。表から読んだ数字と
 * 自己ベストの数字が食い違わないようにする
 */
export const buildRmTableRow = (exercise: LiftExercise, weight: number) =>
	RM_TABLE_REPS.map((reps) =>
		roundOneRepMax(estimateOneRepMax({ exercise, weight, reps })),
	);

/**
 * 換算表のまとまり
 *
 * スクワットとデッドリフトは換算の除数が同じなので、表の中身も一字一句同じになる。
 * 別々に並べても選ぶ意味がないため、1 つにまとめて見せる
 */
export type RmTableGroup = "benchPress" | "squatDeadlift";

/** 画面に出す順番 */
export const RM_TABLE_GROUPS = [
	"benchPress",
	"squatDeadlift",
] as const satisfies readonly RmTableGroup[];

export const RM_TABLE_GROUP_LABEL: Record<RmTableGroup, string> = {
	benchPress: "ベンチプレス",
	squatDeadlift: "スクワット・デッドリフト",
};

/** そのまとまりを代表する種目。換算式と表の値はこれで決まる */
const RM_TABLE_GROUP_EXERCISE: Record<RmTableGroup, LiftExercise> = {
	benchPress: "benchPress",
	squatDeadlift: "squat",
};

const EXERCISE_RM_TABLE_GROUP: Record<LiftExercise, RmTableGroup> = {
	benchPress: "benchPress",
	squat: "squatDeadlift",
	deadlift: "squatDeadlift",
};

/** 一覧で選んでいる種目から、開く表のまとまりを決める */
export const toRmTableGroup = (exercise: LiftExercise) =>
	EXERCISE_RM_TABLE_GROUP[exercise];

/** まとまりごとの換算式 */
export const getRmTableFormula = (group: RmTableGroup) =>
	RM_FORMULA_LABEL[RM_TABLE_GROUP_EXERCISE[group]];

/** 換算表の 1 行。重量と、2〜12 レップの推定 1RM */
export type RmTableRow = {
	weight: number;
	values: number[];
};

/**
 * まとまりごとに作った換算表を使い回すための置き場
 *
 * 中身は重量とレップ数だけで決まり、記録に関係なく変わらない
 */
const rmTableRowsCache = new Map<RmTableGroup, RmTableRow[]>();

/**
 * 換算表の全行を返す
 *
 * 97 行 × 11 列を切り替えるたびに計算し直すと、その引っかかりが
 * 切り替えの遅さになる。値は変わらないので一度作ったら取っておく
 */
export const getRmTableRows = (group: RmTableGroup): RmTableRow[] => {
	const cached = rmTableRowsCache.get(group);

	if (cached) {
		return cached;
	}

	const exercise = RM_TABLE_GROUP_EXERCISE[group];
	const rows = RM_TABLE_WEIGHTS.map((weight) => ({
		weight,
		values: buildRmTableRow(exercise, weight),
	}));

	rmTableRowsCache.set(group, rows);

	return rows;
};

/**
 * 先に到達したのはどちらかを判定する
 *
 * 実施日は日付までしか持たないので、同じ日の記録は保存した順で決める
 */
const isEarlier = (target: LiftRecord, other: LiftRecord) =>
	target.performedAt !== other.performedAt
		? target.performedAt < other.performedAt
		: target.createdAt < other.createdAt;

/**
 * 値が最大の記録を 1 件選ぶ
 *
 * 同値なら先に到達した方を残す。PR は「いつ初めてそこに到達したか」に意味があるため。
 * 比較は丸める前の値で行う。丸めてから比べると 127.5kg と 127.6kg が同値になり、
 * 新記録が PR として出てこなくなる
 */
const pickBest = (
	records: readonly LiftRecord[],
	getValue: (record: LiftRecord) => number,
) =>
	records.reduce<LiftRecord | undefined>((best, record) => {
		if (!best) {
			return record;
		}

		const diff = getValue(record) - getValue(best);

		if (diff !== 0) {
			return diff > 0 ? record : best;
		}

		return isEarlier(record, best) ? record : best;
	}, undefined);

/**
 * 指定した種目の PR を記録一覧から導出する
 *
 * 保存時に PR を確定させると、記録を消したときに PR 側だけ古い値が残って壊れる。
 * 記録は年単位でも数百件なので、毎回全件を走査する
 */
export const getLiftPr = (
	records: readonly LiftRecord[],
	exercise: LiftExercise,
): LiftPr => {
	const targets = records.filter((record) => record.exercise === exercise);

	return {
		actual: pickBest(
			targets.filter((record) => record.reps === 1),
			(record) => record.weight,
		),
		estimated: pickBest(targets, estimateOneRepMax),
	};
};

/**
 * 自己ベストの見せ方（#81）
 *
 * 一覧のヒーローは「実測と推定が一致するか」で枚数も文言も変わる。
 * 画面側で `actual` / `estimated` の有無を毎回場合分けすると条件が散らばるので、
 * 表示の分岐と同じ 4 つの状態にしてから渡す
 */
export type LiftBest =
	/** まだ記録がない */
	| { kind: "none" }
	/** 実測 1RM が推定 1RM でもある（同じ記録） */
	| { kind: "same"; record: LiftRecord }
	/** 1 レップの記録がまだない */
	| { kind: "estimatedOnly"; estimated: LiftRecord }
	/** 実測 1RM と推定 1RM が別の記録 */
	| { kind: "differ"; estimated: LiftRecord; actual: LiftRecord };

/** 指定した種目の自己ベストを、表示の 4 状態に分けて返す */
export const getLiftBest = (
	records: readonly LiftRecord[],
	exercise: LiftExercise,
): LiftBest => {
	const { actual, estimated } = getLiftPr(records, exercise);

	// 実測は記録の一部なので、実測があって推定がないことは起こらない
	if (!estimated) {
		return { kind: "none" };
	}

	if (!actual) {
		return { kind: "estimatedOnly", estimated };
	}

	return actual.id === estimated.id
		? { kind: "same", record: actual }
		: { kind: "differ", estimated, actual };
};

/** 記録の行に出すバッジの種類 */
export type LiftPrKind = "both" | "actual" | "estimated";

/**
 * その記録が自己ベストなら、どちらの自己ベストかを返す
 *
 * 実測と推定が同じ記録のときにバッジを 2 つ並べても同じ事実の繰り返しにしかならないので、
 * `both` にまとめて 1 つだけ出す
 */
export const getLiftPrKind = (
	record: LiftRecord,
	pr: LiftPr,
): LiftPrKind | undefined => {
	const isActual = pr.actual?.id === record.id;
	const isEstimated = pr.estimated?.id === record.id;

	if (isActual && isEstimated) {
		return "both";
	}

	if (isActual) {
		return "actual";
	}

	return isEstimated ? "estimated" : undefined;
};

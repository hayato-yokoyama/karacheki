import { addMonths, format, subMonths } from "date-fns";

/** 1日のミリ秒 */
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 指を離したあと、離した瞬間の速度で何秒ぶん進み続けるか
 *
 * 1回のスワイプで進む距離を決める値。大きくするとよく滑る
 */
const FLING_DECAY_SECONDS = 0.6;

/** 慣性スクロールのアニメーション時間 */
export const FLING_DURATION_MS = 600;

/** 「今日へ」で今日まで戻るときのアニメーション時間 */
export const SCROLL_TO_LATEST_DURATION_MS = 450;

/** グラフに描画する1点（X軸はタイムスタンプ） */
export type GraphPoint = {
	date: number;
	actualWeight: number;
	trendWeight: number | null;
};

/** グラフの表示窓（X軸の範囲） */
export type GraphWindow = {
	startMs: number;
	endMs: number;
};

/** 終端時刻と表示月数から表示窓を求める */
export const getWindow = (endMs: number, months: number): GraphWindow => ({
	startMs: subMonths(new Date(endMs), months).getTime(),
	endMs,
});

/**
 * 終端時刻を「最古データが左端に来る位置」〜「今日」に収める
 *
 * データの範囲が表示幅より短いときは、常に今日を終端にする
 */
export const clampWindowEnd = ({
	endMs,
	months,
	oldestMs,
	nowMs,
}: {
	endMs: number;
	months: number;
	oldestMs: number;
	nowMs: number;
}): number => {
	const minEnd = Math.min(
		addMonths(new Date(oldestMs), months).getTime(),
		nowMs,
	);

	return Math.min(Math.max(endMs, minEnd), nowMs);
};

/**
 * 指の横移動量(px)のぶんだけ終端時刻をずらす
 *
 * 右へドラッグ（deltaX > 0）すると過去へ遡る。
 * ドラッグ開始位置からの累計ではなく1フレームぶんの差分を渡すことで、
 * 端に張り付いたまま引っ張り続けても行き過ぎが溜まらない
 */
export const panToEndMs = ({
	endMs,
	deltaX,
	chartWidth,
	months,
}: {
	endMs: number;
	deltaX: number;
	chartWidth: number;
	months: number;
}): number => {
	// レイアウト確定前は幅が 0 になるため、その場合は動かさない
	if (chartWidth <= 0) {
		return endMs;
	}

	const currentWindow = getWindow(endMs, months);
	const msPerPx = (currentWindow.endMs - currentWindow.startMs) / chartWidth;

	return endMs - deltaX * msPerPx;
};

/**
 * 指を離したあと、慣性で滑っていく先の終端時刻を求める
 *
 * @param velocityX 指を離した瞬間の横方向の速度(px/秒)
 */
export const flingToEndMs = ({
	endMs,
	velocityX,
	chartWidth,
	months,
}: {
	endMs: number;
	velocityX: number;
	chartWidth: number;
	months: number;
}): number =>
	panToEndMs({
		endMs,
		deltaX: velocityX * FLING_DECAY_SECONDS,
		chartWidth,
		months,
	});

/** アニメーションの進み具合。終わりに向かって減速する */
export const easeOutCubic = (progress: number): number => {
	const clamped = Math.min(Math.max(progress, 0), 1);

	return 1 - (1 - clamped) ** 3;
};

/**
 * 表示窓に含まれるデータを抽出する
 *
 * 線が枠の端まで届くように、窓の前後1点ずつも含める。
 * 窓が測定の空白期間にすっぽり入る場合は、その空白を挟む2点を返して線を通す。
 * 枠外は victory-native 側でクリップされる。
 *
 * @param points 日付の昇順に並んだデータ
 */
export const sliceByWindow = (
	points: readonly GraphPoint[],
	{ startMs, endMs }: GraphWindow,
): GraphPoint[] => {
	if (points.length === 0) {
		return [];
	}

	const firstIndex = points.findIndex((point) => point.date >= startMs);
	// すべて窓より過去
	if (firstIndex === -1) {
		return points.slice(-1);
	}

	let lastIndex = -1;
	for (let i = points.length - 1; i >= 0; i--) {
		if (points[i].date <= endMs) {
			lastIndex = i;
			break;
		}
	}
	// すべて窓より未来
	if (lastIndex === -1) {
		return points.slice(0, 1);
	}

	const from = Math.max(0, firstIndex - 1);
	const to = Math.min(points.length - 1, lastIndex + 1);

	return points.slice(from, to + 1);
};

/**
 * Y軸（体重）の範囲を、表示窓の中のデータから求める
 *
 * 窓の中にデータが無いときは、渡された点（空白期間を挟む前後の点）から求めて軸を保つ
 */
export const getYRange = (
	points: readonly GraphPoint[],
	{ startMs, endMs }: GraphWindow,
): [number, number] | undefined => {
	const inWindow = points.filter(
		(point) => point.date >= startMs && point.date <= endMs,
	);
	const target = inWindow.length > 0 ? inWindow : points;

	const weights = target.flatMap((point) =>
		point.trendWeight === null
			? [point.actualWeight]
			: [point.actualWeight, point.trendWeight],
	);
	if (weights.length === 0) {
		return undefined;
	}

	const min = Math.min(...weights);
	const max = Math.max(...weights);
	// 変化が小さいときに線が中央に張り付かないよう、最低 0.5kg の余白をとる
	const padding = Math.max((max - min) * 0.1, 0.5);

	return [min - padding, max + padding];
};

/** 表示中の期間のラベル */
export const formatWindowLabel = ({ startMs, endMs }: GraphWindow): string =>
	`${format(startMs, "yyyy/M/d")} 〜 ${format(endMs, "yyyy/M/d")}`;

/** 最新（今日）を表示しているか */
export const isShowingLatest = (endMs: number, nowMs: number): boolean =>
	nowMs - endMs <= DAY_MS;

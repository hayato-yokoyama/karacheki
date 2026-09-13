import {
	addMonths,
	format,
	startOfDay,
	startOfMonth,
	subMonths,
} from "date-fns";

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
 * データの範囲が表示幅より短いときは、常に今日を終端にする。
 *
 * なお addMonths と subMonths は月末で往復しない（1/31 に1ヶ月足して1ヶ月引くと 1/28）ため、
 * 最古データが月末のときは左端が最大3日ぶん手前で止まる。
 * 常にデータより過去側にはみ出す向きなので、最古データが隠れることはない
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

/**
 * 初回に表示する終端時刻
 *
 * 最新の測定が既定の表示幅より古いときは、その測定が右端に来る位置から始める。
 * 今日を右端にすると、しばらく記録していないユーザーには何も描かれないグラフが出てしまうため
 */
export const getInitialEndMs = ({
	newestMs,
	nowMs,
	months,
}: {
	newestMs: number | undefined;
	nowMs: number;
	months: number;
}): number => {
	if (newestMs === undefined) {
		return nowMs;
	}

	const { startMs } = getWindow(nowMs, months);

	return newestMs >= startMs ? nowMs : newestMs;
};

/**
 * X軸の目盛りを表示窓から作る
 *
 * victory-native に任せると「キリのよいミリ秒」に目盛りが置かれ、
 * 日付としては半端な位置（3/20 09:46 など）になるため自前で作る。
 * 両端を避けた内側に等間隔で置き、日または月の頭に丸める
 */
export const getXTickValues = (
	{ startMs, endMs }: GraphWindow,
	{ count, snapToMonth }: { count: number; snapToMonth: boolean },
): number[] => {
	const tickValues: number[] = [];

	for (let i = 1; i <= count; i++) {
		const at = startMs + ((endMs - startMs) * i) / (count + 1);
		const snapped = snapToMonth
			? startOfMonth(at).getTime()
			: startOfDay(at).getTime();

		// 丸めた結果が窓の外に出たり、隣と重なったりしたら捨てる
		if (snapped > startMs && snapped < endMs && !tickValues.includes(snapped)) {
			tickValues.push(snapped);
		}
	}

	return tickValues;
};

/** 表示中の期間のラベル */
export const formatWindowLabel = ({ startMs, endMs }: GraphWindow): string =>
	`${format(startMs, "yyyy/M/d")} 〜 ${format(endMs, "yyyy/M/d")}`;

/** 最新（今日）を表示しているか */
export const isShowingLatest = (endMs: number, nowMs: number): boolean =>
	nowMs - endMs <= DAY_MS;

/** X座標の写像に使うプロット領域の左右端(px) */
export type PlotXBounds = {
	left: number;
	right: number;
};

/**
 * 指定時刻に最も近いデータを返す
 *
 * 点が描かれないスケール（3ヶ月以上）でもタップで選べるよう、
 * 当たり判定はY方向を見ず、X方向の最近傍だけで決める
 */
export const findNearestPoint = (
	points: readonly GraphPoint[],
	targetMs: number,
): GraphPoint | null => {
	let nearest: GraphPoint | null = null;
	let nearestDistance = Number.POSITIVE_INFINITY;

	for (const point of points) {
		const distance = Math.abs(point.date - targetMs);
		// 同距離なら先に見つけた（＝より過去の）点を残す
		if (distance < nearestDistance) {
			nearest = point;
			nearestDistance = distance;
		}
	}

	return nearest;
};

/** 日時をプロット領域内のX座標(px)へ写像する */
export const msToX = ({
	ms,
	window,
	bounds,
}: {
	ms: number;
	window: GraphWindow;
	bounds: PlotXBounds;
}): number => {
	const durationMs = window.endMs - window.startMs;
	// 窓が潰れているときは左端に寄せる
	if (durationMs <= 0) {
		return bounds.left;
	}

	const ratio = (ms - window.startMs) / durationMs;

	return bounds.left + ratio * (bounds.right - bounds.left);
};

/** プロット領域内のX座標(px)を日時へ写像する */
export const xToMs = ({
	x,
	window,
	bounds,
}: {
	x: number;
	window: GraphWindow;
	bounds: PlotXBounds;
}): number => {
	const width = bounds.right - bounds.left;
	// レイアウト確定前は幅が 0 になるため、その場合は窓の左端を返す
	if (width <= 0) {
		return window.startMs;
	}

	const ratio = (x - bounds.left) / width;

	return window.startMs + ratio * (window.endMs - window.startMs);
};

/**
 * 選択中の値を表示するカードの左端(px)を求める
 *
 * 選択位置を中心に置きつつ、プロット領域からはみ出さないように寄せる。
 * カードのほうが広いときは左端に合わせる（右へはみ出させない）
 */
export const clampCardLeft = ({
	centerX,
	cardWidth,
	bounds,
	padding = 0,
}: {
	centerX: number;
	cardWidth: number;
	bounds: PlotXBounds;
	padding?: number;
}): number => {
	const minLeft = bounds.left + padding;
	const maxLeft = bounds.right - padding - cardWidth;

	if (maxLeft <= minLeft) {
		return minLeft;
	}

	return Math.min(Math.max(centerX - cardWidth / 2, minLeft), maxLeft);
};

/** 表示窓の中での傾向データの増減 */
export type TrendSummary = {
	/** 窓の中で最初に傾向が出た日の値 */
	startWeight: number;
	/** 窓の中で最後に傾向が出た日の値 */
	endWeight: number;
	/** 期間の増減(kg)。減っていればマイナス */
	diffWeight: number;
};

/**
 * 表示窓の中の増減を、傾向データの両端から求める
 *
 * 実測値ではなく傾向データを使うのは、日々の水分変動を増減として拾わないため。
 * グラフに描いている傾向線の両端そのものなので、線の上下と数字が食い違わない。
 *
 * 傾向データは移動平均のため記録開始からしばらくは求まらず、
 * 窓の中に2点そろわないときは増減を出せない
 */
export const getTrendSummary = (
	points: readonly GraphPoint[],
	{ startMs, endMs }: GraphWindow,
): TrendSummary | null => {
	const trendWeights = points
		.filter((point) => point.date >= startMs && point.date <= endMs)
		.map((point) => point.trendWeight)
		.filter((weight): weight is number => weight !== null);

	if (trendWeights.length < 2) {
		return null;
	}

	const startWeight = trendWeights[0];
	const endWeight = trendWeights[trendWeights.length - 1];

	return {
		startWeight,
		endWeight,
		diffWeight: endWeight - startWeight,
	};
};

/**
 * スパークライン（ホームのヒーローに描く小さい折れ線）の座標を求める
 *
 * 描画そのものは `components/weeklySparkline.tsx` に任せて、
 * ここは値の並びから SVG のパスに落とすところだけを持つ
 */

/** SVG の座標 */
export type SparklinePoint = {
	x: number;
	y: number;
};

/** スパークラインを描くのに必要なもの */
export type Sparkline = {
	/** 折れ線のパス。点が 1 つのときは線を引かないので空文字 */
	linePath: string;
	/** 折れ線の下を塗るパス。点が 1 つのときは空文字 */
	areaPath: string;
	/** 最新の点。丸を重ねる位置 */
	lastPoint: SparklinePoint;
};

export type SparklineSize = {
	width: number;
	height: number;
	/**
	 * 上下左右に空ける余白
	 *
	 * 最新の点に重ねる丸と線の太さが端で切れないだけ空ける
	 */
	padding: number;
};

/** 座標を丸める桁。パスの文字列が無駄に長くならないようにする */
const round = (value: number) => Math.round(value * 10) / 10;

/**
 * 値の並びを座標に移す
 *
 * 値が 1 つだけのときは右端（＝最新の位置）に置く。
 * 左端に置くと、そのあと測るたびに点が右へ飛ぶように見えてしまう
 */
export const getSparklinePoints = (
	values: readonly number[],
	{ width, height, padding }: SparklineSize,
): SparklinePoint[] => {
	const innerWidth = Math.max(width - padding * 2, 0);
	const innerHeight = Math.max(height - padding * 2, 0);

	const min = Math.min(...values);
	const max = Math.max(...values);
	const span = max - min;

	return values.map((value, index) => ({
		x: round(
			values.length === 1
				? padding + innerWidth
				: padding + (innerWidth * index) / (values.length - 1),
		),
		// 増減が無い期間は上下に散らしようがないので、真ん中に水平な線を引く
		y: round(
			span === 0
				? padding + innerHeight / 2
				: padding + (innerHeight * (max - value)) / span,
		),
	}));
};

/**
 * 点をなめらかにつないだパスを返す
 *
 * 制御点は隣り合う 2 点の中間の X に置く。
 * 前後の傾きから作ると、上下に振れた区間で線が値の外へ膨らんでしまう
 */
export const toSmoothPath = (points: readonly SparklinePoint[]) => {
	if (points.length < 2) {
		return "";
	}

	return points.reduce((path, point, index) => {
		if (index === 0) {
			return `M${point.x},${point.y}`;
		}

		const previous = points[index - 1];
		const controlX = round((previous.x + point.x) / 2);

		return `${path} C${controlX},${previous.y} ${controlX},${point.y} ${point.x},${point.y}`;
	}, "");
};

/** 折れ線の下を下端まで閉じたパスを返す */
const toAreaPath = (
	linePath: string,
	points: readonly SparklinePoint[],
	height: number,
) => {
	if (linePath === "") {
		return "";
	}

	const first = points[0];
	const last = points[points.length - 1];

	return `${linePath} L${last.x},${height} L${first.x},${height} Z`;
};

/**
 * 値の並びからスパークラインを組み立てる
 *
 * 値が 1 つも無ければ描くものが無いので null を返す
 */
export const buildSparkline = (
	values: readonly number[],
	size: SparklineSize,
): Sparkline | null => {
	if (values.length === 0) {
		return null;
	}

	const points = getSparklinePoints(values, size);
	const linePath = toSmoothPath(points);

	return {
		linePath,
		areaPath: toAreaPath(linePath, points, size.height),
		lastPoint: points[points.length - 1],
	};
};

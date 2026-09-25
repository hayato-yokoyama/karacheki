import type { QuantitySampleTyped } from "@kingstinct/react-native-healthkit";
import {
	isHealthDataAvailable,
	queryQuantitySamples,
	requestAuthorization,
	saveQuantitySample,
} from "@kingstinct/react-native-healthkit";
import {
	differenceInCalendarDays,
	endOfDay,
	format,
	startOfDay,
	subDays,
} from "date-fns";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import {
	type GraphPoint,
	getTrendSummary,
	getWindow,
	type TrendSummary,
} from "@/services/graphWindow";

/**
 * 体重の型識別子
 *
 * v9 以降は enum ではなく HealthKit の識別子そのままの文字列になった
 */
const BODY_MASS = "HKQuantityTypeIdentifierBodyMass" as const;

/** 体重のサンプル */
export type WeightSample = QuantitySampleTyped<typeof BODY_MASS>;

/** 端末が HealthKit に対応していることを確かめる */
const assertHealthDataAvailable = () => {
	if (!isHealthDataAvailable()) {
		throw new Error("HealthKitはこのデバイスでは利用できません。");
	}
};

/** 指定された期間内の体重データを取得する */
export const fetchWeightDataInRange = async (from: Date, to?: Date) => {
	assertHealthDataAvailable();

	// bodyMassの読み取り許可を要求する
	await requestAuthorization({ toRead: [BODY_MASS] });

	// 指定範囲の体重データを取得
	const weightData = await queryQuantitySamples(BODY_MASS, {
		filter: {
			date: {
				startDate: from,
				endDate: to ? to : new Date(),
			},
		},
		unit: "kg",
		// 0 以下は件数制限なしの意味
		limit: 0,
	});

	return weightData;
};

/** 今週と先週の体重を取得する */
export const fetchWeeklyWeights = async () => {
	assertHealthDataAvailable();

	const now = new Date();

	/** 今週分(現在~7日前)の体重 */
	const currentWeekData = await fetchWeightDataInRange(
		subDays(now, 7),
		endOfDay(now),
	);

	/** 先週分(7~14日前)の体重 */
	const prevWeekData = await fetchWeightDataInRange(
		subDays(now, 14),
		subDays(now, 7),
	);

	return {
		currentWeek: currentWeekData,
		prevWeekData: prevWeekData,
	};
};

/**
 * 記録されている全期間の体重を取得する
 *
 * HealthKit に最古の記録日を問い合わせる手段がないため、十分に過去を起点にする
 */
export const fetchAllWeights = async () => {
	assertHealthDataAvailable();

	return await fetchWeightDataInRange(new Date(0));
};

/** 体重の平均値を算出する */
export const calcWeightAvg = (weights: readonly WeightSample[]) => {
	if (weights.length === 0) {
		return null;
	}
	const weightsAvg =
		weights.reduce((sum, sample) => sum + sample.quantity, 0) / weights.length;

	return weightsAvg;
};

/**
 * 傾向データ（移動平均）の対象期間（日）
 *
 * その点の日付を含めて直近この日数ぶんの測定値を平均する
 */
const TREND_WINDOW_DAYS = 10;

/**
 * X軸:日時,Y軸:体重(kg) のグラフ用に整形する
 *
 * 傾向データは「直近 windowDays 日」の平均で求める。
 * 件数で区切ると、測定が飛んでいる時期ほど平均の対象期間が長くなり、
 * 測定頻度によって傾向線の意味が変わってしまうため
 */
export const transformWeightDataForGraph = (
	weights: readonly WeightSample[],
	windowDays = TREND_WINDOW_DAYS,
): GraphPoint[] => {
	// 日付ごとに最初の測定値だけを残す
	const uniqueDailyWeights = Object.values(
		weights.reduce(
			(acc, sample) => {
				const dateKey = sample.startDate.toISOString().split("T")[0];
				if (!acc[dateKey]) {
					acc[dateKey] = sample;
				}
				return acc;
			},
			{} as Record<string, WeightSample>,
		),
	);

	// 日付順にソート
	const sortedWeights = uniqueDailyWeights.sort(
		(a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
	);

	// 日付順に並んでいるので、窓から外れた先頭を進めるだけで各点の窓が求まる
	let windowStart = 0;

	return sortedWeights.map((sample, index) => {
		// 窓の左端を「その点の windowDays 日前」まで進める
		while (
			differenceInCalendarDays(
				sample.startDate,
				sortedWeights[windowStart].startDate,
			) >= windowDays
		) {
			windowStart += 1;
		}

		// 期間の先頭など windowDays 日ぶん揃っていない区間も、揃っている測定値だけで平均する
		const window = sortedWeights.slice(windowStart, index + 1);
		const average =
			window.reduce((sum, target) => sum + target.quantity, 0) / window.length;

		return {
			date: sample.startDate.getTime(),
			actualWeight: sample.quantity,
			trendWeight: average,
		};
	});
};

/** 体重データの書き込みをする */
export const saveWeight = async (weight: number, date: Date) => {
	assertHealthDataAvailable();

	// bodyMassの書き込み許可を要求する
	await requestAuthorization({
		toShare: [BODY_MASS],
		toRead: [BODY_MASS],
	});

	// 体重データを書き込む。瞬間値なので開始と終了は同じ時刻にする
	await saveQuantitySample(BODY_MASS, "kg", weight, date, date);
};

/** 画面フォーカス時やフォアグラウンド復帰時に体重を再取得する */
export const useWeightRefetchOnActive = (refetch: () => void) => {
	// 体重入力されてホーム画面に戻ってきたときに入力値を即時で反映する
	useFocusEffect(
		useCallback(() => {
			refetch();
		}, [refetch]),
	);

	// フォアグラウンド復帰時に体重を再取得する
	useEffect(() => {
		const handleAppStateChange = (nextAppState: AppStateStatus) => {
			if (nextAppState === "active") {
				refetch();
			}
		};
		const subscription = AppState.addEventListener(
			"change",
			handleAppStateChange,
		);
		return () => {
			subscription.remove();
		};
	}, [refetch]);
};

/**
 * 最後に測った体重を返す
 *
 * HealthKit は測定日時の順で返すとは限らないため、日時で選び直す
 */
export const getLatestWeight = (weights: readonly WeightSample[]) =>
	weights.reduce<WeightSample | null>(
		(latest, sample) =>
			latest === null || sample.startDate > latest.startDate ? sample : latest,
		null,
	)?.quantity ?? null;

/** ホームのスパークラインに並べる週の数 */
export const WEEKLY_AVERAGE_WEEKS = 8;

/** ホームの「3ヶ月の傾向」で見る期間（月） */
export const TREND_MONTHS = 3;

/** 1 週間（7 日）の期間 */
export type WeekRange = {
	/** 週の始まり（その日の 0:00） */
	startMs: number;
	/** 週の終わり（その日の 23:59:59.999） */
	endMs: number;
};

/** 1 週間ぶんの平均 */
export type WeeklyAverage = WeekRange & {
	/** その週の平均。1 件も測っていなければ null */
	average: number | null;
};

/**
 * 「今週」から数えて weeksAgo 週前の 7 日間を返す
 *
 * 週はカレンダーの週ではなく「今日を最終日とする 7 日間」で区切る。
 * 日付の境目で切ることで、ヒーローに出す期間（9/15 – 9/21）と
 * 平均の対象がそのまま一致する
 */
export const getWeekRange = (weeksAgo: number, now: Date): WeekRange => {
	const end = endOfDay(subDays(now, weeksAgo * 7));

	return {
		startMs: startOfDay(subDays(end, 6)).getTime(),
		endMs: end.getTime(),
	};
};

/** 週の期間の表示（`9/15 – 9/21`） */
export const formatWeekRangeLabel = ({ startMs, endMs }: WeekRange) =>
	`${format(startMs, "M/d")} – ${format(endMs, "M/d")}`;

/**
 * 直近 weeks 週ぶんの週平均を古い順に返す
 *
 * 測定がない週は average を null にして週自体は残す。
 * 間引くと横軸の間隔が詰まり、測っていない期間がスパークラインから消えてしまう
 */
export const getWeeklyAverages = (
	weights: readonly WeightSample[],
	now: Date,
	weeks = WEEKLY_AVERAGE_WEEKS,
): WeeklyAverage[] =>
	Array.from({ length: weeks }, (_, index) => {
		// 配列の末尾を今週にするため、古い週から順に作る
		const range = getWeekRange(weeks - 1 - index, now);
		const samples = weights.filter(
			(sample) =>
				sample.startDate.getTime() >= range.startMs &&
				sample.startDate.getTime() <= range.endMs,
		);

		return { ...range, average: calcWeightAvg(samples) };
	});

/** ホームに出す集計 */
export type HomeWeightSummary = {
	/** 直近 WEEKLY_AVERAGE_WEEKS 週の週平均。古い順 */
	weeklyAverages: WeeklyAverage[];
	/** 今週 */
	currentWeek: WeeklyAverage;
	/** 先週 */
	prevWeek: WeeklyAverage;
	/** 先週比。どちらかの週に測定がなければ null */
	weekOverWeekDiff: number | null;
	/** 3ヶ月の傾向。傾向データが 2 点そろわなければ null */
	trend: TrendSummary | null;
};

/**
 * ホームに出す値をまとめて求める
 *
 * 全期間の測定値から画面が必要とするものだけを取り出す。
 * 期間ごとに HealthKit へ問い合わせ直さないので、
 * ヒーローと統計カードとスパークラインが必ず同じデータを見る
 */
export const summarizeWeightsForHome = (
	weights: readonly WeightSample[],
	now: Date = new Date(),
): HomeWeightSummary => {
	const weeklyAverages = getWeeklyAverages(weights, now);

	// 週の数は 2 以上の定数なので、今週と先週は必ず取れる
	const currentWeek = weeklyAverages[weeklyAverages.length - 1];
	const prevWeek = weeklyAverages[weeklyAverages.length - 2];

	return {
		weeklyAverages,
		currentWeek,
		prevWeek,
		weekOverWeekDiff:
			currentWeek.average !== null && prevWeek.average !== null
				? currentWeek.average - prevWeek.average
				: null,
		// グラフと同じ傾向データ（移動平均）の両端で増減を見る。指標を画面ごとに変えない
		trend: getTrendSummary(
			transformWeightDataForGraph(weights),
			getWindow(now.getTime(), TREND_MONTHS),
		),
	};
};

/**
 * 写真の撮影日に記録がないとき、代わりに使う記録を探す範囲（日）（#50）
 *
 * これより離れた日の体重は「その体型のときの体重」とは言いにくいので出さない
 */
export const PHOTO_WEIGHT_MAX_OFFSET_DAYS = 3;

/** 写真の撮影日に対応する体重（#50） */
export type PhotoWeight = {
	weight: number;
	/**
	 * 撮影日から見た測定日のずれ（日）
	 *
	 * 撮影日当日の記録なら 0、前の日の記録なら負、後の日の記録なら正
	 */
	offsetDays: number;
};

/**
 * 写真の撮影日の体重を探す（#50）
 *
 * 撮影日に記録があればその日の最初の1件（グラフと同じ考え方）を使う。
 * 無ければ前後 maxOffsetDays 日以内でいちばん近い日の記録を使い、
 * 前後で同じ距離なら前の日を優先する。どちらでも結果が1つに決まればよく、
 * 前を選ぶのは「撮るまでの体重」の方が写真の体型に近いと考えるため。
 * 日付の境目は端末のタイムゾーンのカレンダー日で数える
 */
export const findPhotoWeight = (
	weights: readonly WeightSample[],
	takenAt: Date,
	maxOffsetDays = PHOTO_WEIGHT_MAX_OFFSET_DAYS,
): PhotoWeight | null => {
	let found: { sample: WeightSample; offsetDays: number } | null = null;

	for (const sample of weights) {
		const offsetDays = differenceInCalendarDays(sample.startDate, takenAt);

		if (Math.abs(offsetDays) > maxOffsetDays) {
			continue;
		}

		// 近い日 → 前の日 → その日の早い時刻 の順に優先する。
		// HealthKit は測定日時の順で返すとは限らないため、並び順には頼らない
		const isBetter =
			found === null ||
			Math.abs(offsetDays) < Math.abs(found.offsetDays) ||
			(Math.abs(offsetDays) === Math.abs(found.offsetDays) &&
				(offsetDays < found.offsetDays ||
					(offsetDays === found.offsetDays &&
						sample.startDate < found.sample.startDate)));

		if (isBetter) {
			found = { sample, offsetDays };
		}
	}

	return found === null
		? null
		: { weight: found.sample.quantity, offsetDays: found.offsetDays };
};

/**
 * 撮影日と測定日のずれを表示用の文言にする（#50）
 *
 * 当日の記録ならずれは無いので null を返し、呼び出し側はピルを出さない
 */
export const formatPhotoWeightOffset = (offsetDays: number) => {
	if (offsetDays === 0) {
		return null;
	}

	return offsetDays < 0 ? `${-offsetDays}日前` : `${offsetDays}日後`;
};

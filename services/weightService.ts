import type { QuantitySampleTyped } from "@kingstinct/react-native-healthkit";
import {
	isHealthDataAvailable,
	queryQuantitySamples,
	requestAuthorization,
	saveQuantitySample,
} from "@kingstinct/react-native-healthkit";
import { differenceInCalendarDays, endOfDay, subDays } from "date-fns";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";
import type { GraphPoint } from "@/services/graphWindow";

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
const TREND_WINDOW_DAYS = 7;

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

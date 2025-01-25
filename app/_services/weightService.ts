import HealthKit, {
	HKAuthorizationStatus,
	HKQuantityTypeIdentifier,
} from "@kingstinct/react-native-healthkit";
import type {
	HKQuantitySample,
	HKUnit,
} from "@kingstinct/react-native-healthkit";
import { endOfDay, startOfDay, subDays, subMonths } from "date-fns";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect } from "react";
import { AppState, type AppStateStatus } from "react-native";

/** 指定された期間内の体重データを取得する */
export const fetchWeightDataInRange = async (from: Date, to?: Date) => {
	const isAvailable = await HealthKit.isHealthDataAvailable();

	if (!isAvailable) {
		throw new Error("HealthKitはこのデバイスでは利用できません。");
	}

	// bodyMassの読み取り許可を要求する
	await HealthKit.requestAuthorization([HKQuantityTypeIdentifier.bodyMass]);

	// 指定範囲の体重データを取得
	const weightData = await HealthKit.queryQuantitySamples(
		HKQuantityTypeIdentifier.bodyMass,
		{
			from: from,
			to: to ? to : new Date(),
			unit: "kg",
		},
	);

	return weightData;
};

/** 今週と先週の体重を取得する */
export const fetchWeeklyWeights = async () => {
	const isAvailable = await HealthKit.isHealthDataAvailable();

	if (!isAvailable) {
		throw new Error("HealthKitはこのデバイスでは利用できません。");
	}

	// bodyMassの読み取り許可を要求する
	await HealthKit.requestAuthorization([HKQuantityTypeIdentifier.bodyMass]);

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

/** 直近の引数月の体重を取得する */
export const fetchRecentWeightsByMonths = async (month: number) => {
	const isAvailable = await HealthKit.isHealthDataAvailable();

	if (!isAvailable) {
		throw new Error("HealthKitはこのデバイスでは利用できません。");
	}

	// bodyMassの読み取り許可を要求する
	await HealthKit.requestAuthorization([HKQuantityTypeIdentifier.bodyMass]);

	const now = new Date();

	/** 直近の引数月の体重 */
	const recentWeight = await fetchWeightDataInRange(
		startOfDay(subMonths(now, month)),
	);

	return recentWeight;
};

/** 体重の平均値を算出する */
export const calcWeightAvg = (
	weights: readonly HKQuantitySample<
		HKQuantityTypeIdentifier.bodyMass,
		HKUnit
	>[],
) => {
	if (weights.length === 0) {
		return null;
	}
	const weightsAvg =
		weights.reduce((sum, sample) => sum + sample.quantity, 0) / weights.length;

	return weightsAvg;
};

/** X軸:日時,Y軸:体重(kg) のグラフ用に整形する */
export const transformWeightDataForGraph = (
	weights: readonly HKQuantitySample<
		HKQuantityTypeIdentifier.bodyMass,
		HKUnit
	>[],
	windowSize = 7, // 移動平均のウィンドウサイズ
) => {
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
			{} as Record<
				string,
				HKQuantitySample<HKQuantityTypeIdentifier.bodyMass, HKUnit>
			>,
		),
	);

	// 日付順にソート
	const sortedWeights = uniqueDailyWeights.sort(
		(a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
	);

	// 実測データを整形
	const transformedActualData = sortedWeights.map((sample) => ({
		date: sample.startDate.toISOString(),
		weight: sample.quantity,
	}));

	// 移動平均データを計算
	const movingAverages = sortedWeights
		.map((_, index, array) => {
			if (index < windowSize - 1) return null; // ウィンドウサイズ未満はスキップ
			const window = array.slice(index - windowSize + 1, index + 1);
			const average =
				window.reduce((sum, sample) => sum + sample.quantity, 0) /
				window.length;

			return {
				date: array[index].startDate.toISOString(),
				movingAverage: average,
			};
		})
		.filter((data) => data !== null);

	return transformedActualData.map((data) => {
		const movingAverage = movingAverages.find((avg) => avg.date === data.date);
		return {
			date: data.date,
			actualWeight: data.weight,
			trendWeight: movingAverage?.movingAverage || null,
		};
	});
};

/** 体重データの書き込みをする */
export const saveWeight = async (weight: number, date: Date) => {
	// bodyMassの書き込み許可を要求する
	await HealthKit.requestAuthorization(
		[HKQuantityTypeIdentifier.bodyMass],
		[HKQuantityTypeIdentifier.bodyMass],
	);

	// 体重データを書き込む
	await HealthKit.saveQuantitySample(
		HKQuantityTypeIdentifier.bodyMass,
		"kg",
		weight,
		{
			start: date,
		},
	);
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

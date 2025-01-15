import HealthKit, {
	HKQuantityTypeIdentifier,
} from "@kingstinct/react-native-healthkit";
import type {
	HKQuantitySample,
	HKUnit,
} from "@kingstinct/react-native-healthkit";
import { endOfDay, startOfDay, subDays, subMonths } from "date-fns";

/** 指定された期間内の体重データを取得する */
export const fetchWeightDataInRange = async (from: Date, to?: Date) => {
	try {
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
	} catch (error) {
		console.error(error);
		throw new Error("指定範囲のHealthKitデータ取得中にエラーが発生しました。");
	}
};

/** 今週と先週の体重を取得する */
export const fetchWeeklyWeights = async () => {
	try {
		const isAvailable = await HealthKit.isHealthDataAvailable();

		if (!isAvailable) {
			throw new Error("HealthKitはこのデバイスでは利用できません。");
		}

		// bodyMassの読み取り許可を要求する
		await HealthKit.requestAuthorization([HKQuantityTypeIdentifier.bodyMass]);

		const now = new Date();

		/** 今週分(1~7日前)の体重 */
		const currentWeekData = await fetchWeightDataInRange(
			startOfDay(subDays(now, 7)),
			endOfDay(subDays(now, 1)),
		);

		/** 先週分(8~14日前)の体重 */
		const prevWeekData = await fetchWeightDataInRange(
			startOfDay(subDays(now, 14)),
			endOfDay(subDays(now, 8)),
		);

		return {
			currentWeek: currentWeekData,
			prevWeekData: prevWeekData,
		};
	} catch (error) {
		console.error(error);
		throw new Error("HealthKitデータの取得にエラーが発生しました");
	}
};

/** 直近の引数月の体重を取得する */
export const fetchRecentWeightsByMonths = async (month: number) => {
	try {
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
	} catch (error) {
		console.error(error);
		throw new Error("HealthKitデータの取得にエラーが発生しました");
	}
};

/** 体重の平均値を算出する */
export const calcWeightAvg = (
	weights: readonly HKQuantitySample<
		HKQuantityTypeIdentifier.bodyMass,
		HKUnit
	>[],
) => {
	if (weights.length === 0) {
		return 0;
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

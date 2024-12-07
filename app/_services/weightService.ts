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

/** X軸:Date,Y軸:体重(kg) のグラフ用に整形する */
export const transformWeightDataForGraph = (
	weights: readonly HKQuantitySample<
		HKQuantityTypeIdentifier.bodyMass,
		HKUnit
	>[],
) => {
	// データをグラフ用に整形
	return weights.map((sample) => ({
		date: new Date(sample.startDate), // 開始日時をDate型に変換
		weight: sample.quantity, // 体重値 (kg)
	}));
};

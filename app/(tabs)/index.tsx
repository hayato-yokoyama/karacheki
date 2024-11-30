import { Button, H2, H3, YStack } from "tamagui";
import HealthKit, {
	HKQuantityTypeIdentifier,
} from "@kingstinct/react-native-healthkit";
import type {
	HKQuantitySample,
	HKUnit,
} from "@kingstinct/react-native-healthkit";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { WeightTabContent } from "../_components/weightTabContent";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";

// アプリ起動中の通知の動作設定（アラート表示、通知音、バッジ表示）
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});

export default function Index() {
	// 毎朝の通知が有効かどうか
	const [isEnabledDailyNotification, setIsEnabledDailyNotification] =
		useState(false);

	// 通知のON/OFF状態に応じてスケジュール/キャンセルを実行
	useEffect(() => {
		if (isEnabledDailyNotification) {
			scheduleDailyWeightNotification();
		} else {
			Notifications.cancelAllScheduledNotificationsAsync();
		}
	}, [isEnabledDailyNotification]);

	// 体重の取得
	const { data, isLoading, error } = useQuery({
		queryKey: ["weights"],
		queryFn: fetchWeights,
	});

	if (isLoading) {
		return (
			<YStack padding="$8">
				<H3>Loading...</H3>
			</YStack>
		);
	}

	if (error || data === undefined) {
		return (
			<YStack padding="$8">
				<H3>ヘルスケアデータを取得できませんでした</H3>
			</YStack>
		);
	}

	const { currentWeek: currentWeekWeights, prevWeekData: prevWeekWeights } =
		data;

	const currentWeekWeightsAvg = calcWeightAvg(currentWeekWeights);
	const prevWeekWeightsAvg = calcWeightAvg(prevWeekWeights);

	return (
		<>
			<Stack.Screen options={{ title: "ホーム" }} />
			<YStack padding="$8" gap="$8">
				<H2 size="$8">体重の変化</H2>
				<WeightTabContent
					period="Week"
					currentAve={currentWeekWeightsAvg}
					prevAve={prevWeekWeightsAvg}
				/>
				{/* 通知設定 */}
				<Button onPress={() => setIsEnabledDailyNotification((prev) => !prev)}>
					通知を{isEnabledDailyNotification ? "OFF" : "ON"}にする
				</Button>
			</YStack>
		</>
	);
}

/** 毎朝8時の通知スケジュールを組む */
async function scheduleDailyWeightNotification() {
	// 通知権限をリクエスト
	const { status } = await Notifications.requestPermissionsAsync();
	if (status !== "granted") {
		console.warn("通知の権限がありません");
		return;
	}

	// 今週と先週の体重データを取得
	const { currentWeek: currentWeekWeights, prevWeekData: prevWeekWeights } =
		await fetchWeights();
	if (!currentWeekWeights || !prevWeekWeights) {
		console.error("体重データの取得に失敗しました");
		return;
	}
	const currentWeekWeightsAvg = calcWeightAvg(currentWeekWeights);
	const prevWeekWeightsAvg = calcWeightAvg(prevWeekWeights);
	const avgDiff = currentWeekWeightsAvg - prevWeekWeightsAvg;

	const pushBodyText = `${currentWeekWeightsAvg.toFixed(2)}kg (${avgDiff >= 0 ? "+" : ""}${avgDiff.toFixed(2)}kg)`;

	// 既存の通知スケジュールを削除
	await Notifications.cancelAllScheduledNotificationsAsync();

	// 通知スケジュールを登録
	await Notifications.scheduleNotificationAsync({
		content: {
			title: "今週の体重",
			body: pushBodyText,
			sound: true,
		},
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.DAILY,
			hour: 8,
			minute: 0,
		},
	});
}

/** 今週と先週の体重を取得する */
const fetchWeights = async () => {
	try {
		const isAvailable = await HealthKit.isHealthDataAvailable();

		if (!isAvailable) {
			throw new Error("HealthKitはこのデバイスでは利用できません。");
		}

		// bodyMassの読み取り許可を要求する
		await HealthKit.requestAuthorization([HKQuantityTypeIdentifier.bodyMass]);

		const now = new Date();

		/** 今週分(1~7日前)の体重 */
		const currentWeekData = await HealthKit.queryQuantitySamples(
			HKQuantityTypeIdentifier.bodyMass,
			{
				from: subDays(now, 7),
				to: subDays(now, 1),
				unit: "kg",
			},
		);

		/** 先週分(8~14日前)の体重 */
		const prevWeekData = await HealthKit.queryQuantitySamples(
			HKQuantityTypeIdentifier.bodyMass,
			{
				from: subDays(now, 14),
				to: subDays(now, 8),
				unit: "kg",
			},
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

/** 体重の平均値を算出する */
const calcWeightAvg = (
	weights: readonly HKQuantitySample<
		HKQuantityTypeIdentifier.bodyMass,
		HKUnit
	>[],
) => {
	const weightsAvg =
		weights.reduce((sum, sample) => sum + sample.quantity, 0) / weights.length;

	return weightsAvg;
};

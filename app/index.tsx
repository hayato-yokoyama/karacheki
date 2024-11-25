import { Button, H2, H3, Separator, SizableText, Tabs, YStack } from "tamagui";
import HealthKit, {
	HKQuantityTypeIdentifier,
} from "@kingstinct/react-native-healthkit";
import type {
	HKQuantitySample,
	HKUnit,
} from "@kingstinct/react-native-healthkit";
import { useQuery } from "@tanstack/react-query";
import { subDays } from "date-fns";
import { WeightTabContent } from "./_components/weightTabContent";
import * as Notifications from "expo-notifications";

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
	const AvgDiff = currentWeekWeightsAvg - prevWeekWeightsAvg;

	const trigger: Notifications.TimeIntervalTriggerInput = {
		seconds: 2,
		repeats: true,
		type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
	};

	await Notifications.scheduleNotificationAsync({
		content: {
			title: "You've got mail! 📬",
			body: `Here is the notification body ${AvgDiff}kg`,
		},
		trigger: trigger,
	});

	// // 既存の通知をクリアしてからスケジュール
	// await Notifications.cancelAllScheduledNotificationsAsync();

	// await Notifications.scheduleNotificationAsync({
	// 	content: {
	// 		title: "体重レポート",
	// 		body: `今週の平均: ${currentWeekWeightsAvg.toFixed(2)}kg\n先週の平均: ${prevWeekWeightsAvg.toFixed(2)}kg\n変化: ${AvgDiff.toFixed(2)}kg`,
	// 		sound: true,
	// 	},
	// 	trigger: {
	// 		type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
	// 		seconds: 2,
	// 		repeats: false, // 繰り返さない
	// 	},
	// });
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

export default function Index() {
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
		<YStack padding="$8" gap="$8">
			<Tabs
				defaultValue="weekly"
				orientation="horizontal"
				flexDirection="column"
				borderRadius="$4"
				borderWidth="$0.25"
				overflow="hidden"
				borderColor="$borderColor"
				gap="$4"
			>
				<Tabs.List
					separator={<Separator vertical />}
					disablePassBorderRadius="bottom"
				>
					<Tabs.Tab flex={1} value="weekly">
						<SizableText fontFamily="$body">週</SizableText>
					</Tabs.Tab>
					<Tabs.Tab flex={1} value="monthly">
						<SizableText fontFamily="$body">月</SizableText>
					</Tabs.Tab>
				</Tabs.List>
				<Tabs.Content value="weekly" gap="$4">
					<H2 size="$8">週</H2>
					{/* 通知スケジュール用のボタン */}
					<Button onPress={scheduleDailyWeightNotification}>
						スケジュール通知を設定
					</Button>
					<WeightTabContent
						period="Week"
						currentAve={currentWeekWeightsAvg}
						prevAve={prevWeekWeightsAvg}
					/>
				</Tabs.Content>
				<Tabs.Content value="monthly" gap="$4">
					<H2 size="$8">月</H2>
					{/* TODO:月データも取得する */}
					<WeightTabContent period="Month" currentAve={80} prevAve={90} />
				</Tabs.Content>
			</Tabs>
		</YStack>
	);
}

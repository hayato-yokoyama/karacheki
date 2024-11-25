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
import { Platform, Text, View } from "react-native";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { useEffect, useRef, useState } from "react";

// 通知のデフォルト動作設定（アラート表示、通知音、バッジ表示）
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});

// プッシュ通知の送信関数
async function sendPushNotification(expoPushToken: string) {
	const message = {
		to: expoPushToken,
		sound: "default",
		title: "Original Title",
		body: "And here is the body!",
		data: { someData: "goes here" },
	};

	await fetch("https://exp.host/--/api/v2/push/send", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Accept-encoding": "gzip, deflate",
			"Content-Type": "application/json",
		},
		body: JSON.stringify(message),
	});
}

function handleRegistrationError(errorMessage: string) {
	alert(errorMessage);
	throw new Error(errorMessage);
}

// プッシュ通知トークンの登録
async function registerForPushNotificationsAsync() {
	if (Platform.OS === "android") {
		Notifications.setNotificationChannelAsync("default", {
			name: "default",
			importance: Notifications.AndroidImportance.MAX,
			vibrationPattern: [0, 250, 250, 250],
			lightColor: "#FF231F7C",
		});
	}

	if (Device.isDevice) {
		const { status: existingStatus } =
			await Notifications.getPermissionsAsync();
		let finalStatus = existingStatus;
		if (existingStatus !== "granted") {
			const { status } = await Notifications.requestPermissionsAsync();
			finalStatus = status;
		}
		if (finalStatus !== "granted") {
			handleRegistrationError(
				"Permission not granted to get push token for push notification!",
			);
			return;
		}

		// projectIdの登録
		const projectId =
			Constants?.expoConfig?.extra?.eas?.projectId ??
			Constants?.easConfig?.projectId;
		if (!projectId) {
			handleRegistrationError("Project ID not found");
		}
		try {
			// プッシュトークンの登録
			const pushTokenString = (
				await Notifications.getExpoPushTokenAsync({
					projectId,
				})
			).data;
			console.log(pushTokenString);
			return pushTokenString;
		} catch (e: unknown) {
			handleRegistrationError(`${e}`);
		}
	} else {
		handleRegistrationError("Must use physical device for push notifications");
	}
}

export default function Index() {
	// const { data, isLoading, error } = useQuery({
	// 	queryKey: ["weights"],
	// 	queryFn: fetchWeights,
	// });

	// if (isLoading) {
	// 	return (
	// 		<YStack padding="$8">
	// 			<H3>Loading...</H3>
	// 		</YStack>
	// 	);
	// }

	// if (error || data === undefined) {
	// 	return (
	// 		<YStack padding="$8">
	// 			<H3>ヘルスケアデータを取得できませんでした</H3>
	// 		</YStack>
	// 	);
	// }

	// const { currentWeek: currentWeekWeights, prevWeekData: prevWeekWeights } =
	// 	data;

	// const currentWeekWeightsAvg = calcWeightAvg(currentWeekWeights);
	// const prevWeekWeightsAvg = calcWeightAvg(prevWeekWeights);

	const currentWeekWeightsAvg = 60;
	const prevWeekWeightsAvg = 70;

	const [expoPushToken, setExpoPushToken] = useState<string>("");
	const [notification, setNotification] = useState<
		Notifications.Notification | undefined
	>(undefined);
	const notificationListener =
		useRef<ReturnType<typeof Notifications.addNotificationReceivedListener>>();
	const responseListener =
		useRef<
			ReturnType<typeof Notifications.addNotificationResponseReceivedListener>
		>();

	useEffect(() => {
		registerForPushNotificationsAsync()
			.then((token) => setExpoPushToken(token ?? ""))
			.catch((error) => setExpoPushToken(`${error}`));

		notificationListener.current =
			Notifications.addNotificationReceivedListener((notification) => {
				setNotification(notification);
			});

		responseListener.current =
			Notifications.addNotificationResponseReceivedListener((response) => {
				console.log(response);
			});

		return () => {
			notificationListener.current &&
				Notifications.removeNotificationSubscription(
					notificationListener.current,
				);
			responseListener.current &&
				Notifications.removeNotificationSubscription(responseListener.current);
		};
	}, []);

	return (
		<View
			style={{ flex: 1, alignItems: "center", justifyContent: "space-around" }}
		>
			<Text>Your Expo push token: {expoPushToken}</Text>
			<View style={{ alignItems: "center", justifyContent: "center" }}>
				<Text>
					Title: {notification && notification.request.content.title}{" "}
				</Text>
				<Text>Body: {notification && notification.request.content.body}</Text>
				<Text>
					Data:{" "}
					{notification && JSON.stringify(notification.request.content.data)}
				</Text>
			</View>
			<Button
				// title="Press to Send Notification"
				onPress={async () => {
					await sendPushNotification(expoPushToken);
				}}
			/>
		</View>
		// <YStack padding="$8" gap="$8">
		// 	<Tabs
		// 		defaultValue="weekly"
		// 		orientation="horizontal"
		// 		flexDirection="column"
		// 		borderRadius="$4"
		// 		borderWidth="$0.25"
		// 		overflow="hidden"
		// 		borderColor="$borderColor"
		// 		gap="$4"
		// 	>
		// 		<Tabs.List
		// 			separator={<Separator vertical />}
		// 			disablePassBorderRadius="bottom"
		// 		>
		// 			<Tabs.Tab flex={1} value="weekly">
		// 				<SizableText fontFamily="$body">週</SizableText>
		// 			</Tabs.Tab>
		// 			<Tabs.Tab flex={1} value="monthly">
		// 				<SizableText fontFamily="$body">月</SizableText>
		// 			</Tabs.Tab>
		// 		</Tabs.List>
		// 		<Tabs.Content value="weekly" gap="$4">
		// 			<H2 size="$8">週</H2>
		// 			{/* 通知スケジュール用のボタン */}
		// 			<Button onPress={scheduleDailyWeightNotification}>
		// 				スケジュール通知を設定
		// 			</Button>
		// 			<WeightTabContent
		// 				period="Week"
		// 				currentAve={currentWeekWeightsAvg}
		// 				prevAve={prevWeekWeightsAvg}
		// 			/>
		// 		</Tabs.Content>
		// 		<Tabs.Content value="monthly" gap="$4">
		// 			<H2 size="$8">月</H2>
		// 			{/* TODO:月データも取得する */}
		// 			<WeightTabContent period="Month" currentAve={80} prevAve={90} />
		// 		</Tabs.Content>
		// 	</Tabs>
		// </YStack>
	);
}

// /** 毎朝8時の通知スケジュールを組む */
// async function scheduleDailyWeightNotification() {
// 	// 通知権限をリクエスト
// 	const { status } = await Notifications.requestPermissionsAsync();
// 	if (status !== "granted") {
// 		console.warn("通知の権限がありません");
// 		return;
// 	}

// 	// 今週と先週の体重データを取得
// 	const { currentWeek: currentWeekWeights, prevWeekData: prevWeekWeights } =
// 		await fetchWeights();
// 	if (!currentWeekWeights || !prevWeekWeights) {
// 		console.error("体重データの取得に失敗しました");
// 		return;
// 	}
// 	const currentWeekWeightsAvg = calcWeightAvg(currentWeekWeights);
// 	const prevWeekWeightsAvg = calcWeightAvg(prevWeekWeights);
// 	const AvgDiff = currentWeekWeightsAvg - prevWeekWeightsAvg;

// 	// 既存の通知をクリアしてからスケジュール
// 	await Notifications.cancelAllScheduledNotificationsAsync();

// 	await Notifications.scheduleNotificationAsync({
// 		content: {
// 			title: "体重レポート",
// 			body: `今週の平均: ${currentWeekWeightsAvg.toFixed(2)}kg\n先週の平均: ${prevWeekWeightsAvg.toFixed(2)}kg\n変化: ${AvgDiff.toFixed(2)}kg`,
// 			sound: true,
// 		},
// 		trigger: {
// 			type: Notifications.SchedulableTriggerInputTypes.CALENDAR,
// 			seconds: 2,
// 			repeats: false, // 繰り返さない
// 		},
// 	});
// }

// /** 今週と先週の体重を取得する */
// const fetchWeights = async () => {
// 	try {
// 		const isAvailable = await HealthKit.isHealthDataAvailable();

// 		if (!isAvailable) {
// 			throw new Error("HealthKitはこのデバイスでは利用できません。");
// 		}

// 		// bodyMassの読み取り許可を要求する
// 		await HealthKit.requestAuthorization([HKQuantityTypeIdentifier.bodyMass]);

// 		const now = new Date();

// 		/** 今週分(1~7日前)の体重 */
// 		const currentWeekData = await HealthKit.queryQuantitySamples(
// 			HKQuantityTypeIdentifier.bodyMass,
// 			{
// 				from: subDays(now, 7),
// 				to: subDays(now, 1),
// 				unit: "kg",
// 			},
// 		);

// 		/** 先週分(8~14日前)の体重 */
// 		const prevWeekData = await HealthKit.queryQuantitySamples(
// 			HKQuantityTypeIdentifier.bodyMass,
// 			{
// 				from: subDays(now, 14),
// 				to: subDays(now, 8),
// 				unit: "kg",
// 			},
// 		);

// 		return {
// 			currentWeek: currentWeekData,
// 			prevWeekData: prevWeekData,
// 		};
// 	} catch (error) {
// 		console.error(error);
// 		throw new Error("HealthKitデータの取得にエラーが発生しました");
// 	}
// };

// /** 体重の平均値を算出する */
// const calcWeightAvg = (
// 	weights: readonly HKQuantitySample<
// 		HKQuantityTypeIdentifier.bodyMass,
// 		HKUnit
// 	>[],
// ) => {
// 	const weightsAvg =
// 		weights.reduce((sum, sample) => sum + sample.quantity, 0) / weights.length;

// 	return weightsAvg;
// };

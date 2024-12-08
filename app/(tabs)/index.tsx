import {
	H2,
	H3,
	ScrollView,
	SizableText,
	XStack,
	YStack,
} from "tamagui";
import { useQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Stack } from "expo-router";
import { Card } from "tamagui";
import { scheduleDailyWeightNotification } from "@/app/_services/notificationService";
import {
	calcWeightAvg,
	fetchWeeklyWeights,
} from "@/app/_services/weightService";

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
		useState(true);

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
		queryFn: fetchWeeklyWeights,
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
	const avgDiff = currentWeekWeightsAvg - prevWeekWeightsAvg;

	return (
		<>
			<Stack.Screen options={{ title: "ホーム" }} />
			<ScrollView>
				<YStack paddingVertical="$8" paddingHorizontal="$4" gap="$4">
					<H2 size="$8">体重の変化</H2>
					<Card padding="$4">
						<YStack gap="$4">
							<XStack alignItems="center" justifyContent="space-around">
								<YStack>
									<SizableText>今週</SizableText>
									<XStack gap="$1" alignItems="baseline">
										<SizableText size="$9" fontWeight="bold">
											{currentWeekWeightsAvg.toFixed(2)}
										</SizableText>
										<SizableText size="$4" theme="alt1">
											kg
										</SizableText>
									</XStack>
								</YStack>
								<YStack>
									<SizableText>先週</SizableText>
									<XStack gap="$1" alignItems="baseline">
										<SizableText size="$9" fontWeight="bold">
											{prevWeekWeightsAvg.toFixed(2)}
										</SizableText>
										<SizableText size="$4" theme="alt1">
											kg
										</SizableText>
									</XStack>
								</YStack>
							</XStack>
							<YStack marginHorizontal="auto">
								<SizableText>変化幅</SizableText>
								<XStack gap="$1" alignItems="baseline">
									<SizableText size="$9" fontWeight="bold">
										{avgDiff > 0 ? "+" : avgDiff < 0 ? "-" : "±"}
										{avgDiff.toFixed(2)}
									</SizableText>
									<SizableText size="$4" theme="alt1">
										kg
									</SizableText>
								</XStack>
							</YStack>
						</YStack>
					</Card>

					{/* <Card padding="$4">
						<YStack gap="$2">
							<XStack alignItems="center" gap="$4" margin="auto">
								<Label
									paddingRight="$0"
									justifyContent="flex-end"
									size="$4"
									htmlFor="notificationSwitch"
								>
									通知する
								</Label>
								<Switch
									id="notificationSwitch"
									size="$3"
									defaultChecked={true}
									onCheckedChange={(isChecked) =>
										setIsEnabledDailyNotification(isChecked)
									}
								>
									<Switch.Thumb animation="quicker" />
								</Switch>
							</XStack>
							<Paragraph>
								設定を ON にすると
								<SizableText color="$blue10">毎朝8時</SizableText>
								に今週の体重を通知します。
							</Paragraph>
						</YStack>
					</Card> */}
				</YStack>
			</ScrollView>
		</>
	);
}

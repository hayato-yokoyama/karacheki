import {
	Button,
	H2,
	Paragraph,
	ScrollView,
	SizableText,
	Spinner,
	useTheme,
	XStack,
	YStack,
} from "tamagui";
import { useQuery } from "@tanstack/react-query";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import { Link, Stack } from "expo-router";
import { Card } from "tamagui";
import { scheduleDailyWeightNotification } from "@/app/_services/notificationService";
import {
	calcWeightAvg,
	fetchWeeklyWeights,
	useWeightRefetchOnActive,
} from "@/app/_services/weightService";
import { Bell, Plus } from "@tamagui/lucide-icons";
import * as Linking from "expo-linking";
import type { AppStateStatus } from "react-native";
import { AppState } from "react-native";
import { ErrorHealthData } from "@/app/_components/errorHealthData";

// アプリ起動中の通知の動作設定（アラート表示、通知音、バッジ表示）
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowAlert: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});

export default function Index() {
	const theme = useTheme();
	// 通知設定する
	scheduleDailyWeightNotification();

	// 体重の取得
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["weights"],
		queryFn: fetchWeeklyWeights,
	});

	// 画面フォーカス時やフォアグラウンド復帰時に体重を再取得する
	useWeightRefetchOnActive(refetch);

	if (isLoading) {
		return (
			<YStack
				padding="$8"
				height={400}
				alignItems="center"
				justifyContent="center"
			>
				<Spinner size="small" />
			</YStack>
		);
	}

	// 体重取得失敗表示
	if (
		error ||
		data === undefined ||
		(data.currentWeek.length === 0 && data.prevWeekData.length === 0)
	) {
		return (
			<>
				<Stack.Screen
					options={{
						title: "ホーム",
						headerStyle: { backgroundColor: theme.background0.val },
					}}
				/>
				<ErrorHealthData />
			</>
		);
	}

	const { currentWeek: currentWeekWeights, prevWeekData: prevWeekWeights } =
		data;

	const currentWeekWeightsAvg = calcWeightAvg(currentWeekWeights);
	const prevWeekWeightsAvg = calcWeightAvg(prevWeekWeights);
	const avgDiff =
		currentWeekWeightsAvg && prevWeekWeightsAvg
			? currentWeekWeightsAvg - prevWeekWeightsAvg
			: null;

	return (
		<>
			<Stack.Screen
				options={{
					title: "ホーム",
					headerStyle: { backgroundColor: theme.background0.val },
				}}
			/>
			<ScrollView>
				<YStack paddingVertical="$8" paddingHorizontal="$4" gap="$4">
					<XStack alignItems="center" justifyContent="space-between">
						<H2 size="$7">体重の変化</H2>
						<Link href="/(tabs)/home/add" asChild>
							<Button icon={<Plus />}>体重の入力</Button>
						</Link>
					</XStack>
					<Card padding="$4">
						<YStack gap="$4">
							<XStack alignItems="center" justifyContent="space-around">
								<YStack>
									<SizableText>先週</SizableText>
									<XStack gap="$1" alignItems="baseline">
										<SizableText size="$9" fontWeight="bold">
											{prevWeekWeightsAvg
												? prevWeekWeightsAvg.toFixed(2)
												: "---"}
										</SizableText>
										<SizableText>kg</SizableText>
									</XStack>
								</YStack>
								<YStack>
									<SizableText>今週</SizableText>
									<XStack gap="$1" alignItems="baseline">
										<SizableText size="$9" fontWeight="bold">
											{currentWeekWeightsAvg
												? currentWeekWeightsAvg.toFixed(2)
												: "---"}
										</SizableText>
										<SizableText>kg</SizableText>
									</XStack>
								</YStack>
							</XStack>
							<YStack marginHorizontal="auto">
								<SizableText>変化幅</SizableText>
								<XStack gap="$1" alignItems="baseline">
									{avgDiff !== null ? (
										<SizableText size="$9" fontWeight="bold">
											{avgDiff > 0 && "+"}
											{avgDiff === 0 && "±"}
											{avgDiff.toFixed(2)}
										</SizableText>
									) : (
										<SizableText size="$9" fontWeight="bold">
											---
										</SizableText>
									)}
									<SizableText>kg</SizableText>
								</XStack>
							</YStack>
						</YStack>
					</Card>

					<NotificationSettingsCard />
				</YStack>
			</ScrollView>
		</>
	);
}

/** 通知設定誘導ボタン */
const NotificationSettingsCard = () => {
	// 通知許可設定の状態管理
	const [isEnabledNotifications, setIsEnabledNotifications] = useState(false);

	// 初回描画時とフォアグラウンド時に通知許可を確認
	useEffect(() => {
		/** 通知設定の許可状態を取得する */
		const checkNotificationPermissions = async () => {
			const { status } = await Notifications.getPermissionsAsync();
			setIsEnabledNotifications(status === "granted");
		};

		checkNotificationPermissions();

		const handleChangeAppState = (nextAppState: AppStateStatus) => {
			if (nextAppState === "active") {
				checkNotificationPermissions();
			}
		};
		const subscription = AppState.addEventListener(
			"change",
			handleChangeAppState,
		);
		return () => {
			subscription.remove();
		};
	}, []);

	// 通知設定ページを開く
	const openNotificationSettings = () => {
		Linking.openSettings();
	};

	// 通知が許可されている場合はボタンを非表示にする
	if (isEnabledNotifications) {
		return;
	}

	// 通知が許可されていない場合に通知誘導ボタンを表示する
	return (
		// TODO:端末設定ではなくアプリ内で通知設定を保存できるようにする
		<Card padding="$4">
			<XStack alignItems="center" gap="$4">
				<Bell />
				<YStack flex={1} gap="$4">
					<Paragraph flex={1} fontSize="$4">
						通知を有効にすると、
						<SizableText color="$accentColor" fontWeight="bold">
							毎朝8時
						</SizableText>
						に体重データを通知します。
					</Paragraph>
					<Button onPress={openNotificationSettings}>設定を開く</Button>
				</YStack>
			</XStack>
		</Card>
	);
};

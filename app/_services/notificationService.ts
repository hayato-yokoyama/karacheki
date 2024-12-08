import {
	calcWeightAvg,
	fetchWeeklyWeights,
} from "@/app/_services/weightService";
import * as Notifications from "expo-notifications";

/** 毎朝8時の通知スケジュールを組む */
export async function scheduleDailyWeightNotification() {
	// 通知権限をリクエスト
	const { status } = await Notifications.requestPermissionsAsync();
	if (status !== "granted") {
		console.warn("通知の権限がありません");
		return;
	}

	// 今週と先週の体重データを取得
	const { currentWeek: currentWeekWeights, prevWeekData: prevWeekWeights } =
		await fetchWeeklyWeights();
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

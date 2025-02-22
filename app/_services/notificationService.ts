import {
	calcWeightAvg,
	fetchWeeklyWeights,
} from "@/app/_services/weightService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import BackgroundFetch from "react-native-background-fetch";

/** 毎朝8時の通知スケジュールを組む */
export async function scheduleDailyWeightNotification() {
	// 通知権限をリクエスト
	const { status } = await Notifications.requestPermissionsAsync();
	if (status !== "granted") {
		console.warn("通知の権限がありません");
		return;
	}

	// 保存された通知メッセージを取得
	const storedMessage = await AsyncStorage.getItem("latestWeightMessage");

	// デフォルトメッセージ（データが存在しない場合）
	const pushBodyText =
		storedMessage ||
		"最新の体重データが取得できませんでした。体重を測定しましょう！";

	// 既存の通知スケジュールを削除
	await Notifications.cancelAllScheduledNotificationsAsync();

	// 通知スケジュールを登録
	await Notifications.scheduleNotificationAsync({
		content: {
			title: "今週の体重",
			body: pushBodyText,
			sound: true,
		},
		// trigger: {
		// 	type: Notifications.SchedulableTriggerInputTypes.DAILY,
		// 	hour: 9,
		// 	minute: 55,
		// },
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
			repeats: true,
			seconds: 300,
		},
	});
}

/** バックグラウンドの体重取得処理を登録する */
// export const initBackgroundFetch = async () => {
// 	try {
// 		const status = await BackgroundFetch.configure(
// 			{
// 				minimumFetchInterval: 15,
// 			},
// 			async (taskId) => {
// 				console.log("[BackgroundFetch] タスク実行:", taskId);
// 				await fetchAndSaveWeightData();
// 				BackgroundFetch.finish(taskId);
// 			},
// 			(error) => {
// 				console.log("[BackgroundFetch] 登録失敗:", error);
// 			},
// 		);

// 		console.log("[BackgroundFetch] 登録完了");
// 	} catch (error) {
// 		console.error("[BackgroundFetch] 初期化エラー:", error);
// 	}
// };

export const initBackgroundFetch = async () => {
	// BackgroundFetch event handler.
	const onEvent = async (taskId: string) => {
		try {
			console.log("[BackgroundFetch] task: ", taskId);
			await fetchAndSaveWeightData();
		} catch (error) {
			console.error("[BackgroundFetch] エラー発生:", error);
		} finally {
			BackgroundFetch.finish(taskId); // 例外が発生しても必ず実行
		}
	};

	// Timeout callback is executed when your Task has exceeded its allowed running-time.
	// You must stop what you're doing immediately BackgroundFetch.finish(taskId)
	const onTimeout = async (taskId: string) => {
		console.warn("[BackgroundFetch] TIMEOUT task: ", taskId);
		BackgroundFetch.finish(taskId);
	};

	// Initialize BackgroundFetch only once when component mounts.
	const status = await BackgroundFetch.configure(
		{ minimumFetchInterval: 15 },
		onEvent,
		onTimeout,
	);

	console.log("[BackgroundFetch] configure status: ", status);
};

/** ヘルスケアから体重を取得して通知用メッセージを保存 */
const fetchAndSaveWeightData = async () => {
	try {
		const { currentWeek, prevWeekData } = await fetchWeeklyWeights();
		const currentWeekAvg = calcWeightAvg(currentWeek);
		const prevWeekAvg = calcWeightAvg(prevWeekData);
		const diff =
			currentWeekAvg && prevWeekAvg ? currentWeekAvg - prevWeekAvg : null;

		// // 通知文言の生成
		// const pushBodyText = currentWeekAvg
		// 	? `${currentWeekAvg.toFixed(2)}kg ${
		// 			diff !== null ? `(${diff >= 0 ? "+" : ""}${diff.toFixed(2)}kg)` : ""
		// 		}`
		// 	: "最新の体重データが取得できませんでした。体重を測定しましょう！";

		// デバッグ用
		// ✅ 保存日時の取得
		const now = new Date();
		const formattedDate = `${now.getFullYear()}/${(now.getMonth() + 1)
			.toString()
			.padStart(2, "0")}/${now.getDate().toString().padStart(2, "0")} ${now
			.getHours()
			.toString()
			.padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

		// ✅ 通知文言の生成（保存日時を含む）
		const pushBodyText = currentWeekAvg
			? `${currentWeekAvg.toFixed(2)}kg ${
					diff !== null ? `(${diff >= 0 ? "+" : ""}${diff.toFixed(2)}kg)` : ""
				} - ${formattedDate}`
			: `最新の体重データが取得できませんでした。体重を測定しましょう！（${formattedDate}）`;

		// 通知文言をローカルストレージに保存
		await AsyncStorage.setItem("latestWeightMessage", pushBodyText);

		console.log("[BackgroundFetch] 通知メッセージ保存成功:", pushBodyText);
	} catch (error) {
		console.error("[BackgroundFetch] 体重データ取得失敗:", error);
	}
};

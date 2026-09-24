import { useMutation } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Alert } from "react-native";
import {
	type BodyPhoto,
	MediaLibraryPermissionDeniedError,
	saveBodyPhotoToCameraRoll,
} from "@/services/bodyPhotoService";

/** 保存できたときにトーストで出す文言 */
export const SAVED_TO_CAMERA_ROLL_MESSAGE = "カメラロールに保存しました";

/**
 * カメラロールに保存できなかったことを伝える（#66）
 *
 * 権限が無いときは OS がもうダイアログを出さないので、設定へ送り出す
 */
export const alertCameraRollSaveError = (error: unknown) => {
	if (error instanceof MediaLibraryPermissionDeniedError) {
		Alert.alert(
			"カメラロールに保存できません",
			"設定アプリから写真への追加を許可してください。",
			[
				{ text: "キャンセル", style: "cancel" },
				{ text: "設定を開く", onPress: () => Linking.openSettings() },
			],
		);
		return;
	}

	// 原因を決めつけず、切り分けできるよう内容はログに残す
	console.error(error);
	Alert.alert("エラー", "カメラロールに保存できませんでした");
};

/**
 * 保存済みの写真を、後からカメラロールに保存する（#66）
 *
 * 一覧の長押しメニューと詳細画面の「端末に保存」で使う
 */
export const useSavePhotoToDevice = ({ onSaved }: { onSaved: () => void }) => {
	const { mutate, isPending } = useMutation({
		mutationFn: (photo: BodyPhoto) => saveBodyPhotoToCameraRoll(photo),
		onSuccess: onSaved,
		onError: alertCameraRollSaveError,
	});

	return { savePhotoToDevice: mutate, isSaving: isPending };
};

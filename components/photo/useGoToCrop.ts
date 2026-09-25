import { useRouter } from "expo-router";
import { useCallback } from "react";
import type { PickedPhoto } from "@/services/bodyPhotoService";

/**
 * 選んだ・撮った写真をトリミング画面へ渡す
 *
 * 一覧（ライブラリから選ぶ）と撮影画面の両方から開くので、渡し方をここにまとめる
 */
export const useGoToCrop = () => {
	const router = useRouter();

	return useCallback(
		(picked: PickedPhoto) => {
			router.push({
				pathname: "/(tabs)/photo/crop",
				params: {
					uri: picked.uri,
					takenAt: picked.takenAt.toISOString(),
					width: String(picked.width),
					height: String(picked.height),
				},
			});
		},
		[router],
	);
};

import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Alert, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, SizableText, Spinner, XStack, YStack } from "tamagui";
import { useScreenPaddingTop } from "@/components/ui";
import { cropBodyPhoto } from "@/services/bodyPhotoService";
import {
	CROP_ASPECT_RATIO,
	clampTranslation,
	getCropRect,
	getMinimumScale,
	type Size,
} from "@/services/cropRect";

/**
 * 画面の上下に置く文言とボタンの色（#82）
 *
 * この画面だけは地が黒で固定なので、テーマで色を変えない。
 * 「次へ」の地もライトのアクセント（#0057A8）では黒に沈むため、ダーク側の明るい方を使う
 */
const CHROME_TEXT_COLOR = "#FFFFFF";
const CHROME_HINT_COLOR = "rgba(255,255,255,0.72)";
const CHROME_ACCENT_COLOR = "#1670CF";

/** 画面の左右余白。他の画面（`layout.screenPaddingHorizontal`）と揃える */
const SCREEN_PADDING_HORIZONTAL = 16;

/** 上に重ねる見出しの高さ */
const TITLE_HEIGHT = 24;
/** 下に重ねる文言の高さ */
const HINT_HEIGHT = 20;

/** 下に置くボタンの高さ。他の画面の主要ボタンと揃える */
const BOTTOM_BUTTON_HEIGHT = 52;
/**
 * 画面の下端からボタンまでの最小の余白
 *
 * ホームバーのある端末ではそのセーフエリア（34px）がそのまま余白になる。
 * 無い端末でボタンが画面の縁に貼り付かないよう、下限だけ決めておく
 */
const BOTTOM_BUTTON_GAP = 12;

/** 拡大の上限。上げすぎても保存するときに粗くなるだけなので抑える */
const MAX_SCALE = 4;
/** 枠の外を覆う暗幕の濃さ */
const MASK_COLOR = "rgba(0, 0, 0, 0.6)";
/** 枠の縁の色 */
const FRAME_BORDER_COLOR = "rgba(255, 255, 255, 0.9)";
/**
 * 三分割のグリッド線の色
 *
 * 枠の縁より薄くする。同じ濃さだと線が写真より目立って、
 * 何を切り抜こうとしているのか見えなくなる
 */
const GRID_LINE_COLOR = "rgba(255, 255, 255, 0.35)";
/** 四隅のかぎ括弧の大きさと太さ */
const CORNER_SIZE = 22;
const CORNER_WIDTH = 3;

/** 三分割のグリッド線を引く位置（枠の幅・高さに対する割合） */
const GRID_RATIOS = [1 / 3, 2 / 3];

/** 四隅のかぎ括弧。角ごとに外側の2辺だけを描く */
const CORNERS = [
	{
		id: "topLeft",
		top: -CORNER_WIDTH,
		left: -CORNER_WIDTH,
		borderTopWidth: CORNER_WIDTH,
		borderLeftWidth: CORNER_WIDTH,
	},
	{
		id: "topRight",
		top: -CORNER_WIDTH,
		right: -CORNER_WIDTH,
		borderTopWidth: CORNER_WIDTH,
		borderRightWidth: CORNER_WIDTH,
	},
	{
		id: "bottomLeft",
		bottom: -CORNER_WIDTH,
		left: -CORNER_WIDTH,
		borderBottomWidth: CORNER_WIDTH,
		borderLeftWidth: CORNER_WIDTH,
	},
	{
		id: "bottomRight",
		bottom: -CORNER_WIDTH,
		right: -CORNER_WIDTH,
		borderBottomWidth: CORNER_WIDTH,
		borderRightWidth: CORNER_WIDTH,
	},
] as const;

export default function Crop() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const paddingTop = useScreenPaddingTop();
	const { uri, takenAt, width, height } = useLocalSearchParams<{
		uri: string;
		takenAt: string;
		width: string;
		height: string;
	}>();

	/** 元画像の大きさ。切り抜く座標は常にこのピクセルで考える */
	const image = useMemo<Size>(
		() => ({ width: Number(width), height: Number(height) }),
		[width, height],
	);
	const hasValidImage =
		Boolean(uri) &&
		Number.isFinite(image.width) &&
		Number.isFinite(image.height) &&
		image.width > 0 &&
		image.height > 0;

	/**
	 * 枠を置ける領域
	 *
	 * モーダルの高さは画面の高さと一致しないため、実際に測ってから枠を決める
	 */
	const [canvas, setCanvas] = useState<Size | null>(null);

	const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
		const { width: canvasWidth, height: canvasHeight } =
			event.nativeEvent.layout;

		setCanvas({ width: canvasWidth, height: canvasHeight });
	}, []);

	/**
	 * 見出しと操作が占める、枠を置けない上下の帯の高さ
	 *
	 * 見出しと文言は写真の上に重ねるので、枠がここまで伸びると白い文字が
	 * 明るい写真に重なって読めなくなる。小さい端末ではボタンが枠にかぶって
	 * その帯だけ写真を動かせなくなるため、枠を置ける領域から先に除いておく
	 */
	const chromeTop = paddingTop + TITLE_HEIGHT;
	const chromeBottom =
		Math.max(insets.bottom, BOTTOM_BUTTON_GAP) +
		HINT_HEIGHT +
		BOTTOM_BUTTON_GAP +
		BOTTOM_BUTTON_HEIGHT;

	/**
	 * 枠と、等倍（scale = 1）で表示する画像の位置
	 *
	 * 3:4 の枠を領域に収まる最大の大きさで中央に置き、画像はその枠を
	 * ちょうど覆う大きさで重ねる
	 */
	const layout = useMemo(() => {
		if (
			canvas === null ||
			canvas.width <= 0 ||
			canvas.height <= 0 ||
			!hasValidImage
		) {
			return null;
		}

		const availableHeight = canvas.height - chromeTop - chromeBottom;

		if (availableHeight <= 0) {
			return null;
		}

		const frameWidth = Math.min(
			canvas.width,
			availableHeight * CROP_ASPECT_RATIO,
		);
		const frame = {
			width: frameWidth,
			height: frameWidth / CROP_ASPECT_RATIO,
		};

		const minimumScale = getMinimumScale(image, frame);
		const baseSize = {
			width: image.width * minimumScale,
			height: image.height * minimumScale,
		};

		/** 枠の左上の位置。暗幕とグリッドもここを基準に置く */
		const frameLeft = (canvas.width - frame.width) / 2;
		const frameTop = chromeTop + (availableHeight - frame.height) / 2;

		return {
			frame,
			baseSize,
			frameLeft,
			frameTop,
			// 画像は枠の中心に置く。枠は上下の帯を除いた領域の中心なので、
			// キャンバスの中心とは一致しない
			imageLeft: frameLeft + (frame.width - baseSize.width) / 2,
			imageTop: frameTop + (frame.height - baseSize.height) / 2,
		};
	}, [canvas, chromeBottom, chromeTop, hasValidImage, image]);

	const scale = useSharedValue(1);
	const savedScale = useSharedValue(1);
	const translateX = useSharedValue(0);
	const translateY = useSharedValue(0);
	const savedTranslateX = useSharedValue(0);
	const savedTranslateY = useSharedValue(0);

	const gesture = useMemo(() => {
		const frame = layout?.frame ?? null;

		const pan = Gesture.Pan()
			.onStart(() => {
				savedTranslateX.value = translateX.value;
				savedTranslateY.value = translateY.value;
			})
			.onUpdate((event) => {
				if (frame === null) {
					return;
				}

				const next = clampTranslation({
					image,
					frame,
					scale: scale.value,
					translateX: savedTranslateX.value + event.translationX,
					translateY: savedTranslateY.value + event.translationY,
				});

				translateX.value = next.x;
				translateY.value = next.y;
			});

		const pinch = Gesture.Pinch()
			.onStart(() => {
				savedScale.value = scale.value;
			})
			.onUpdate((event) => {
				if (frame === null) {
					return;
				}

				scale.value = Math.min(
					Math.max(savedScale.value * event.scale, 1),
					MAX_SCALE,
				);

				// 縮めると動かせる範囲も狭まるので、そのたびに枠の中へ戻す
				const next = clampTranslation({
					image,
					frame,
					scale: scale.value,
					translateX: translateX.value,
					translateY: translateY.value,
				});

				translateX.value = next.x;
				translateY.value = next.y;
			});

		// 指1本で動かし、2本で寄せる。どちらも同時に効かせる
		return Gesture.Simultaneous(pan, pinch);
	}, [
		image,
		layout,
		savedScale,
		savedTranslateX,
		savedTranslateY,
		scale,
		translateX,
		translateY,
	]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [
			{ translateX: translateX.value },
			{ translateY: translateY.value },
			{ scale: scale.value },
		],
	}));

	const { mutate: cropPhoto, isPending } = useMutation({
		mutationFn: async () => {
			if (layout === null) {
				throw new Error("切り抜く範囲が決まっていません。");
			}

			return cropBodyPhoto(
				uri,
				getCropRect({
					image,
					frame: layout.frame,
					scale: scale.value,
					translateX: translateX.value,
					translateY: translateY.value,
				}),
			);
		},
		onSuccess: (cropped) => {
			router.push({
				pathname: "/(tabs)/photo/add",
				params: { uri: cropped.uri, takenAt },
			});
		},
		onError: () => {
			Alert.alert("エラー", "写真を切り抜けませんでした");
		},
	});

	if (!hasValidImage) {
		return (
			<YStack
				flex={1}
				paddingTop={paddingTop}
				paddingHorizontal={SCREEN_PADDING_HORIZONTAL}
				backgroundColor="black"
			>
				<SizableText
					fontSize={14}
					lineHeight={23}
					color={CHROME_HINT_COLOR}
					textAlign="center"
				>
					写真を読み込めませんでした。
				</SizableText>
			</YStack>
		);
	}

	return (
		<YStack flex={1} backgroundColor="black">
			<GestureDetector gesture={gesture}>
				<View style={{ flex: 1 }} onLayout={handleCanvasLayout}>
					{layout !== null && (
						<>
							<Animated.Image
								source={{ uri }}
								style={[
									{
										position: "absolute",
										left: layout.imageLeft,
										top: layout.imageTop,
										width: layout.baseSize.width,
										height: layout.baseSize.height,
									},
									animatedStyle,
								]}
							/>

							{/* 枠の外の暗幕とグリッド。指の操作を邪魔しないよう当たり判定は持たせない */}
							<View style={StyleSheet.absoluteFill} pointerEvents="none">
								<View
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										right: 0,
										height: layout.frameTop,
										backgroundColor: MASK_COLOR,
									}}
								/>
								<View
									style={{
										position: "absolute",
										top: layout.frameTop + layout.frame.height,
										left: 0,
										right: 0,
										bottom: 0,
										backgroundColor: MASK_COLOR,
									}}
								/>
								<View
									style={{
										position: "absolute",
										top: layout.frameTop,
										left: 0,
										width: layout.frameLeft,
										height: layout.frame.height,
										backgroundColor: MASK_COLOR,
									}}
								/>
								<View
									style={{
										position: "absolute",
										top: layout.frameTop,
										right: 0,
										width: layout.frameLeft,
										height: layout.frame.height,
										backgroundColor: MASK_COLOR,
									}}
								/>

								<View
									style={{
										position: "absolute",
										top: layout.frameTop,
										left: layout.frameLeft,
										width: layout.frame.width,
										height: layout.frame.height,
										borderWidth: StyleSheet.hairlineWidth,
										borderColor: FRAME_BORDER_COLOR,
									}}
								>
									{GRID_RATIOS.map((ratio) => (
										<View
											key={`vertical-${ratio}`}
											style={{
												position: "absolute",
												top: 0,
												bottom: 0,
												left: layout.frame.width * ratio,
												width: StyleSheet.hairlineWidth,
												backgroundColor: GRID_LINE_COLOR,
											}}
										/>
									))}
									{GRID_RATIOS.map((ratio) => (
										<View
											key={`horizontal-${ratio}`}
											style={{
												position: "absolute",
												left: 0,
												right: 0,
												top: layout.frame.height * ratio,
												height: StyleSheet.hairlineWidth,
												backgroundColor: GRID_LINE_COLOR,
											}}
										/>
									))}
									{CORNERS.map(({ id, ...corner }) => (
										<View
											key={id}
											style={{
												position: "absolute",
												width: CORNER_SIZE,
												height: CORNER_SIZE,
												borderColor: "white",
												...corner,
											}}
										/>
									))}
								</View>
							</View>
						</>
					)}
				</View>
			</GestureDetector>

			{/* 見出しと操作は切り抜く写真の上に重ねる。
			    枠を画面いっぱいに取れるので、3:4 の中身をいちばん大きく確かめられる */}
			<SizableText
				position="absolute"
				left={0}
				right={0}
				top={paddingTop}
				fontSize={17}
				fontWeight="800"
				color={CHROME_TEXT_COLOR}
				textAlign="center"
				pointerEvents="none"
			>
				写真を切り抜き
			</SizableText>

			<YStack
				position="absolute"
				left={0}
				right={0}
				bottom={Math.max(insets.bottom, BOTTOM_BUTTON_GAP)}
				gap={BOTTOM_BUTTON_GAP}
			>
				<SizableText
					fontSize={13}
					lineHeight={20}
					color={CHROME_HINT_COLOR}
					textAlign="center"
					pointerEvents="none"
				>
					同じ位置・同じ大きさで切り抜くと、比べやすくなります
				</SizableText>
				<XStack
					paddingHorizontal={SCREEN_PADDING_HORIZONTAL}
					alignItems="center"
					justifyContent="space-between"
				>
					<Button
						chromeless
						height={BOTTOM_BUTTON_HEIGHT}
						paddingHorizontal={16}
						fontSize={17}
						fontWeight="500"
						color={CHROME_TEXT_COLOR}
						pressStyle={{ backgroundColor: "transparent", opacity: 0.7 }}
						onPress={() => router.back()}
						disabled={isPending}
					>
						キャンセル
					</Button>
					<Button
						height={BOTTOM_BUTTON_HEIGHT}
						borderRadius={BOTTOM_BUTTON_HEIGHT / 2}
						borderWidth={0}
						paddingHorizontal={28}
						backgroundColor={CHROME_ACCENT_COLOR}
						color={CHROME_TEXT_COLOR}
						fontSize={17}
						fontWeight="700"
						pressStyle={{
							backgroundColor: CHROME_ACCENT_COLOR,
							opacity: 0.85,
						}}
						onPress={() => cropPhoto()}
						disabled={isPending || layout === null}
						opacity={layout === null ? 0.5 : 1}
						icon={
							isPending ? (
								<Spinner size="small" color={CHROME_TEXT_COLOR} />
							) : undefined
						}
						iconAfter={
							isPending ? undefined : (
								<ChevronRight
									color={CHROME_TEXT_COLOR}
									size={18}
									strokeWidth={2.4}
								/>
							)
						}
					>
						{isPending ? "切り抜き中..." : "次へ"}
					</Button>
				</XStack>
			</YStack>
		</YStack>
	);
}

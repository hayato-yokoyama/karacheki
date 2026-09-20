import { useMutation } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Alert, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Paragraph, Spinner, XStack, YStack } from "tamagui";
import { cropBodyPhoto } from "@/services/bodyPhotoService";
import {
	CROP_ASPECT_RATIO,
	clampTranslation,
	getCropRect,
	getMinimumScale,
	type Size,
} from "@/services/cropRect";

/** 下のバーの高さ */
const BOTTOM_BAR_HEIGHT = 56;
/** 拡大の上限。上げすぎても保存するときに粗くなるだけなので抑える */
const MAX_SCALE = 4;
/** 枠の外を覆う暗幕の濃さ */
const MASK_COLOR = "rgba(0, 0, 0, 0.6)";
/** 枠の縁とグリッドの色 */
const FRAME_LINE_COLOR = "rgba(255, 255, 255, 0.8)";
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

		const frameWidth = Math.min(
			canvas.width,
			canvas.height * CROP_ASPECT_RATIO,
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

		return {
			frame,
			baseSize,
			/** 枠の左上の位置。暗幕とグリッドもここを基準に置く */
			frameLeft: (canvas.width - frame.width) / 2,
			frameTop: (canvas.height - frame.height) / 2,
			imageLeft: (canvas.width - baseSize.width) / 2,
			imageTop: (canvas.height - baseSize.height) / 2,
		};
	}, [canvas, hasValidImage, image]);

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
				paddingVertical="$8"
				paddingHorizontal="$4"
				backgroundColor="black"
			>
				<Paragraph color="white">写真を読み込めませんでした。</Paragraph>
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
										bottom: 0,
										left: 0,
										right: 0,
										height: layout.frameTop,
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
										borderColor: FRAME_LINE_COLOR,
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
												backgroundColor: FRAME_LINE_COLOR,
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
												backgroundColor: FRAME_LINE_COLOR,
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

			<XStack
				height={BOTTOM_BAR_HEIGHT + insets.bottom}
				paddingBottom={insets.bottom}
				paddingHorizontal="$2"
				alignItems="center"
				justifyContent="space-between"
				backgroundColor="black"
			>
				<Button
					chromeless
					color="white"
					onPress={() => router.back()}
					disabled={isPending}
				>
					キャンセル
				</Button>
				<Button
					chromeless
					color="white"
					fontWeight="bold"
					onPress={() => cropPhoto()}
					disabled={isPending || layout === null}
					opacity={layout === null ? 0.5 : 1}
					icon={isPending ? <Spinner size="small" color="white" /> : undefined}
				>
					{isPending ? "切り抜き中..." : "次へ"}
				</Button>
			</XStack>
		</YStack>
	);
}

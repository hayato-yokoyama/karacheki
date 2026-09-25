import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useIsFocused, useRouter } from "expo-router";
import { SwitchCamera, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SizableText, View, XStack, YStack } from "tamagui";
import { useGoToCrop } from "@/components/photo/useGoToCrop";
import {
	CAMERA_TIMER_SECONDS,
	type CameraSettings,
	type CameraTimerSeconds,
	DEFAULT_CAMERA_SETTINGS,
	getCameraSettings,
	setCameraSettings,
} from "@/services/bodyPhotoService";

const CAMERA_SETTINGS_QUERY_KEY = ["bodyPhotoCameraSettings"];

/**
 * 画面の文言とボタンの色
 *
 * トリミング画面と同じく地が黒で固定なので、テーマで色を変えない
 */
const CHROME_TEXT_COLOR = "#FFFFFF";
const CHROME_HINT_COLOR = "rgba(255,255,255,0.72)";
const CHROME_ACCENT_COLOR = "#1670CF";
/** 閉じる・切り替えボタンやタイマーの選択肢の地 */
const CHROME_BUTTON_COLOR = "rgba(255,255,255,0.14)";
/** カウントダウン中のシャッター（中止ボタン）の色 */
const STOP_COLOR = "#FF3B30";

/**
 * プレビューの縦横比
 *
 * 写真は縦 3:4 で撮れるので、プレビューも同じ比にして写る範囲をそのまま見せる。
 * トリミングの枠（`CROP_ASPECT_RATIO`）とも同じ比になる
 */
const PREVIEW_ASPECT_RATIO = 3 / 4;

const TOP_BAR_HEIGHT = 56;
/** 閉じる・カメラ切り替えの丸ボタン */
const ICON_BUTTON_SIZE = 44;
const SHUTTER_SIZE = 76;
const SHUTTER_RING_WIDTH = 4;
const SHUTTER_INNER_SIZE = 62;
/** カウントダウン中に出す、中止を表す四角 */
const SHUTTER_STOP_SIZE = 28;
const TIMER_OPTION_HEIGHT = 32;
/** 下の操作部分の上下の余白 */
const CONTROLS_GAP = 16;
/** ホームバーの無い端末で、シャッターが画面の縁に貼り付かないようにする下限 */
const MIN_BOTTOM_PADDING = 16;

/** カウントダウンの数字と、その下に敷く丸 */
const COUNTDOWN_FONT_SIZE = 96;
const COUNTDOWN_CIRCLE_SIZE = 160;

/** 1 秒ごとに数字を減らす */
const COUNTDOWN_INTERVAL_MS = 1000;

const getTimerLabel = (seconds: CameraTimerSeconds) =>
	seconds === 0 ? "オフ" : `${seconds}秒`;

/**
 * Before/After の写真を撮る画面
 *
 * OS 標準の撮影画面にはセルフタイマーが無く、スマホを壁に立てかけて
 * 毎日同じ場所で撮れない。そのためアプリ内で撮影画面を持つ
 */
export default function BodyPhotoCamera() {
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const queryClient = useQueryClient();
	const goToCrop = useGoToCrop();
	// トリミング画面を重ねている間はカメラを止める。戻ってきたら撮り直せるよう再開する
	const isFocused = useIsFocused();
	const [permission] = useCameraPermissions();

	const cameraRef = useRef<CameraView>(null);
	const [isCameraReady, setIsCameraReady] = useState(false);
	/** 撮影が済むまで次のシャッターを受け付けない。state だと連打の間に合わない */
	const isCapturingRef = useRef(false);
	const [isCapturing, setIsCapturing] = useState(false);
	/** カウントダウンの残り秒数。数えていないときは null */
	const [countdown, setCountdown] = useState<number | null>(null);
	const isCountingDown = countdown !== null;

	const { data: storedSettings, isError: isSettingsError } = useQuery({
		queryKey: CAMERA_SETTINGS_QUERY_KEY,
		queryFn: getCameraSettings,
	});
	// 読み終える前にカメラを出すと、前回と違う向きで一瞬映ってから切り替わる。
	// 読めなかったときは初期値で撮れるようにする
	const settings =
		storedSettings ?? (isSettingsError ? DEFAULT_CAMERA_SETTINGS : undefined);

	/** 選んだらすぐ覚える。次に開いたときも同じタイマーとカメラで撮れるように */
	const updateSettings = useCallback(
		(next: CameraSettings) => {
			// 読み込みの途中で切り替えると、後から届いた前回の値で上書きされてしまう
			queryClient.cancelQueries({ queryKey: CAMERA_SETTINGS_QUERY_KEY });
			queryClient.setQueryData(CAMERA_SETTINGS_QUERY_KEY, next);
			setCameraSettings(next).catch((error) => {
				// 覚えられなくても今回の撮影には効くので、止めずにログだけ残す
				console.error(error);
			});
		},
		[queryClient],
	);

	/** プレビューを置ける領域。端末ごとに上下の操作の高さが違うので測ってから決める */
	const [previewArea, setPreviewArea] = useState<{
		width: number;
		height: number;
	} | null>(null);

	const handlePreviewAreaLayout = useCallback((event: LayoutChangeEvent) => {
		const { width, height } = event.nativeEvent.layout;
		setPreviewArea({ width, height });
	}, []);

	const previewWidth =
		previewArea === null
			? 0
			: Math.min(previewArea.width, previewArea.height * PREVIEW_ASPECT_RATIO);
	const previewHeight = previewWidth / PREVIEW_ASPECT_RATIO;

	const capture = useCallback(async () => {
		const camera = cameraRef.current;

		if (camera === null || isCapturingRef.current) {
			return;
		}

		isCapturingRef.current = true;
		setIsCapturing(true);

		try {
			// トリミング後に1度だけ圧縮するため、ここでは落とさずに受け取る
			const picture = await camera.takePictureAsync({ quality: 1 });

			// 撮影日は今。撮り忘れた日のぶんを後から撮ることもあるため、
			// この後の確認画面で直せるようにしてある
			goToCrop({
				uri: picture.uri,
				takenAt: new Date(),
				width: picture.width,
				height: picture.height,
			});
		} catch (error) {
			// 原因を決めつけず、切り分けできるよう内容はログに残す
			console.error(error);
			Alert.alert("エラー", "写真を撮れませんでした");
		} finally {
			isCapturingRef.current = false;
			setIsCapturing(false);
		}
	}, [goToCrop]);

	// 1 秒ずつ数えて、0 になったら撮る。画面を閉じたらタイマーも片付く
	useEffect(() => {
		if (countdown === null) {
			return;
		}

		if (countdown === 0) {
			setCountdown(null);
			capture();
			return;
		}

		const timeoutId = setTimeout(
			() => setCountdown(countdown - 1),
			COUNTDOWN_INTERVAL_MS,
		);

		return () => clearTimeout(timeoutId);
	}, [capture, countdown]);

	/** タイマーがあれば数え始め、数えている最中なら中止する。純正カメラと同じ振る舞い */
	const handlePressShutter = () => {
		if (isCountingDown) {
			setCountdown(null);
			return;
		}

		if (settings === undefined || settings.timerSeconds === 0) {
			capture();
			return;
		}

		setCountdown(settings.timerSeconds);
	};

	const handleMountError = useCallback(
		(event: { message: string }) => {
			console.error(event.message);
			Alert.alert("エラー", "カメラを起動できませんでした", [
				{ text: "閉じる", onPress: () => router.back() },
			]);
		},
		[router],
	);

	const canShoot =
		settings !== undefined && isCameraReady && isFocused && !isCapturing;

	return (
		<YStack
			flex={1}
			backgroundColor="black"
			paddingTop={insets.top}
			paddingBottom={Math.max(insets.bottom, MIN_BOTTOM_PADDING)}
		>
			<XStack
				height={TOP_BAR_HEIGHT}
				paddingHorizontal={16}
				alignItems="center"
			>
				<ChromeIconButton
					accessibilityLabel="閉じる"
					onPress={() => router.back()}
				>
					<X color={CHROME_TEXT_COLOR} size={22} strokeWidth={2.2} />
				</ChromeIconButton>
			</XStack>

			<View
				flex={1}
				alignItems="center"
				justifyContent="center"
				onLayout={handlePreviewAreaLayout}
			>
				{previewWidth > 0 && (
					<View
						width={previewWidth}
						height={previewHeight}
						overflow="hidden"
						alignItems="center"
						justifyContent="center"
					>
						{permission?.granted === false ? (
							// 一覧で確かめてから開くので、ここに来るのは撮影中に権限を外されたときだけ
							<SizableText
								paddingHorizontal={24}
								fontSize={14}
								lineHeight={23}
								color={CHROME_HINT_COLOR}
								textAlign="center"
							>
								カメラへのアクセスが許可されていません。
							</SizableText>
						) : (
							settings !== undefined && (
								<CameraView
									ref={cameraRef}
									style={{ width: previewWidth, height: previewHeight }}
									facing={settings.facing}
									active={isFocused}
									onCameraReady={() => setIsCameraReady(true)}
									onMountError={handleMountError}
								/>
							)
						)}

						{isCountingDown && (
							<View
								position="absolute"
								width={COUNTDOWN_CIRCLE_SIZE}
								height={COUNTDOWN_CIRCLE_SIZE}
								borderRadius={COUNTDOWN_CIRCLE_SIZE / 2}
								backgroundColor="rgba(0,0,0,0.35)"
								alignItems="center"
								justifyContent="center"
								pointerEvents="none"
								accessibilityLiveRegion="polite"
							>
								<SizableText
									fontFamily="$numeric"
									fontSize={COUNTDOWN_FONT_SIZE}
									lineHeight={COUNTDOWN_FONT_SIZE}
									fontWeight="700"
									color={CHROME_TEXT_COLOR}
								>
									{countdown}
								</SizableText>
							</View>
						)}
					</View>
				)}
			</View>

			<YStack paddingTop={CONTROLS_GAP} gap={CONTROLS_GAP}>
				<XStack
					height={TIMER_OPTION_HEIGHT}
					gap={8}
					alignItems="center"
					justifyContent="center"
				>
					{isCountingDown ? (
						<SizableText fontSize={13} color={CHROME_HINT_COLOR}>
							シャッターを押すと中止します
						</SizableText>
					) : (
						CAMERA_TIMER_SECONDS.map((seconds) => (
							<TimerOption
								key={seconds}
								label={getTimerLabel(seconds)}
								isSelected={settings?.timerSeconds === seconds}
								disabled={settings === undefined}
								onPress={() =>
									settings !== undefined &&
									updateSettings({ ...settings, timerSeconds: seconds })
								}
							/>
						))
					)}
				</XStack>

				<XStack
					paddingHorizontal={32}
					alignItems="center"
					justifyContent="space-between"
				>
					{/* シャッターを真ん中に置くため、右の切り替えボタンと同じ幅を空けておく */}
					<View width={ICON_BUTTON_SIZE} />

					<View
						width={SHUTTER_SIZE}
						height={SHUTTER_SIZE}
						borderRadius={SHUTTER_SIZE / 2}
						borderWidth={SHUTTER_RING_WIDTH}
						borderColor={CHROME_TEXT_COLOR}
						alignItems="center"
						justifyContent="center"
						opacity={canShoot ? 1 : 0.5}
						pressStyle={{ opacity: 0.7 }}
						onPress={canShoot ? handlePressShutter : undefined}
						// Tamagui は tabIndex が 0 のときしか accessible を補わないので自分で付ける
						accessible
						accessibilityRole="button"
						accessibilityLabel={isCountingDown ? "撮影を中止" : "撮影"}
						accessibilityState={{ disabled: !canShoot }}
					>
						{isCountingDown ? (
							<View
								width={SHUTTER_STOP_SIZE}
								height={SHUTTER_STOP_SIZE}
								borderRadius={6}
								backgroundColor={STOP_COLOR}
							/>
						) : (
							<View
								width={SHUTTER_INNER_SIZE}
								height={SHUTTER_INNER_SIZE}
								borderRadius={SHUTTER_INNER_SIZE / 2}
								backgroundColor={CHROME_TEXT_COLOR}
							/>
						)}
					</View>

					<ChromeIconButton
						accessibilityLabel={
							settings?.facing === "back"
								? "前面カメラに切り替え"
								: "背面カメラに切り替え"
						}
						// 数えている途中で切り替えると、立ち位置を合わせた画角が変わってしまう
						disabled={settings === undefined || isCountingDown || isCapturing}
						onPress={() =>
							settings !== undefined &&
							updateSettings({
								...settings,
								facing: settings.facing === "front" ? "back" : "front",
							})
						}
					>
						<SwitchCamera color={CHROME_TEXT_COLOR} size={22} strokeWidth={2} />
					</ChromeIconButton>
				</XStack>
			</YStack>
		</YStack>
	);
}

/** 黒地の上に置く丸いアイコンボタン */
const ChromeIconButton = ({
	accessibilityLabel,
	disabled = false,
	onPress,
	children,
}: {
	accessibilityLabel: string;
	disabled?: boolean;
	onPress: () => void;
	children: ReactNode;
}) => (
	<View
		width={ICON_BUTTON_SIZE}
		height={ICON_BUTTON_SIZE}
		borderRadius={ICON_BUTTON_SIZE / 2}
		backgroundColor={CHROME_BUTTON_COLOR}
		alignItems="center"
		justifyContent="center"
		opacity={disabled ? 0.4 : 1}
		pressStyle={{ opacity: 0.7 }}
		onPress={disabled ? undefined : onPress}
		accessible
		accessibilityRole="button"
		accessibilityLabel={accessibilityLabel}
		accessibilityState={{ disabled }}
	>
		{children}
	</View>
);

/** タイマーの選択肢 1 つ */
const TimerOption = ({
	label,
	isSelected,
	disabled,
	onPress,
}: {
	label: string;
	isSelected: boolean;
	disabled: boolean;
	onPress: () => void;
}) => (
	<View
		height={TIMER_OPTION_HEIGHT}
		minWidth={56}
		paddingHorizontal={14}
		borderRadius={TIMER_OPTION_HEIGHT / 2}
		backgroundColor={isSelected ? CHROME_ACCENT_COLOR : CHROME_BUTTON_COLOR}
		alignItems="center"
		justifyContent="center"
		pressStyle={{ opacity: 0.7 }}
		onPress={disabled ? undefined : onPress}
		accessible
		accessibilityRole="button"
		accessibilityLabel={`タイマー ${label}`}
		accessibilityState={{ selected: isSelected, disabled }}
	>
		<SizableText
			fontSize={14}
			fontWeight={isSelected ? "700" : "500"}
			color={CHROME_TEXT_COLOR}
		>
			{label}
		</SizableText>
	</View>
);

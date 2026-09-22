import RNDateTimePicker, {
	type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, RotateCcw } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image } from "react-native";
import { Button, SizableText, useTheme, View, XStack } from "tamagui";
import {
	BackLink,
	BottomActionBar,
	PrimaryButton,
	Screen,
	ScreenHeader,
	ScreenScrollView,
	SurfaceCard,
} from "@/components/ui";
import { addBodyPhoto } from "@/services/bodyPhotoService";

/** プレビューの高さ。下の撮影日と保存ボタンまで1画面に収まる大きさ */
const PREVIEW_HEIGHT = 420;
/** プレビューの角丸。画面の主役なのでカードより一段大きい */
const PREVIEW_RADIUS = 24;

/** プレビューの上に重ねる「写真を変更」ボタン */
const CHANGE_BUTTON_HEIGHT = 36;
/** 写真の上なので、地はテーマによらず黒の半透明 */
const CHANGE_BUTTON_BACKGROUND = "rgba(0,0,0,0.55)";

export default function Add() {
	const theme = useTheme();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { uri, takenAt } = useLocalSearchParams<{
		uri: string;
		takenAt: string;
	}>();

	// EXIFから取れた撮影日を初期値にする。保存前にここで直せる
	const [selectedDate, setSelectedDate] = useState<Date>(() => {
		const parsed = takenAt ? new Date(takenAt) : new Date();
		return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
	});

	const { mutate: savePhoto, isPending } = useMutation({
		mutationFn: () => addBodyPhoto(uri, selectedDate),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["bodyPhotos"] });
			// 1つ戻るとトリミング画面に出てしまう。保存し終えたら一覧まで戻す
			router.dismissTo("/(tabs)/photo");
		},
		onError: () => {
			Alert.alert("エラー", "写真の保存に失敗しました");
		},
	});

	// v9 で date が必須になったため、存在チェックは不要
	const handleDateChange = (_event: DateTimePickerChangeEvent, date: Date) => {
		setSelectedDate(date);
	};

	if (!uri) {
		return (
			<Screen>
				<ScreenScrollView withTabBar={false}>
					<BackLink>写真を切り抜き</BackLink>
					<SizableText fontSize={14} lineHeight={23} color="$textMuted">
						写真が選ばれていません。
					</SizableText>
				</ScreenScrollView>
			</Screen>
		);
	}

	return (
		<Screen>
			<ScreenScrollView withTabBar={false} withBottomAction>
				{/* デザインはヘッダー右端の × で閉じる形だが、この画面は切り抜きの上に
				    積まれていて戻り先が一覧ではない。何に戻るのかを言葉で示せる戻るリンクにする */}
				<BackLink>写真を切り抜き</BackLink>
				<ScreenHeader label="Before/After" title="写真を追加" />

				<View
					height={PREVIEW_HEIGHT}
					borderRadius={PREVIEW_RADIUS}
					overflow="hidden"
					// 画像が読み込まれるまでの下地。3:4 に収まらない余白にも出る
					backgroundColor="$photoPlaceholderStart"
				>
					<Image
						source={{ uri }}
						style={{ width: "100%", height: "100%" }}
						// 保存されるのは切り抜いた範囲そのものなので、端を落とさず全体を見せる
						resizeMode="contain"
					/>
					{/* 切り抜き直しも写真の選び直しも、1つ戻ったトリミング画面からできる */}
					<Button
						position="absolute"
						left={12}
						bottom={12}
						height={CHANGE_BUTTON_HEIGHT}
						borderRadius={CHANGE_BUTTON_HEIGHT / 2}
						borderWidth={0}
						paddingLeft={12}
						paddingRight={14}
						gap={6}
						backgroundColor={CHANGE_BUTTON_BACKGROUND}
						color="$onHero"
						fontSize={13}
						fontWeight="700"
						pressStyle={{
							backgroundColor: CHANGE_BUTTON_BACKGROUND,
							opacity: 0.85,
						}}
						icon={
							<RotateCcw color={theme.onHero.val} size={16} strokeWidth={2.2} />
						}
						onPress={() => router.back()}
					>
						写真を変更
					</Button>
				</View>

				{/* デザインは日付をピル状のボタンで見せているが、日付の選び方は OS に委ねる。
				    ホームの体重入力（`home/add.tsx`）と同じく `RNDateTimePicker` をそのまま置く */}
				<SurfaceCard paddingVertical={12} paddingHorizontal={16}>
					<XStack
						height={36}
						alignItems="center"
						justifyContent="space-between"
					>
						<SizableText fontSize={14} fontWeight="700" color="$textPrimary">
							撮影日
						</SizableText>
						<RNDateTimePicker
							value={selectedDate}
							mode="date"
							onValueChange={handleDateChange}
							locale="ja-JP"
						/>
					</XStack>
				</SurfaceCard>
			</ScreenScrollView>

			<BottomActionBar withTabBar={false}>
				<PrimaryButton
					disabled={isPending}
					icon={
						<Check
							color={isPending ? theme.textMuted.val : theme.onAccentFill.val}
							size={20}
							strokeWidth={2.4}
						/>
					}
					onPress={() => savePhoto()}
				>
					{isPending ? "保存中..." : "写真を保存"}
				</PrimaryButton>
			</BottomActionBar>
		</Screen>
	);
}

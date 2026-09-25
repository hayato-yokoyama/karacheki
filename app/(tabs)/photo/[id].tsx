import { LinearGradient } from "@tamagui/linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Download, Trash2 } from "lucide-react-native";
import { Alert, Image } from "react-native";
import {
	Button,
	SizableText,
	Spinner,
	useTheme,
	View,
	XStack,
	YStack,
} from "tamagui";
import {
	getPhotoWeight,
	PhotoWeightValue,
	useAllWeights,
} from "@/components/photo/photoWeight";
import {
	SAVED_TO_CAMERA_ROLL_MESSAGE,
	useSavePhotoToDevice,
} from "@/components/photo/useSavePhotoToDevice";
import {
	BackLink,
	Screen,
	ScreenHeader,
	ScreenScrollView,
	useToast,
} from "@/components/ui";
import {
	deleteBodyPhoto,
	getBodyPhotoUri,
	listBodyPhotos,
} from "@/services/bodyPhotoService";
import { layout, typography } from "@/theme/designTokens";

/** 写真を出す高さ。3:4 の写真が画面幅いっぱいに収まる */
const PHOTO_HEIGHT = 480;
/** 写真の角丸。画面の主役なのでカードより一段大きい */
const PHOTO_RADIUS = 26;

/** 体重を読めるようにするため、写真の下端に敷く黒へのグラデーション（#50） */
const PHOTO_SCRIM_HEIGHT = 110;
const PHOTO_SCRIM_COLORS: string[] = ["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"];

/** 読み込み中・エラーのときも見出しは出すので、戻り先の文言はここに置く */
const BACK_LABEL = "Before/After";

export default function PhotoDetail() {
	const theme = useTheme();
	const router = useRouter();
	const queryClient = useQueryClient();
	const { id } = useLocalSearchParams<{ id: string }>();

	const {
		data: photos,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["bodyPhotos"],
		queryFn: listBodyPhotos,
	});

	// 読み込み中や取得に失敗したときは undefined のままにして、体重の欄ごと出さない（#50）
	const weights = useAllWeights();

	const { showToast, toast } = useToast();
	const { savePhotoToDevice, isSaving } = useSavePhotoToDevice({
		onSaved: () => showToast(SAVED_TO_CAMERA_ROLL_MESSAGE),
	});

	const index = photos?.findIndex((item) => item.id === id) ?? -1;
	const photo = index === -1 ? undefined : photos?.[index];

	const { mutate: removePhoto, isPending } = useMutation({
		mutationFn: () => deleteBodyPhoto(id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["bodyPhotos"] });
			router.back();
		},
		onError: () => {
			Alert.alert("エラー", "写真の削除に失敗しました");
		},
	});

	const handlePressDelete = () => {
		Alert.alert("写真を削除しますか？", "削除した写真は元に戻せません。", [
			{ text: "キャンセル", style: "cancel" },
			{
				text: "削除",
				style: "destructive",
				onPress: () => removePhoto(),
			},
		]);
	};

	if (isLoading) {
		return (
			<Screen>
				<ScreenScrollView>
					<BackLink>{BACK_LABEL}</BackLink>
					<YStack height={400} alignItems="center" justifyContent="center">
						<Spinner size="small" />
					</YStack>
				</ScreenScrollView>
			</Screen>
		);
	}

	// 読み込みに失敗したときに「削除された」と誤解させない
	if (error || !photo || !photos) {
		return (
			<Screen>
				<ScreenScrollView>
					<BackLink>{BACK_LABEL}</BackLink>
					<SizableText fontSize={14} lineHeight={23} color="$textMuted">
						{/* 一覧から削除された直後などに写真だけ見つからないことがある */}
						{error
							? "写真を読み込めませんでした。"
							: "写真が見つかりませんでした。"}
					</SizableText>
				</ScreenScrollView>
			</Screen>
		);
	}

	const takenAt = new Date(photo.takenAt);
	const photoWeight = weights ? getPhotoWeight(weights, photo) : undefined;

	return (
		<Screen>
			<ScreenScrollView>
				<BackLink>{BACK_LABEL}</BackLink>
				<ScreenHeader
					label={`写真 ${index + 1} / ${photos.length}`}
					title={format(takenAt, "yyyy年M月d日")}
				/>

				<View
					height={PHOTO_HEIGHT}
					borderRadius={PHOTO_RADIUS}
					overflow="hidden"
					// 画像が読み込まれるまでの下地。3:4 でない写真の余白にも出る
					backgroundColor="$photoPlaceholderStart"
				>
					<Image
						source={{ uri: getBodyPhotoUri(photo) }}
						style={{ width: "100%", height: "100%" }}
						// 切り抜き前に保存した 3:4 でない写真も、端を落とさず全体を見せる
						resizeMode="contain"
					/>
					{photoWeight !== undefined && (
						<>
							<LinearGradient
								colors={PHOTO_SCRIM_COLORS}
								position="absolute"
								left={0}
								right={0}
								bottom={0}
								height={PHOTO_SCRIM_HEIGHT}
								pointerEvents="none"
							/>
							<YStack position="absolute" left={18} right={16} bottom={16}>
								<SizableText
									fontSize={13}
									lineHeight={16}
									fontWeight="700"
									color="$onHero"
									opacity={0.9}
								>
									撮影時の体重
								</SizableText>
								<PhotoWeightValue
									photoWeight={photoWeight}
									fontSize={34}
									lineHeight={36}
								/>
							</YStack>
						</>
					)}
				</View>

				<XStack marginTop={4} gap={10}>
					<Button
						flex={1}
						height={layout.primaryButtonHeight}
						borderRadius={layout.primaryButtonHeight / 2}
						borderWidth={0}
						backgroundColor="$accentSoft"
						color="$accent"
						fontSize={typography.primaryButton.fontSize}
						fontWeight={typography.primaryButton.fontWeight}
						pressStyle={{ backgroundColor: "$accentSoft", opacity: 0.85 }}
						icon={
							<Download color={theme.accent.val} size={20} strokeWidth={2.2} />
						}
						onPress={() => savePhotoToDevice(photo)}
						// 保存中に消すと保存が失敗し、削除中に保存しても消えた写真を指す。互いに待たせる
						disabled={isSaving || isPending}
					>
						端末に保存
					</Button>
					{/* NOTE: 元々付いていた color="$red10" は config v3 に存在しないトークンで
					    （あるのは $red10Light / $red10Dark）、v1 でも解決されていなかった。
					    v2 では未解決の文字列がそのまま lucide に渡ってアイコンが消えるので外す */}
					<Button
						flex={1}
						height={layout.primaryButtonHeight}
						borderRadius={layout.primaryButtonHeight / 2}
						borderWidth={1}
						borderColor="$dangerBorder"
						backgroundColor="$dangerSoft"
						color="$danger"
						fontSize={typography.primaryButton.fontSize}
						fontWeight={typography.primaryButton.fontWeight}
						pressStyle={{ backgroundColor: "$dangerSoft", opacity: 0.85 }}
						icon={<Trash2 color={theme.danger.val} size={20} strokeWidth={2} />}
						onPress={handlePressDelete}
						disabled={isSaving || isPending}
					>
						削除
					</Button>
				</XStack>
			</ScreenScrollView>
			{toast}
		</Screen>
	);
}

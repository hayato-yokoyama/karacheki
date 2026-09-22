import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Trash2 } from "lucide-react-native";
import { Alert, Image } from "react-native";
import { Button, SizableText, Spinner, useTheme, View, YStack } from "tamagui";
import {
	BackLink,
	Screen,
	ScreenHeader,
	ScreenScrollView,
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
				</View>

				{/* NOTE: 元々付いていた color="$red10" は config v3 に存在しないトークンで
				    （あるのは $red10Light / $red10Dark）、v1 でも解決されていなかった。
				    v2 では未解決の文字列がそのまま lucide に渡ってアイコンが消えるので外す */}
				<Button
					marginTop={4}
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
					disabled={isPending}
				>
					この写真を削除
				</Button>
			</ScreenScrollView>
		</Screen>
	);
}

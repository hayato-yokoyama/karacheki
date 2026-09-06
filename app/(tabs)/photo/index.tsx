import {
	getBodyPhotoUri,
	listBodyPhotos,
	pickBodyPhoto,
} from "@/services/bodyPhotoService";
import type { BodyPhoto } from "@/services/bodyPhotoService";
import { ImagePlus } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";
import { Alert, FlatList, Image, useWindowDimensions } from "react-native";
import {
	Button,
	Paragraph,
	SizableText,
	Spinner,
	View,
	YStack,
	useTheme,
} from "tamagui";

/** 一覧の外側の余白 */
const LIST_PADDING = 16;
/** セル同士の間隔 */
const CELL_GAP = 4;
const COLUMN_COUNT = 3;
/** セルの縦横比。全身写真に合わせた縦長 */
const CELL_ASPECT_RATIO = 3 / 4;

export default function Photos() {
	const theme = useTheme();
	const router = useRouter();
	const { width } = useWindowDimensions();

	const {
		data: photos,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["bodyPhotos"],
		queryFn: listBodyPhotos,
	});

	/** フォトライブラリから1枚選び、撮影日の確認画面へ進む */
	const handlePressAdd = useCallback(async () => {
		try {
			const picked = await pickBodyPhoto();

			if (!picked) {
				return;
			}

			router.push({
				pathname: "/(tabs)/photo/add",
				params: {
					uri: picked.uri,
					takenAt: picked.takenAt.toISOString(),
				},
			});
		} catch {
			Alert.alert(
				"エラー",
				"写真を選べませんでした。\n設定アプリから写真へのアクセスが許可されていることを確認してください。",
			);
		}
	}, [router]);

	const cellWidth =
		(width - LIST_PADDING * 2 - CELL_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

	const renderItem = useCallback(
		({ item }: { item: BodyPhoto }) => (
			<View
				width={cellWidth}
				marginBottom={CELL_GAP}
				onPress={() => router.push(`/(tabs)/photo/${item.id}`)}
			>
				<Image
					source={{ uri: getBodyPhotoUri(item) }}
					style={{
						width: cellWidth,
						height: cellWidth / CELL_ASPECT_RATIO,
						borderRadius: 8,
						backgroundColor: theme.background05.val,
					}}
					resizeMode="cover"
				/>
				<SizableText size="$1" paddingTop="$1">
					{format(new Date(item.takenAt), "yyyy/MM/dd")}
				</SizableText>
			</View>
		),
		[cellWidth, router, theme.background05.val],
	);

	const screenOptions = (
		<Stack.Screen
			options={{
				title: "Before/After",
				headerStyle: { backgroundColor: theme.background0.val },
				headerRight: () => (
					<Button
						size="$2"
						icon={<ImagePlus />}
						onPress={handlePressAdd}
						chromeless
					>
						追加
					</Button>
				),
			}}
		/>
	);

	if (isLoading) {
		return (
			<>
				{screenOptions}
				<YStack
					padding="$8"
					flex={1}
					alignItems="center"
					justifyContent="center"
				>
					<Spinner size="small" />
				</YStack>
			</>
		);
	}

	if (error) {
		return (
			<>
				{screenOptions}
				<YStack paddingVertical="$8" paddingHorizontal="$4" gap="$4">
					<Paragraph>写真を読み込めませんでした。</Paragraph>
				</YStack>
			</>
		);
	}

	// 1枚も保存されていないとき
	if (!photos || photos.length === 0) {
		return (
			<>
				{screenOptions}
				<YStack
					flex={1}
					paddingHorizontal="$4"
					gap="$4"
					alignItems="center"
					justifyContent="center"
				>
					<SizableText size="$6" fontWeight="bold">
						写真を追加しましょう 📸
					</SizableText>
					<Paragraph textAlign="center">
						同じ場所・同じポーズで撮った写真を残しておくと、
						体重の数字だけでは分からない変化に気づけます。
					</Paragraph>
					<Button icon={<ImagePlus />} onPress={handlePressAdd}>
						写真を追加する
					</Button>
				</YStack>
			</>
		);
	}

	return (
		<>
			{screenOptions}
			<FlatList
				data={photos}
				keyExtractor={(photo) => photo.id}
				renderItem={renderItem}
				numColumns={COLUMN_COUNT}
				columnWrapperStyle={{ gap: CELL_GAP }}
				contentContainerStyle={{ padding: LIST_PADDING }}
			/>
		</>
	);
}

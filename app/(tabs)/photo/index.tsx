import {
	getBodyPhotoUri,
	listBodyPhotos,
	pickBodyPhoto,
} from "@/services/bodyPhotoService";
import type { BodyPhoto } from "@/services/bodyPhotoService";
import { Check, ImagePlus } from "@tamagui/lucide-icons";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Stack, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { Alert, FlatList, Image, useWindowDimensions } from "react-native";
import {
	Button,
	Paragraph,
	SizableText,
	Spinner,
	View,
	XStack,
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
/** 比較で選べる枚数 */
const COMPARE_COUNT = 2;
/** 選択済みを示すチェックマークの大きさ */
const CHECK_BADGE_SIZE = 22;

export default function Photos() {
	const theme = useTheme();
	const router = useRouter();
	const { width } = useWindowDimensions();

	/** 比較する2枚を選んでいる最中かどうか */
	const [isSelecting, setIsSelecting] = useState(false);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);

	const {
		data: photos,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["bodyPhotos"],
		queryFn: listBodyPhotos,
	});

	/**
	 * 選択中の写真
	 *
	 * 選んだ後の再取得で実体ファイルが失われた写真が一覧から取り除かれることがある。
	 * 消えたIDを選択に残すと、比較もできず他の写真も選べない行き止まりになるため、
	 * 常に一覧にあるものだけを選択として扱う
	 */
	const selectedPhotos = useMemo(
		() =>
			selectedIds
				.map((id) => photos?.find((photo) => photo.id === id))
				.filter((photo): photo is BodyPhoto => photo !== undefined),
		[photos, selectedIds],
	);
	const selectedCount = selectedPhotos.length;

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
		} catch (error) {
			// 原因を決めつけず、切り分けできるよう内容はログに残す
			console.error(error);
			Alert.alert("エラー", "写真を選べませんでした");
		}
	}, [router]);

	const handleStartSelect = useCallback(() => {
		setIsSelecting(true);
	}, []);

	const handleCancelSelect = useCallback(() => {
		setIsSelecting(false);
		setSelectedIds([]);
	}, []);

	/** 選択中は選び外し、それ以外は詳細へ */
	const handlePressCell = useCallback(
		(id: string) => {
			if (!isSelecting) {
				router.push(`/(tabs)/photo/${id}`);
				return;
			}

			const currentIds = selectedPhotos.map((photo) => photo.id);

			if (currentIds.includes(id)) {
				setSelectedIds(currentIds.filter((selectedId) => selectedId !== id));
				return;
			}

			if (currentIds.length < COMPARE_COUNT) {
				setSelectedIds([...currentIds, id]);
			}
		},
		[isSelecting, router, selectedPhotos],
	);

	/**
	 * 選んだ2枚を比較画面へ渡し、選択モードを終える
	 *
	 * Before/After は時系列なので、選んだ順ではなく撮影日の古い方を Before にする
	 */
	const handlePressCompare = useCallback(() => {
		if (selectedCount !== COMPARE_COUNT) {
			return;
		}

		// メモ化した配列をそのまま並べ替えると選択の状態を壊すため、複製してから並べる
		const [before, after] = [...selectedPhotos].sort((a, b) => {
			const takenAtDiff =
				new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime();

			if (takenAtDiff !== 0) {
				return takenAtDiff;
			}

			return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
		});

		router.push({
			pathname: "/(tabs)/photo/compare",
			params: { beforeId: before.id, afterId: after.id },
		});

		// 見終えて戻ったら通常の一覧に戻す。比較の出口を「戻る」に一本化するため
		setIsSelecting(false);
		setSelectedIds([]);
	}, [router, selectedCount, selectedPhotos]);

	const cellWidth =
		(width - LIST_PADDING * 2 - CELL_GAP * (COLUMN_COUNT - 1)) / COLUMN_COUNT;

	const renderItem = useCallback(
		({ item }: { item: BodyPhoto }) => {
			const isSelected = selectedIds.includes(item.id);
			// 2枚そろった後は、選び直す以外の操作をさせない
			const isDisabled =
				isSelecting && !isSelected && selectedCount >= COMPARE_COUNT;

			return (
				<View
					width={cellWidth}
					marginBottom={CELL_GAP}
					opacity={isDisabled ? 0.3 : 1}
					onPress={isDisabled ? undefined : () => handlePressCell(item.id)}
				>
					<View>
						<Image
							source={{ uri: getBodyPhotoUri(item) }}
							style={{
								width: cellWidth,
								height: cellWidth / CELL_ASPECT_RATIO,
								borderRadius: 8,
								backgroundColor: theme.background05.val,
								borderWidth: isSelected ? 3 : 0,
								borderColor: theme.accentColor.val,
							}}
							resizeMode="cover"
						/>
						{isSelected && (
							<View
								position="absolute"
								top="$2"
								right="$2"
								width={CHECK_BADGE_SIZE}
								height={CHECK_BADGE_SIZE}
								borderRadius={CHECK_BADGE_SIZE / 2}
								backgroundColor="$accentColor"
								alignItems="center"
								justifyContent="center"
							>
								<Check size={14} color="$background" />
							</View>
						)}
					</View>
					<SizableText size="$1" paddingTop="$1">
						{format(new Date(item.takenAt), "yyyy/MM/dd")}
					</SizableText>
				</View>
			);
		},
		[
			cellWidth,
			handlePressCell,
			isSelecting,
			selectedCount,
			selectedIds,
			theme.accentColor.val,
			theme.background05.val,
		],
	);

	// 1枚しかなければ比較は成り立たないので、条件が揃うまで入り口を出さない
	const canCompare = (photos?.length ?? 0) >= COMPARE_COUNT;

	const screenOptions = (
		<Stack.Screen
			options={{
				// 比較画面の戻るボタンに戻り先として表示されるため、選択中も変えない
				title: "Before/After",
				headerStyle: { backgroundColor: theme.background0.val },
				headerLeft: isSelecting
					? () => (
							<Button size="$2" onPress={handleCancelSelect} chromeless>
								キャンセル
							</Button>
						)
					: undefined,
				headerRight: () =>
					isSelecting ? (
						<Button
							size="$2"
							onPress={handlePressCompare}
							disabled={selectedCount !== COMPARE_COUNT}
							opacity={selectedCount === COMPARE_COUNT ? 1 : 0.5}
							chromeless
						>
							比較する
						</Button>
					) : (
						<XStack alignItems="center">
							{canCompare && (
								<Button size="$2" onPress={handleStartSelect} chromeless>
									比較
								</Button>
							)}
							<Button
								size="$2"
								icon={<ImagePlus />}
								onPress={handlePressAdd}
								chromeless
							>
								追加
							</Button>
						</XStack>
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
				extraData={selectedIds}
			/>
		</>
	);
}

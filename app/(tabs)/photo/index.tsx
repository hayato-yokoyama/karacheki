import { LinearGradient } from "@tamagui/linear-gradient";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import * as Linking from "expo-linking";
import { Link, useRouter } from "expo-router";
import { Check, ChevronRight, Columns2, ImagePlus } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, Image, SectionList, useWindowDimensions } from "react-native";
import { SizableText, Spinner, useTheme, View, XStack, YStack } from "tamagui";
import {
	SAVED_TO_CAMERA_ROLL_MESSAGE,
	useSavePhotoToDevice,
} from "@/components/photo/useSavePhotoToDevice";
import {
	BottomActionBar,
	PrimaryButton,
	Screen,
	ScreenHeader,
	ScreenScrollView,
	SecondaryButton,
	useScreenPaddingTop,
	useToast,
} from "@/components/ui";
import type { BodyPhoto, PickedPhoto } from "@/services/bodyPhotoService";
import {
	CameraPermissionDeniedError,
	deleteBodyPhoto,
	getBodyPhotoUri,
	groupBodyPhotosByMonth,
	listBodyPhotos,
	pickBodyPhoto,
	takeBodyPhoto,
} from "@/services/bodyPhotoService";
import { layout, radius } from "@/theme/designTokens";

/** セル同士の間隔。縦横とも同じ */
const CELL_GAP = 8;
const COLUMN_COUNT = 3;
/** セルの縦横比。全身写真に合わせた縦長 */
const CELL_ASPECT_RATIO = 3 / 4;
/** 比較で選べる枚数 */
const COMPARE_COUNT = 2;

/**
 * 月のかたまり同士の間隔
 *
 * デザインは 30px。最後の行が持つ `CELL_GAP` ぶんの下余白と足して 30px にする
 */
const SECTION_GAP = 30 - CELL_GAP;

/** 月の見出し。画面タイトルより小さく、カードの見出しより大きい */
const MONTH_TITLE_SIZE = 16;

/** セルの日付を読めるようにするため、下端に敷く黒へのグラデーション */
const CELL_SCRIM_HEIGHT = 44;
const CELL_SCRIM_COLORS: string[] = ["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"];

/** 選択済みを示す丸チェック */
const CHECK_BADGE_SIZE = 26;
/**
 * 選択済みのセルの外側に出すリング
 *
 * 色は丸チェックの地（`$accentFill`）ではなく `$accent`。
 * ダークでは `$accent` の方が明るく、写真の上でも線として見える
 */
const SELECTED_RING_WIDTH = 3;

/** 「比較」「キャンセル」など、主要ボタンの隣に置く控えめなボタンの幅 */
const SECONDARY_BUTTON_WIDTH = 116;

/** 写真が無いときに並べる BEFORE / AFTER の枠 */
const EMPTY_FRAME_HEIGHT = 228;
const EMPTY_FRAME_BORDER_WIDTH = 2;
/** 2 つの枠の境目に置く丸 */
const EMPTY_ARROW_SIZE = 32;

/** 選択モードのラベル。あと何枚選べばいいのかを出す */
const getSelectingLabel = (selectedCount: number) => {
	if (selectedCount === 0) {
		return `${COMPARE_COUNT}枚選んでください`;
	}

	if (selectedCount < COMPARE_COUNT) {
		return `あと${COMPARE_COUNT - selectedCount}枚選んでください`;
	}

	return `${selectedCount}枚選択中`;
};

/** 3 列のグリッドに並べるため、月ごとの写真を行に切り分ける */
const toRows = (photos: readonly BodyPhoto[]) => {
	const rows: BodyPhoto[][] = [];

	for (let index = 0; index < photos.length; index += COLUMN_COUNT) {
		rows.push(photos.slice(index, index + COLUMN_COUNT));
	}

	return rows;
};

export default function Photos() {
	const theme = useTheme();
	const router = useRouter();
	const { width } = useWindowDimensions();
	const paddingTop = useScreenPaddingTop();
	const queryClient = useQueryClient();

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

	/** 月ごとに区切って、さらに 3 列の行に切り分けたセクション */
	const sections = useMemo(
		() =>
			groupBodyPhotosByMonth(photos ?? []).map((month) => ({
				key: month.key,
				label: month.label,
				count: month.photos.length,
				data: toRows(month.photos),
			})),
		[photos],
	);

	const { showToast, toast } = useToast();

	// 長押しメニューの「端末に保存」（#66）
	const { savePhotoToDevice } = useSavePhotoToDevice({
		onSaved: () => showToast(SAVED_TO_CAMERA_ROLL_MESSAGE),
	});

	// 長押しメニューの「削除」（#66）
	const { mutate: removePhoto } = useMutation({
		mutationFn: (id: string) => deleteBodyPhoto(id),
		onSuccess: () =>
			queryClient.invalidateQueries({ queryKey: ["bodyPhotos"] }),
		onError: () => {
			Alert.alert("エラー", "写真の削除に失敗しました");
		},
	});

	/** 詳細画面の削除と同じく、元に戻せないので確かめてから消す */
	const handleDeletePhoto = useCallback(
		(id: string) => {
			Alert.alert("写真を削除しますか？", "削除した写真は元に戻せません。", [
				{ text: "キャンセル", style: "cancel" },
				{
					text: "削除",
					style: "destructive",
					onPress: () => removePhoto(id),
				},
			]);
		},
		[removePhoto],
	);

	/** 選んだ・撮った写真をトリミング画面へ渡す */
	const goToCrop = useCallback(
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

	/** カメラで1枚撮る */
	const handleTakePhoto = useCallback(async () => {
		try {
			const taken = await takeBodyPhoto();

			if (taken) {
				goToCrop(taken);
			}
		} catch (error) {
			// 一度拒否すると OS はもうダイアログを出さないので、設定へ送り出す
			if (error instanceof CameraPermissionDeniedError) {
				Alert.alert(
					"カメラを使えません",
					"設定アプリからカメラへのアクセスを許可してください。",
					[
						{ text: "キャンセル", style: "cancel" },
						{ text: "設定を開く", onPress: () => Linking.openSettings() },
					],
				);
				return;
			}

			// 原因を決めつけず、切り分けできるよう内容はログに残す
			console.error(error);
			Alert.alert("エラー", "写真を撮れませんでした");
		}
	}, [goToCrop]);

	/** フォトライブラリから1枚選ぶ */
	const handlePickPhoto = useCallback(async () => {
		try {
			const picked = await pickBodyPhoto();

			if (picked) {
				goToCrop(picked);
			}
		} catch (error) {
			// 原因を決めつけず、切り分けできるよう内容はログに残す
			console.error(error);
			Alert.alert("エラー", "写真を選べませんでした");
		}
	}, [goToCrop]);

	/** 撮るか、ライブラリから選ぶかを尋ねる */
	const handlePressAdd = useCallback(() => {
		Alert.alert("写真を追加", undefined, [
			{ text: "撮影する", onPress: handleTakePhoto },
			{ text: "ライブラリから選ぶ", onPress: handlePickPhoto },
			{ text: "キャンセル", style: "cancel" },
		]);
	}, [handlePickPhoto, handleTakePhoto]);

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
		(width -
			layout.screenPaddingHorizontal * 2 -
			CELL_GAP * (COLUMN_COUNT - 1)) /
		COLUMN_COUNT;
	const cellHeight = cellWidth / CELL_ASPECT_RATIO;

	// 2枚そろったら、選び直す以外の操作をさせない
	const isSelectionFull = isSelecting && selectedCount >= COMPARE_COUNT;

	const renderRow = useCallback(
		({ item: row }: { item: BodyPhoto[] }) => (
			<XStack gap={CELL_GAP} marginBottom={CELL_GAP}>
				{row.map((photo) => {
					const isSelected = selectedPhotos.some(
						(selected) => selected.id === photo.id,
					);

					return (
						<PhotoCell
							key={photo.id}
							photo={photo}
							width={cellWidth}
							height={cellHeight}
							isSelecting={isSelecting}
							isSelected={isSelected}
							isDisabled={isSelectionFull && !isSelected}
							onPress={() => handlePressCell(photo.id)}
							onSaveToDevice={() => savePhotoToDevice(photo)}
							onDelete={() => handleDeletePhoto(photo.id)}
						/>
					);
				})}
			</XStack>
		),
		[
			cellHeight,
			cellWidth,
			handleDeletePhoto,
			handlePressCell,
			isSelecting,
			isSelectionFull,
			savePhotoToDevice,
			selectedPhotos,
		],
	);

	const label = isSelecting
		? getSelectingLabel(selectedCount)
		: `${photos?.length ?? 0}枚の記録`;
	const title = isSelecting ? "比較する写真を選ぶ" : "Before/After";

	if (isLoading) {
		return (
			<Screen>
				<ScreenScrollView>
					{/* 枚数が確定していないので、一瞬だけ「0枚の記録」と出さないようラベルは伏せる */}
					<ScreenHeader title={title} />
					<YStack height={400} alignItems="center" justifyContent="center">
						<Spinner size="small" />
					</YStack>
				</ScreenScrollView>
			</Screen>
		);
	}

	if (error) {
		return (
			<Screen>
				<ScreenScrollView>
					<ScreenHeader label={label} title={title} />
					<SizableText fontSize={14} lineHeight={23} color="$textMuted">
						写真を読み込めませんでした。
					</SizableText>
				</ScreenScrollView>
			</Screen>
		);
	}

	// 1枚も保存されていないとき
	if (!photos || photos.length === 0) {
		return (
			<Screen>
				<ScreenScrollView withBottomAction>
					<ScreenHeader label={label} title={title} />
					<EmptyPhotoGuide />
				</ScreenScrollView>
				<BottomActionBar>
					<PrimaryButton
						icon={
							<ImagePlus
								color={theme.onAccentFill.val}
								size={20}
								strokeWidth={2.2}
							/>
						}
						onPress={handlePressAdd}
					>
						写真を追加する
					</PrimaryButton>
				</BottomActionBar>
			</Screen>
		);
	}

	// 1枚しかなければ比較は成り立たないので、条件が揃うまで入り口を出さない
	const canCompare = photos.length >= COMPARE_COUNT;

	return (
		<Screen>
			<SectionList
				sections={sections}
				keyExtractor={(row) => row[0].id}
				renderItem={renderRow}
				renderSectionHeader={({ section }) => (
					<MonthHeader
						label={section.label}
						count={section.count}
						isFirst={section.key === sections[0]?.key}
					/>
				)}
				// 月の見出しはデザインでは貼り付かないので、OS 既定の固定表示を切る
				stickySectionHeadersEnabled={false}
				ListHeaderComponent={
					<YStack marginBottom={layout.gap}>
						<ScreenHeader label={label} title={title} />
					</YStack>
				}
				contentContainerStyle={{
					paddingTop,
					paddingHorizontal: layout.screenPaddingHorizontal,
					// 最後の行が下部固定ボタンに隠れないようにする（`ScreenScrollView` と同じ）
					paddingBottom:
						layout.primaryButtonHeight +
						layout.primaryButtonGap * 2 +
						layout.gap,
				}}
				extraData={selectedPhotos}
			/>

			<BottomActionBar>
				{isSelecting ? (
					<>
						<SecondaryButton
							width={SECONDARY_BUTTON_WIDTH}
							onPress={handleCancelSelect}
						>
							キャンセル
						</SecondaryButton>
						<PrimaryButton
							disabled={selectedCount !== COMPARE_COUNT}
							icon={
								<Columns2
									color={
										selectedCount === COMPARE_COUNT
											? theme.onAccentFill.val
											: theme.textMuted.val
									}
									size={20}
									strokeWidth={2}
								/>
							}
							onPress={handlePressCompare}
						>
							比較する
						</PrimaryButton>
					</>
				) : (
					<>
						{canCompare && (
							<SecondaryButton
								width={SECONDARY_BUTTON_WIDTH}
								color="$accent"
								icon={
									<Columns2
										color={theme.accent.val}
										size={20}
										strokeWidth={2}
									/>
								}
								onPress={handleStartSelect}
							>
								比較
							</SecondaryButton>
						)}
						<PrimaryButton
							icon={
								<ImagePlus
									color={theme.onAccentFill.val}
									size={20}
									strokeWidth={2.2}
								/>
							}
							onPress={handlePressAdd}
						>
							写真を追加
						</PrimaryButton>
					</>
				)}
			</BottomActionBar>
			{toast}
		</Screen>
	);
}

/** 月の見出しと、その月の枚数 */
const MonthHeader = ({
	label,
	count,
	isFirst,
}: {
	label: string;
	count: number;
	isFirst: boolean;
}) => (
	<XStack
		paddingHorizontal={4}
		marginTop={isFirst ? 0 : SECTION_GAP}
		marginBottom={8}
		alignItems="flex-end"
		justifyContent="space-between"
	>
		<SizableText
			fontSize={MONTH_TITLE_SIZE}
			fontWeight="800"
			color="$textPrimary"
		>
			{label}
		</SizableText>
		<SizableText fontSize={12} color="$textMuted">
			{count}枚
		</SizableText>
	</XStack>
);

type PhotoCellProps = {
	photo: BodyPhoto;
	width: number;
	height: number;
	isSelecting: boolean;
	isSelected: boolean;
	/** 2枚そろっていて、これ以上選べないセルかどうか */
	isDisabled: boolean;
	onPress: () => void;
	/** 長押しメニューの「端末に保存」 */
	onSaveToDevice: () => void;
	/** 長押しメニューの「削除」 */
	onDelete: () => void;
};

/**
 * 一覧のセル
 *
 * 選択モードでは右上に丸チェックが出て、選んだセルには外側にリングが付く。
 * 2枚そろった後は、選べないセルを薄くして丸チェックも消す。
 * 選択モードでないときは、長押しで OS のコンテキストメニューを出す（#66）
 */
const PhotoCell = ({
	photo,
	width,
	height,
	isSelecting,
	isSelected,
	isDisabled,
	onPress,
	onSaveToDevice,
	onDelete,
}: PhotoCellProps) => {
	const theme = useTheme();
	const takenAt = new Date(photo.takenAt);

	const tile = (
		<View
			width={width}
			height={height}
			borderRadius={radius.tile}
			overflow="hidden"
			// 画像が読み込まれるまでの下地。写真で覆われるので単色で足りる
			backgroundColor="$photoPlaceholderStart"
			opacity={isDisabled ? 0.5 : 1}
			// Tamagui は tabIndex が 0 のときしか accessible を補わないので自分で付ける。
			// 付けないと VoiceOver がボタンとして拾わず、ラベルも読まれない
			accessible
			accessibilityRole="button"
			accessibilityLabel={`${format(takenAt, "yyyy年M月d日")}の写真`}
			accessibilityState={
				isSelecting ? { selected: isSelected, disabled: isDisabled } : undefined
			}
			pressStyle={{ opacity: isDisabled ? 0.5 : 0.85 }}
			// 選択モードでないときの遷移は、包んでいる Link が受け持つ
			onPress={isSelecting && !isDisabled ? onPress : undefined}
		>
			<Image
				source={{ uri: getBodyPhotoUri(photo) }}
				style={{ width, height }}
				resizeMode="cover"
			/>
			<LinearGradient
				colors={CELL_SCRIM_COLORS}
				position="absolute"
				left={0}
				right={0}
				bottom={0}
				height={CELL_SCRIM_HEIGHT}
				pointerEvents="none"
			/>
			{/* セルが狭いので、日付は数値書体（Barlow Condensed）ではなく本文書体で出す */}
			<SizableText
				position="absolute"
				left={10}
				bottom={8}
				fontSize={13}
				lineHeight={16}
				fontWeight="700"
				color="$onHero"
			>
				{format(takenAt, "M/d")}
			</SizableText>
			{isSelecting && !isDisabled && (
				<View
					position="absolute"
					right={8}
					top={8}
					width={CHECK_BADGE_SIZE}
					height={CHECK_BADGE_SIZE}
					borderRadius={CHECK_BADGE_SIZE / 2}
					borderWidth={2}
					borderColor={isSelected ? "$onHero" : "rgba(255,255,255,0.85)"}
					backgroundColor={isSelected ? "$accentFill" : "rgba(0,0,0,0.18)"}
					alignItems="center"
					justifyContent="center"
				>
					{isSelected && (
						<Check color={theme.onHero.val} size={15} strokeWidth={3} />
					)}
				</View>
			)}
		</View>
	);

	return (
		<View width={width}>
			{isSelecting ? (
				tile
			) : (
				// 長押しのプレビューは出さず、セルそのものを浮かせてメニューを添える。
				// 「写真を見る」はタップと同じく詳細へ進む
				<Link href={`/(tabs)/photo/${photo.id}`} asChild>
					<Link.Trigger>{tile}</Link.Trigger>
					<Link.Menu>
						<Link.MenuAction
							icon="square.and.arrow.down"
							onPress={onSaveToDevice}
						>
							端末に保存
						</Link.MenuAction>
						<Link.MenuAction icon="photo" onPress={onPress}>
							写真を見る
						</Link.MenuAction>
						<Link.MenuAction icon="trash" destructive onPress={onDelete}>
							削除
						</Link.MenuAction>
					</Link.Menu>
				</Link>
			)}
			{/* リングはセルの外側に出すので、角丸を切る入れ物の外に重ねる */}
			{isSelected && (
				<View
					pointerEvents="none"
					position="absolute"
					top={-SELECTED_RING_WIDTH}
					left={-SELECTED_RING_WIDTH}
					right={-SELECTED_RING_WIDTH}
					bottom={-SELECTED_RING_WIDTH}
					borderWidth={SELECTED_RING_WIDTH}
					borderColor="$accent"
					borderRadius={radius.tile + SELECTED_RING_WIDTH}
				/>
			)}
		</View>
	);
};

/**
 * 写真が1枚も無いときの案内
 *
 * 破線の BEFORE / AFTER の枠で、これから何が並ぶのかを見せる
 */
const EmptyPhotoGuide = () => {
	const theme = useTheme();

	return (
		<>
			<XStack gap={CELL_GAP} marginTop={24}>
				<EmptyFrame label="BEFORE" tone="before" />
				<EmptyFrame label="AFTER" tone="after" />
				<View
					position="absolute"
					left="50%"
					top="50%"
					marginLeft={-EMPTY_ARROW_SIZE / 2}
					marginTop={-EMPTY_ARROW_SIZE / 2}
					width={EMPTY_ARROW_SIZE}
					height={EMPTY_ARROW_SIZE}
					borderRadius={EMPTY_ARROW_SIZE / 2}
					borderWidth={1.5}
					borderStyle="dashed"
					borderColor="$graphPlaceholder"
					backgroundColor="$screenBackground"
					alignItems="center"
					justifyContent="center"
				>
					<ChevronRight
						color={theme.textMuted.val}
						size={16}
						strokeWidth={2.2}
					/>
				</View>
			</XStack>

			<YStack paddingTop={8} paddingHorizontal={8} gap={10} alignItems="center">
				<SizableText
					fontSize={22}
					lineHeight={30}
					fontWeight="800"
					color="$textPrimary"
					textAlign="center"
				>
					写真を追加しましょう
				</SizableText>
				<SizableText
					fontSize={14}
					lineHeight={23}
					color="$textMuted"
					textAlign="center"
				>
					同じ場所・同じポーズで撮った写真を残しておくと、体重の数字だけでは分からない変化に気づけます。
				</SizableText>
			</YStack>
		</>
	);
};

/** 写真が無いときに置く、破線の枠 1 つ */
const EmptyFrame = ({
	label,
	tone,
}: {
	label: string;
	tone: "before" | "after";
}) => {
	const theme = useTheme();

	return (
		<View
			flex={1}
			height={EMPTY_FRAME_HEIGHT}
			borderRadius={radius.card}
			borderWidth={EMPTY_FRAME_BORDER_WIDTH}
			borderStyle="dashed"
			borderColor="$graphPlaceholder"
			alignItems="center"
			justifyContent="center"
		>
			<SizableText
				position="absolute"
				left={10}
				top={10}
				height={24}
				paddingHorizontal={10}
				lineHeight={24}
				borderRadius={12}
				fontFamily="$numeric"
				fontSize={14}
				fontWeight="700"
				letterSpacing={1.12}
				backgroundColor={tone === "before" ? "$segmentTrack" : "$accentSoft"}
				color={tone === "before" ? "$textMuted" : "$accent"}
			>
				{label}
			</SizableText>
			<ImagePlus
				color={theme.graphPlaceholder.val}
				size={32}
				strokeWidth={1.5}
			/>
		</View>
	);
};

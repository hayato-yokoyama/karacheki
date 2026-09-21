import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Plus, Table } from "lucide-react-native";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert, FlatList } from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import {
	Paragraph,
	SizableText,
	Spinner,
	useTheme,
	XStack,
	YStack,
} from "tamagui";
import {
	LIFT_EXERCISE_SEGMENTS,
	LiftBestHero,
	LiftRecordDetailSheet,
	LiftRecordRow,
} from "@/components/lift";
import { SegmentedControl } from "@/components/segmentedControl";
import {
	BottomActionBar,
	PrimaryButton,
	Screen,
	ScreenHeader,
	useScreenPaddingTop,
} from "@/components/ui";
import { formatFullDate, formatSet } from "@/services/liftFormat";
import {
	deleteLiftRecord,
	listLiftRecords,
} from "@/services/liftRecordService";
import {
	getLiftBest,
	getLiftPr,
	isLiftExercise,
	type LiftRecord,
} from "@/services/oneRepMax";
import { layout, typography } from "@/theme/designTokens";

/** 換算表を開くボタンの高さ */
const TABLE_BUTTON_HEIGHT = layout.touchTargetHeight;

/**
 * BIG3 の一覧（#81）
 *
 * 自己ベストをヒーローとして切り出し、その下に記録を並べる
 */
export default function Lift() {
	const router = useRouter();
	const queryClient = useQueryClient();
	const paddingTop = useScreenPaddingTop();

	/**
	 * 表示中の種目
	 *
	 * 画面の state ではなく遷移のパラメータで持つ。追加画面から戻ったときに、
	 * 記録した種目のタブに必ず着地させるため
	 */
	const { exercise: exerciseParam } = useLocalSearchParams<{
		exercise?: string;
	}>();
	const exercise = isLiftExercise(exerciseParam) ? exerciseParam : "benchPress";

	/** 記録の詳細を開いている記録の ID */
	const [selectedId, setSelectedId] = useState<string>();

	const {
		data: records,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["liftRecords"],
		queryFn: listLiftRecords,
	});

	const exerciseRecords = useMemo(
		() => (records ?? []).filter((record) => record.exercise === exercise),
		[records, exercise],
	);

	// 自己ベストは保存せず記録から導出する。削除しても古い値が残らない
	const pr = useMemo(
		() => getLiftPr(records ?? [], exercise),
		[records, exercise],
	);
	const best = useMemo(
		() => getLiftBest(records ?? [], exercise),
		[records, exercise],
	);

	const selectedRecord = exerciseRecords.find(
		(record) => record.id === selectedId,
	);

	/**
	 * スワイプで開いている行
	 *
	 * 削除を取り消したときだけでなく、確認を枠外で閉じたときや削除に失敗したときも
	 * 開きっぱなしにしないよう、開いた行を覚えておいて閉じにいく
	 */
	const openedSwipeable = useRef<SwipeableMethods>(undefined);

	const closeOpenedSwipeable = useCallback(() => {
		openedSwipeable.current?.close();
		openedSwipeable.current = undefined;
	}, []);

	const { mutate: removeRecord } = useMutation({
		mutationFn: (id: string) => deleteLiftRecord(id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["liftRecords"] });
		},
		onError: () => {
			closeOpenedSwipeable();
			Alert.alert("エラー", "記録の削除に失敗しました");
		},
	});

	/**
	 * 削除の前に確認する
	 *
	 * 自己ベストはそう何度も更新できるものではないので、消すのは例外的な操作になる。
	 * スワイプが意図せず最後まで進んだときに、確認なしで消えるのは割に合わない
	 */
	const confirmDelete = useCallback(
		(record: LiftRecord) => {
			Alert.alert(
				"記録を削除しますか？",
				`${formatFullDate(record.performedAt)}  ${formatSet(record)}\n削除した記録は元に戻せません。`,
				[
					{
						text: "キャンセル",
						style: "cancel",
						// 開いたままだと次の操作の邪魔になる
						onPress: closeOpenedSwipeable,
					},
					{
						text: "削除",
						style: "destructive",
						onPress: () => removeRecord(record.id),
					},
				],
				// Android は枠外タップや戻るで閉じられ、どのボタンも押されないことがある
				{ cancelable: true, onDismiss: closeOpenedSwipeable },
			);
		},
		[removeRecord, closeOpenedSwipeable],
	);

	const handleSwipeDelete = useCallback(
		(record: LiftRecord, swipeable: SwipeableMethods) => {
			openedSwipeable.current = swipeable;
			confirmDelete(record);
		},
		[confirmDelete],
	);

	const handleDeleteFromDetail = useCallback(
		(record: LiftRecord) => {
			setSelectedId(undefined);
			confirmDelete(record);
		},
		[confirmDelete],
	);

	const handleEdit = useCallback(
		(record: LiftRecord) => {
			setSelectedId(undefined);
			router.push({
				pathname: "/(tabs)/lift/add",
				params: { exercise, id: record.id },
			});
		},
		[router, exercise],
	);

	const renderItem = useCallback(
		({ item }: { item: LiftRecord }) => (
			<LiftRecordRow
				record={item}
				pr={pr}
				onPress={() => setSelectedId(item.id)}
				onPressDelete={(swipeable) => handleSwipeDelete(item, swipeable)}
			/>
		),
		[pr, handleSwipeDelete],
	);

	const header = (
		<ScreenHeader
			label="自己ベストと記録"
			title="BIG3"
			right={
				<XStack
					height={TABLE_BUTTON_HEIGHT}
					alignItems="center"
					gap={6}
					paddingLeft={12}
					paddingRight={14}
					borderRadius={TABLE_BUTTON_HEIGHT / 2}
					borderWidth={1}
					borderColor="$cardBorder"
					backgroundColor="$cardBackground"
					pressStyle={{ opacity: 0.7 }}
					onPress={() =>
						router.push({
							pathname: "/(tabs)/lift/table",
							params: { exercise },
						})
					}
					accessibilityRole="button"
					accessibilityLabel="1RM換算表"
				>
					<TableIcon />
					<SizableText fontSize={13} fontWeight="600" color="$textMuted">
						1RM換算表
					</SizableText>
				</XStack>
			}
		/>
	);

	if (isLoading) {
		return (
			<Screen
				paddingTop={paddingTop}
				paddingHorizontal={layout.screenPaddingHorizontal}
			>
				{header}
				<YStack flex={1} alignItems="center" justifyContent="center">
					<Spinner size="small" />
				</YStack>
			</Screen>
		);
	}

	// 記録が消えたと誤解させないよう、読み込みの失敗は空状態と区別して出す
	if (error) {
		return (
			<Screen
				paddingTop={paddingTop}
				paddingHorizontal={layout.screenPaddingHorizontal}
			>
				{header}
				<Paragraph color="$textPrimary">記録を読み込めませんでした。</Paragraph>
			</Screen>
		);
	}

	const hasRecords = exerciseRecords.length > 0;

	return (
		<Screen>
			<FlatList
				data={exerciseRecords}
				keyExtractor={(record) => record.id}
				renderItem={renderItem}
				// 画面いっぱいに広げないと、行が下にあふれてスクロールできなくなる
				style={{ flex: 1 }}
				contentContainerStyle={{
					paddingTop,
					paddingHorizontal: layout.screenPaddingHorizontal,
					// 最後の行が下部固定ボタンに隠れないだけの余白を足す
					paddingBottom:
						layout.primaryButtonHeight +
						layout.primaryButtonGap * 2 +
						layout.gap,
					gap: layout.gap,
				}}
				ListHeaderComponent={
					<YStack gap={layout.gap}>
						{header}
						<SegmentedControl
							options={LIFT_EXERCISE_SEGMENTS}
							value={exercise}
							onChange={(value) => router.setParams({ exercise: value })}
						/>
						<LiftBestHero exercise={exercise} best={best} />
						{hasRecords && (
							<XStack
								alignItems="baseline"
								justifyContent="space-between"
								paddingTop={6}
								paddingHorizontal={4}
							>
								<SizableText
									fontSize={typography.sectionTitle.fontSize}
									lineHeight={typography.sectionTitle.lineHeight}
									fontWeight={typography.sectionTitle.fontWeight}
									color="$textPrimary"
								>
									記録
								</SizableText>
								<SizableText fontSize={12} color="$textMuted">
									{exerciseRecords.length}件
								</SizableText>
							</XStack>
						)}
					</YStack>
				}
			/>

			<BottomActionBar>
				<PrimaryButton
					icon={<AddIcon />}
					onPress={() =>
						router.push({
							pathname: "/(tabs)/lift/add",
							params: { exercise },
						})
					}
				>
					{hasRecords ? "記録を追加" : "最初の記録を追加"}
				</PrimaryButton>
			</BottomActionBar>

			<LiftRecordDetailSheet
				record={selectedRecord}
				onClose={() => setSelectedId(undefined)}
				onPressEdit={handleEdit}
				onPressDelete={handleDeleteFromDetail}
			/>
		</Screen>
	);
}

/** 換算表ボタンのアイコン */
const TableIcon = () => {
	const theme = useTheme();

	return <Table size={18} color={theme.textMuted.val} strokeWidth={1.9} />;
};

/** 下部固定ボタンのアイコン */
const AddIcon = () => {
	const theme = useTheme();

	return <Plus size={20} color={theme.onAccentFill.val} strokeWidth={2.2} />;
};

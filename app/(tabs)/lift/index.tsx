import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Stack, useRouter } from "expo-router";
import { Plus, Trophy } from "lucide-react-native";
import { type ReactNode, useCallback, useMemo, useState } from "react";
import { Alert, FlatList } from "react-native";
import {
	Button,
	Card,
	Paragraph,
	SizableText,
	Spinner,
	useTheme,
	XStack,
	YStack,
} from "tamagui";
import { LiftExerciseTabs } from "@/components/liftExerciseTabs";
import {
	deleteLiftRecord,
	listLiftRecords,
} from "@/services/liftRecordService";
import {
	estimateOneRepMax,
	getLiftPr,
	type LiftExercise,
	type LiftPr,
	type LiftRecord,
	RM_FORMULA_LABEL,
	roundOneRepMax,
} from "@/services/oneRepMax";

/** PR バッジのアイコンサイズ */
const BADGE_ICON_SIZE = 14;

/** 一覧の左右の余白 */
const LIST_PADDING = 16;

/** 挙上重量の表示。入力した値をそのまま見せる */
const formatWeight = (weight: number) => `${weight.toFixed(1)}kg`;

/** 記録の内訳の表示 */
const formatSet = (record: LiftRecord) =>
	`${formatWeight(record.weight)} × ${record.reps}`;

/** 推定 1RM の表示。整数に丸めてから出す */
const formatEstimated = (record: LiftRecord) =>
	`${roundOneRepMax(estimateOneRepMax(record))}kg`;

export default function Lift() {
	const theme = useTheme();
	const router = useRouter();
	const queryClient = useQueryClient();

	/** 表示中の種目。最後に選んだ種目は覚えず、開くたびにベンチプレスから始める */
	const [exercise, setExercise] = useState<LiftExercise>("benchPress");

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

	// PR は保存せず記録から導出する。削除しても古い値が残らない
	const pr = useMemo(
		() => getLiftPr(records ?? [], exercise),
		[records, exercise],
	);

	const { mutate: removeRecord } = useMutation({
		mutationFn: (id: string) => deleteLiftRecord(id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["liftRecords"] });
		},
		onError: () => {
			Alert.alert("エラー", "記録の削除に失敗しました");
		},
	});

	/** 誤入力した記録を消せるようにする。編集はないので、消して入れ直してもらう */
	const handleLongPressRecord = useCallback(
		(record: LiftRecord) => {
			Alert.alert(
				"記録を削除しますか？",
				`${record.performedAt}  ${formatSet(record)}\n削除した記録は元に戻せません。`,
				[
					{ text: "キャンセル", style: "cancel" },
					{
						text: "削除",
						style: "destructive",
						onPress: () => removeRecord(record.id),
					},
				],
			);
		},
		[removeRecord],
	);

	const renderItem = useCallback(
		({ item }: { item: LiftRecord }) => (
			<LiftRecordRow
				record={item}
				pr={pr}
				onLongPress={() => handleLongPressRecord(item)}
			/>
		),
		[pr, handleLongPressRecord],
	);

	const screenOptions = {
		title: "BIG3",
		headerStyle: { backgroundColor: theme.background0.val },
		headerRight: () => (
			<Button
				size="$2"
				icon={<Plus />}
				chromeless
				onPress={() => router.push("/(tabs)/lift/add")}
			>
				記録
			</Button>
		),
	};

	if (isLoading) {
		return (
			<>
				<Stack.Screen options={screenOptions} />
				<YStack flex={1} alignItems="center" justifyContent="center">
					<Spinner size="small" />
				</YStack>
			</>
		);
	}

	// 記録が消えたと誤解させないよう、読み込みの失敗は空状態と区別して出す
	if (error) {
		return (
			<>
				<Stack.Screen options={screenOptions} />
				<YStack paddingVertical="$8" paddingHorizontal="$4">
					<Paragraph>記録を読み込めませんでした。</Paragraph>
				</YStack>
			</>
		);
	}

	return (
		<>
			<Stack.Screen options={screenOptions} />
			<FlatList
				data={exerciseRecords}
				keyExtractor={(record) => record.id}
				renderItem={renderItem}
				contentContainerStyle={{ padding: LIST_PADDING }}
				ListHeaderComponent={
					<YStack gap="$4" paddingBottom="$4">
						<LiftExerciseTabs exercise={exercise} onChange={setExercise} />

						{exerciseRecords.length === 0 ? (
							<EmptyRecords />
						) : (
							<>
								<PrCards exercise={exercise} pr={pr} />
								<XStack alignItems="baseline" justifyContent="space-between">
									<SizableText size="$5" fontWeight="bold">
										記録
									</SizableText>
									{/* 長押し以外に削除の入口がないので、そこにあることだけは伝える */}
									<SizableText size="$1" color="$color11">
										長押しで削除
									</SizableText>
								</XStack>
							</>
						)}
					</YStack>
				}
			/>
		</>
	);
}

/** まだ記録がない種目の表示 */
const EmptyRecords = () => (
	<YStack paddingVertical="$8" alignItems="center" gap="$4">
		<Paragraph>まだ記録がありません。</Paragraph>
		<Link href="/(tabs)/lift/add" asChild>
			<Button icon={<Plus />}>記録を追加</Button>
		</Link>
	</YStack>
);

/** 自己ベストのカード */
const PrCards = ({ exercise, pr }: { exercise: LiftExercise; pr: LiftPr }) => {
	const { actual, estimated } = pr;

	/** 実測が最も高いと 2 枚が同じ記録になる。同じ数字を 2 回出さず 1 枚にまとめる */
	const isSameRecord =
		actual !== undefined &&
		estimated !== undefined &&
		actual.id === estimated.id;

	return (
		<YStack gap="$2">
			{isSameRecord ? (
				<PrCard title="実測PR = 換算PR" value={formatWeight(actual.weight)}>
					<SizableText size="$2" color="$color11">
						{actual.performedAt}
					</SizableText>
				</PrCard>
			) : (
				<XStack gap="$2">
					<PrCard
						title="実測PR"
						value={actual ? formatWeight(actual.weight) : undefined}
						emptyMessage="1 レップの記録がまだありません"
					>
						{actual && (
							<SizableText size="$2" color="$color11">
								{actual.performedAt}
							</SizableText>
						)}
					</PrCard>
					<PrCard
						title="換算PR"
						value={estimated ? formatEstimated(estimated) : undefined}
					>
						{estimated && (
							<>
								{/* 元のセットを併記しないと、推定値の出どころが見えない */}
								<SizableText size="$2" color="$color11">
									{formatSet(estimated)}
								</SizableText>
								<SizableText size="$2" color="$color11">
									{estimated.performedAt}
								</SizableText>
							</>
						)}
					</PrCard>
				</XStack>
			)}

			{/* 推定値が何から出ているかを、隠さず小さく置いておく */}
			<YStack paddingHorizontal="$1">
				<SizableText size="$1" color="$color11">
					1RM = 1回だけ挙げられる重量の推定値
				</SizableText>
				<SizableText size="$1" color="$color11">
					{RM_FORMULA_LABEL[exercise]}
				</SizableText>
			</YStack>
		</YStack>
	);
};

const PrCard = ({
	title,
	value,
	emptyMessage,
	children,
}: {
	title: string;
	value?: string;
	emptyMessage?: string;
	children?: ReactNode;
}) => (
	<Card flex={1} padding="$3">
		<YStack gap="$1">
			<SizableText size="$2" color="$color11">
				{title}
			</SizableText>
			{value ? (
				<>
					<SizableText size="$8" fontWeight="bold">
						{value}
					</SizableText>
					{children}
				</>
			) : (
				<Paragraph size="$2">{emptyMessage}</Paragraph>
			)}
		</YStack>
	</Card>
);

/**
 * その記録が PR なら付けるラベルを返す
 *
 * 実測と換算が同じ記録のときにバッジを 2 つ並べても同じ事実の繰り返しにしかならない
 */
const getPrBadgeLabel = (record: LiftRecord, pr: LiftPr) => {
	const isActualPr = pr.actual?.id === record.id;
	const isEstimatedPr = pr.estimated?.id === record.id;

	if (isActualPr && isEstimatedPr) {
		return "実測=換算PR";
	}

	if (isActualPr) {
		return "実測PR";
	}

	return isEstimatedPr ? "換算PR" : null;
};

/** 記録一覧の 1 行 */
const LiftRecordRow = ({
	record,
	pr,
	onLongPress,
}: {
	record: LiftRecord;
	pr: LiftPr;
	onLongPress: () => void;
}) => {
	const theme = useTheme();
	const badgeLabel = getPrBadgeLabel(record, pr);

	return (
		<XStack
			paddingVertical="$3"
			alignItems="center"
			gap="$3"
			borderBottomWidth={1}
			borderBottomColor="$borderColor"
			onLongPress={onLongPress}
		>
			<SizableText size="$3" color="$color11">
				{record.performedAt}
			</SizableText>
			<SizableText size="$4" fontWeight="bold">
				{formatSet(record)}
			</SizableText>
			{badgeLabel && (
				<XStack alignItems="center" gap="$1">
					<Trophy size={BADGE_ICON_SIZE} color={theme.accentColor.val} />
					<SizableText size="$2" color="$accentColor">
						{badgeLabel}
					</SizableText>
				</XStack>
			)}
		</XStack>
	);
};

import RNDateTimePicker, {
	type DateTimePickerChangeEvent,
} from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, Check, Minus, Plus, Table, X } from "lucide-react-native";
import { type ReactNode, useState } from "react";
import { Alert, Platform } from "react-native";
import {
	Input,
	Paragraph,
	SizableText,
	Spinner,
	useTheme,
	XStack,
	YStack,
} from "tamagui";
import {
	BottomActionBar,
	NumberText,
	PrimaryButton,
	Screen,
	ScreenHeader,
	ScreenScrollView,
	SurfaceCard,
} from "@/components/ui";
import {
	formatEstimated,
	formatFullDate,
	formatWeight,
	isToday,
	parsePerformedAt,
} from "@/services/liftFormat";
import {
	addLiftRecord,
	listLiftRecords,
	updateLiftRecord,
} from "@/services/liftRecordService";
import {
	isLiftExercise,
	LIFT_EXERCISE_LABEL,
	type LiftExercise,
	type LiftRecord,
	MAX_REPS,
	RM_FORMULA_LABEL,
} from "@/services/oneRepMax";
import { layout, radius } from "@/theme/designTokens";

/** 選べるレップ数の下限 */
const MIN_REPS = 1;

/**
 * レップ数の初期値
 *
 * 1 を初期値にすると、押し忘れたまま保存したときに 1 レップの記録として残り、
 * 「本当に挙げられる重量」であるはずの実測 1RM が汚れる
 */
const DEFAULT_REPS = 5;

/** 閉じるボタンの大きさ */
const CLOSE_BUTTON_SIZE = layout.touchTargetHeight;

/** レップ数の増減ボタンの大きさ */
const STEPPER_BUTTON_SIZE = 56;

/** 下部固定ボタン。一覧のものより一回り大きくして、入力の締めくくりにする */
const SAVE_BUTTON_HEIGHT = 56;

/**
 * 記録の追加と編集（#81）
 *
 * `id` を渡すとその記録の編集になる。入力するものは追加と同じなので画面を共通にする
 */
export default function Add() {
	const { exercise: exerciseParam, id } = useLocalSearchParams<{
		exercise?: string;
		id?: string;
	}>();

	/**
	 * 記録する種目
	 *
	 * 一覧で選んでいる種目をそのまま記録する。ここで種目を選べると、
	 * ベンチプレスの一覧を見ながらデッドリフトを足せてしまう
	 */
	const exercise = isLiftExercise(exerciseParam) ? exerciseParam : "benchPress";

	// 編集のときだけ、書き換える記録を読みに行く
	const {
		data: records,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["liftRecords"],
		queryFn: listLiftRecords,
		enabled: id !== undefined,
	});

	if (id === undefined) {
		return <LiftRecordForm exercise={exercise} />;
	}

	if (isLoading) {
		return (
			<Screen alignItems="center" justifyContent="center">
				<Spinner size="small" />
			</Screen>
		);
	}

	const record = records?.find((stored) => stored.id === id);

	// 読み込めなかっただけなのに「記録が無い」と見せないよう、失敗は分けて出す
	if (error || !record) {
		return (
			<Screen>
				<ScreenScrollView flex={1} withTabBar={false}>
					<ScreenHeader
						label={LIFT_EXERCISE_LABEL[exercise]}
						title="記録を編集"
						right={<CloseButton />}
					/>
					<Paragraph color="$textPrimary">
						{error
							? "記録を読み込めませんでした。"
							: "編集する記録が見つかりませんでした。"}
					</Paragraph>
				</ScreenScrollView>
			</Screen>
		);
	}

	return <LiftRecordForm exercise={record.exercise} record={record} />;
}

/** 記録の入力フォーム */
const LiftRecordForm = ({
	exercise,
	record,
}: {
	exercise: LiftExercise;
	/** 渡すと編集になる */
	record?: LiftRecord;
}) => {
	const router = useRouter();
	const queryClient = useQueryClient();
	const theme = useTheme();

	const [weight, setWeight] = useState(
		record ? formatWeight(record.weight) : "",
	);
	const [reps, setReps] = useState(record?.reps ?? DEFAULT_REPS);
	const [performedAt, setPerformedAt] = useState(
		record ? parsePerformedAt(record.performedAt) : new Date(),
	);
	const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

	const weightNumber = Number(weight);
	// 記録を消す以外に直す手段がない値なので、あり得ない値は保存させない
	const canSave =
		weight !== "" && Number.isFinite(weightNumber) && weightNumber > 0;

	const { mutate: saveRecord, isPending } = useMutation({
		mutationFn: () =>
			record
				? updateLiftRecord({
						id: record.id,
						weight: weightNumber,
						reps,
						performedAt,
					})
				: addLiftRecord({
						exercise,
						weight: weightNumber,
						reps,
						performedAt,
					}),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["liftRecords"] });
			router.back();
		},
		onError: () => {
			Alert.alert("エラー", "記録の保存に失敗しました");
		},
	});

	// 押せないときは地が `$segmentTrack` に変わるので、アイコンも文字と同じ色にする
	const isDisabled = !canSave || isPending;
	const iconColor = isDisabled ? theme.textMuted.val : theme.onAccentFill.val;

	// v9 で date が必須になったため、存在チェックは不要
	const handleDateChange = (_event: DateTimePickerChangeEvent, date: Date) => {
		setPerformedAt(date);

		// Android はダイアログで出るので、選び終わったら閉じる
		if (Platform.OS !== "ios") {
			setIsDatePickerOpen(false);
		}
	};

	return (
		<Screen>
			<ScreenScrollView
				flex={1}
				withTabBar={false}
				withBottomAction
				// 重量は decimal-pad で確定キーが無い。下部固定ボタンがキーボードに
				// 隠れたままにならないよう、スクロールで閉じられるようにする
				keyboardDismissMode="on-drag"
				keyboardShouldPersistTaps="handled"
			>
				<ScreenHeader
					label={LIFT_EXERCISE_LABEL[exercise]}
					title={record ? "記録を編集" : "記録を追加"}
					right={<CloseButton />}
				/>

				<InputCard label="重量" hint="0.1kg 単位">
					<XStack alignItems="baseline" gap={8}>
						<Input
							flex={1}
							// 76px の数字が上下で切れないだけの行高を持たせる
							height={92}
							padding={0}
							borderWidth={0}
							backgroundColor="transparent"
							fontFamily="$numeric"
							fontSize={76}
							fontWeight="700"
							color="$textPrimary"
							placeholder="0.0"
							placeholderTextColor="$textPlaceholder"
							keyboardType="decimal-pad"
							value={weight}
							onChangeText={setWeight}
							accessibilityLabel="重量（kg）"
						/>
						<SizableText fontSize={22} fontWeight="500" color="$textMuted">
							kg
						</SizableText>
					</XStack>
				</InputCard>

				<InputCard label="レップ数" hint="1〜12">
					<XStack
						alignItems="center"
						justifyContent="space-between"
						paddingHorizontal={8}
					>
						<StepperButton
							label="レップ数を減らす"
							disabled={reps <= MIN_REPS}
							onPress={() => setReps(Math.max(MIN_REPS, reps - 1))}
						>
							<Minus
								size={24}
								color={theme.textPrimary.val}
								strokeWidth={2.2}
							/>
						</StepperButton>
						<NumberText fontSize={64} lineHeight={56}>
							{String(reps)}
						</NumberText>
						<StepperButton
							label="レップ数を増やす"
							disabled={reps >= MAX_REPS}
							onPress={() => setReps(Math.min(MAX_REPS, reps + 1))}
						>
							<Plus size={24} color={theme.textPrimary.val} strokeWidth={2.2} />
						</StepperButton>
					</XStack>
					{/* 1 レップだけ扱いが変わるので、押す前に知らせておく */}
					<SizableText
						fontSize={12}
						lineHeight={17}
						color="$textMuted"
						textAlign="center"
						marginTop={10}
					>
						1レップで記録すると、実測1RMとして扱われます
					</SizableText>
				</InputCard>

				<SurfaceCard paddingVertical={14} paddingHorizontal={16} gap={12}>
					<XStack
						height={36}
						alignItems="center"
						justifyContent="space-between"
					>
						<SizableText fontSize={14} fontWeight="700" color="$textPrimary">
							実施日
						</SizableText>
						<XStack
							alignItems="center"
							gap={8}
							height={36}
							paddingLeft={12}
							paddingRight={14}
							borderRadius={18}
							backgroundColor="$segmentTrack"
							pressStyle={{ opacity: 0.7 }}
							onPress={() => setIsDatePickerOpen(!isDatePickerOpen)}
							accessibilityRole="button"
							accessibilityLabel={`実施日 ${formatFullDate(performedAt)} を選ぶ`}
						>
							<Calendar
								size={18}
								color={theme.textMuted.val}
								strokeWidth={1.9}
							/>
							<NumberText weight="600" fontSize={20}>
								{formatFullDate(performedAt)}
							</NumberText>
							{isToday(performedAt) && (
								<SizableText fontSize={12} color="$textMuted">
									今日
								</SizableText>
							)}
						</XStack>
					</XStack>
					{isDatePickerOpen && (
						<RNDateTimePicker
							value={performedAt}
							mode="date"
							display={Platform.OS === "ios" ? "inline" : "default"}
							onValueChange={handleDateChange}
							locale="ja-JP"
						/>
					)}
				</SurfaceCard>

				<EstimatedPreview exercise={exercise} weight={weight} reps={reps} />

				{/* 何が起きる入力なのかを、保存する前に見せておく */}
				<SizableText
					fontSize={12}
					lineHeight={17}
					color="$textMuted"
					textAlign="center"
				>
					推定1RM ＝ {RM_FORMULA_LABEL[exercise]}
				</SizableText>
			</ScreenScrollView>

			<BottomActionBar withTabBar={false}>
				<PrimaryButton
					height={SAVE_BUTTON_HEIGHT}
					borderRadius={SAVE_BUTTON_HEIGHT / 2}
					fontSize={17}
					disabled={isDisabled}
					icon={
						record ? (
							<Check size={20} color={iconColor} strokeWidth={2.4} />
						) : (
							<Plus size={20} color={iconColor} strokeWidth={2.2} />
						)
					}
					onPress={() => {
						if (canSave) {
							saveRecord();
						}
					}}
				>
					{record ? "変更を保存" : "記録を追加"}
				</PrimaryButton>
			</BottomActionBar>
		</Screen>
	);
};

/** 見出しと補足を持つ入力のカード */
const InputCard = ({
	label,
	hint,
	children,
}: {
	label: string;
	/** 見出しの右に置く、入力の決まりごと */
	hint: string;
	children: ReactNode;
}) => (
	<SurfaceCard padding={16} gap={8}>
		<XStack height={20} alignItems="center" justifyContent="space-between">
			<SizableText fontSize={14} fontWeight="700" color="$textPrimary">
				{label}
			</SizableText>
			<SizableText fontSize={12} color="$textMuted">
				{hint}
			</SizableText>
		</XStack>
		{children}
	</SurfaceCard>
);

/** レップ数の増減ボタン */
const StepperButton = ({
	label,
	disabled,
	onPress,
	children,
}: {
	label: string;
	disabled: boolean;
	onPress: () => void;
	children: ReactNode;
}) => (
	<XStack
		width={STEPPER_BUTTON_SIZE}
		height={STEPPER_BUTTON_SIZE}
		borderRadius={STEPPER_BUTTON_SIZE / 2}
		backgroundColor="$segmentTrack"
		alignItems="center"
		justifyContent="center"
		opacity={disabled ? 0.4 : 1}
		pressStyle={{ opacity: disabled ? 0.4 : 0.7 }}
		onPress={disabled ? undefined : onPress}
		accessibilityRole="button"
		accessibilityLabel={label}
		accessibilityState={{ disabled }}
	>
		{children}
	</XStack>
);

/**
 * この記録の推定 1RM
 *
 * 保存したあとで一覧を見に行かなくても、入力した値が何 kg 換算なのかが分かるようにする
 */
const EstimatedPreview = ({
	exercise,
	weight,
	reps,
}: {
	exercise: LiftExercise;
	weight: string;
	reps: number;
}) => {
	const theme = useTheme();
	const weightNumber = Number(weight);
	const hasWeight =
		weight !== "" && Number.isFinite(weightNumber) && weightNumber > 0;

	return (
		<XStack
			alignItems="center"
			justifyContent="space-between"
			paddingVertical={14}
			paddingHorizontal={16}
			borderRadius={radius.card}
			// 枠線は常に持たせて色だけ変える。幅を出し入れすると入力の 1 文字目でカードが跳ねる
			borderWidth={1.5}
			borderStyle="dashed"
			borderColor={hasWeight ? "transparent" : "$textPlaceholder"}
			backgroundColor={hasWeight ? "$accentSoft" : "transparent"}
		>
			<YStack gap={2}>
				<XStack alignItems="center" gap={6}>
					<Table
						size={16}
						color={hasWeight ? theme.accent.val : theme.textMuted.val}
						strokeWidth={2}
					/>
					<SizableText
						fontSize={13}
						fontWeight="700"
						color={hasWeight ? "$accent" : "$textMuted"}
					>
						この記録の推定1RM
					</SizableText>
				</XStack>
				{!hasWeight && (
					<SizableText fontSize={12} color="$textMuted">
						重量を入力すると表示されます
					</SizableText>
				)}
			</YStack>

			{hasWeight ? (
				<XStack alignItems="baseline" gap={4}>
					<NumberText fontSize={52} lineHeight={52}>
						{formatEstimated({ exercise, weight: weightNumber, reps })}
					</NumberText>
					<SizableText fontSize={16} color="$textMuted">
						kg
					</SizableText>
				</XStack>
			) : (
				<NumberText fontSize={52} lineHeight={52} color="$textPlaceholder">
					–
				</NumberText>
			)}
		</XStack>
	);
};

/** 画面を閉じるボタン。モーダルで開くのでヘッダーの戻るではなく右上に置く */
const CloseButton = () => {
	const router = useRouter();
	const theme = useTheme();

	return (
		<XStack
			width={CLOSE_BUTTON_SIZE}
			height={CLOSE_BUTTON_SIZE}
			borderRadius={CLOSE_BUTTON_SIZE / 2}
			borderWidth={1}
			borderColor="$cardBorder"
			backgroundColor="$cardBackground"
			alignItems="center"
			justifyContent="center"
			pressStyle={{ opacity: 0.7 }}
			onPress={() => router.back()}
			accessibilityRole="button"
			accessibilityLabel="閉じる"
		>
			<X size={22} color={theme.textPrimary.val} strokeWidth={1.8} />
		</XStack>
	);
};

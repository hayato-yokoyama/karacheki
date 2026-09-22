import { Pencil, Trash2, X } from "lucide-react-native";
import { type ReactNode, useRef } from "react";
import { Button, SizableText, useTheme, XStack, YStack } from "tamagui";
import { BottomSheet, NumberText, PrimaryButton } from "@/components/ui";
import {
	formatEstimated,
	formatFullDate,
	formatWeight,
} from "@/services/liftFormat";
import { LIFT_EXERCISE_LABEL, type LiftRecord } from "@/services/oneRepMax";
import { layout } from "@/theme/designTokens";

/** 閉じるボタンの大きさ */
const CLOSE_BUTTON_SIZE = 36;

/** 明細の 1 行の高さ */
const DETAIL_ROW_HEIGHT = 48;

/** 明細のまとまりの角丸 */
const DETAIL_LIST_RADIUS = 18;

/**
 * 記録の詳細（#81）
 *
 * 一覧の行はタップで開く。行に入りきらない推定 1RM と換算式をここで見せて、
 * そのまま編集・削除に進めるようにする
 */
export const LiftRecordDetailSheet = ({
	record,
	onClose,
	onPressEdit,
	onPressDelete,
}: {
	/** 開いている記録。undefined ならシートは閉じている */
	record?: LiftRecord;
	onClose: () => void;
	onPressEdit: (record: LiftRecord) => void;
	onPressDelete: (record: LiftRecord) => void;
}) => {
	const theme = useTheme();

	/**
	 * 閉じるアニメーションの間だけ、直前の記録を持ち続ける
	 *
	 * シートの高さは中身の実測に合わせて決まるので、
	 * 閉じ始めと同時に中身を消すと、ハンドルだけの高さに縮んでから滑り落ちてしまう
	 */
	const lastRecord = useRef<LiftRecord>(undefined);

	if (record !== undefined) {
		lastRecord.current = record;
	}

	const shown = record ?? lastRecord.current;

	return (
		<BottomSheet open={record !== undefined} onClose={onClose}>
			{shown !== undefined && (
				<>
					<XStack
						alignItems="center"
						justifyContent="space-between"
						paddingHorizontal={4}
					>
						<SizableText
							fontSize={20}
							lineHeight={28}
							fontWeight="800"
							color="$textPrimary"
						>
							記録の詳細
						</SizableText>
						<XStack
							width={CLOSE_BUTTON_SIZE}
							height={CLOSE_BUTTON_SIZE}
							borderRadius={CLOSE_BUTTON_SIZE / 2}
							backgroundColor="$segmentTrack"
							alignItems="center"
							justifyContent="center"
							pressStyle={{ opacity: 0.7 }}
							onPress={onClose}
							accessibilityRole="button"
							accessibilityLabel="閉じる"
						>
							<X size={18} color={theme.textMuted.val} strokeWidth={2.2} />
						</XStack>
					</XStack>

					<YStack
						paddingHorizontal={16}
						borderRadius={DETAIL_LIST_RADIUS}
						backgroundColor="$segmentTrack"
					>
						<DetailRow label="種目">
							<SizableText fontSize={15} fontWeight="600" color="$textPrimary">
								{LIFT_EXERCISE_LABEL[shown.exercise]}
							</SizableText>
						</DetailRow>
						<DetailRow label="日付">
							<NumberText weight="600" fontSize={20}>
								{formatFullDate(shown.performedAt)}
							</NumberText>
						</DetailRow>
						<DetailRow label="重量">
							<DetailValue unit="kg">{formatWeight(shown.weight)}</DetailValue>
						</DetailRow>
						<DetailRow label="レップ数">
							<DetailValue unit="回">{String(shown.reps)}</DetailValue>
						</DetailRow>
						{/* 推定 1RM だけアクセント色にして、記録した値と換算した値を見分けられるようにする */}
						<DetailRow label="推定1RM" isLast>
							<DetailValue unit="kg" color="$accent">
								{formatEstimated(shown)}
							</DetailValue>
						</DetailRow>
					</YStack>

					<YStack gap={8}>
						<PrimaryButton
							// 下部固定ボタンと違って縦に積むので、高さを伸ばさない
							flex={0}
							icon={
								<Pencil
									size={19}
									color={theme.onAccentFill.val}
									strokeWidth={2.1}
								/>
							}
							onPress={() => onPressEdit(shown)}
						>
							この記録を編集
						</PrimaryButton>
						<Button
							height={layout.primaryButtonHeight}
							borderRadius={layout.primaryButtonHeight / 2}
							borderWidth={0}
							backgroundColor="$dangerSoft"
							color="$danger"
							fontSize={16}
							fontWeight="700"
							icon={
								<Trash2 size={20} color={theme.danger.val} strokeWidth={2.1} />
							}
							pressStyle={{ backgroundColor: "$dangerSoft", opacity: 0.85 }}
							onPress={() => onPressDelete(shown)}
						>
							この記録を削除
						</Button>
					</YStack>
				</>
			)}
		</BottomSheet>
	);
};

/** 明細の 1 行 */
const DetailRow = ({
	label,
	isLast = false,
	children,
}: {
	label: string;
	isLast?: boolean;
	children: ReactNode;
}) => (
	<XStack
		height={DETAIL_ROW_HEIGHT}
		alignItems="center"
		justifyContent="space-between"
		borderBottomWidth={isLast ? 0 : 1}
		borderBottomColor="$cardBorder"
	>
		<SizableText fontSize={14} color="$textMuted">
			{label}
		</SizableText>
		{children}
	</XStack>
);

/** 数値と単位の組。単位は常に補助色にする */
const DetailValue = ({
	unit,
	color = "$textPrimary",
	children,
}: {
	unit: string;
	color?: string;
	children: string;
}) => (
	<XStack alignItems="baseline">
		<NumberText fontSize={22} color={color}>
			{children}
		</NumberText>
		<SizableText
			fontSize={13}
			fontWeight="500"
			color="$textMuted"
			marginLeft={3}
		>
			{unit}
		</SizableText>
	</XStack>
);

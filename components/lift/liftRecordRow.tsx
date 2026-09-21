import { Table, Trash2, Trophy } from "lucide-react-native";
import ReanimatedSwipeable, {
	type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { SizableText, useTheme, XStack, YStack } from "tamagui";
import { NumberText, SurfaceCard } from "@/components/ui";
import {
	formatEstimated,
	formatRecordMonthDay,
	formatRecordYear,
	formatWeight,
} from "@/services/liftFormat";
import {
	getLiftPrKind,
	type LiftPr,
	type LiftPrKind,
	type LiftRecord,
} from "@/services/oneRepMax";
import { radius } from "@/theme/designTokens";

/** 行の高さ */
const ROW_HEIGHT = 68;

/** 日付の列幅。年と月日を 2 行で収める */
const DATE_COLUMN_WIDTH = 40;

/** スワイプで現れる削除ボタンの幅 */
const DELETE_ACTION_WIDTH = 96;

/** バッジのアイコンサイズ */
const BADGE_ICON_SIZE = 14;

/** 自己ベストのバッジの文言 */
const PR_BADGE_LABEL: Record<LiftPrKind, string> = {
	both: "実測=推定1RM",
	actual: "実測1RM",
	estimated: "推定1RM",
};

/**
 * 記録一覧の 1 行（#81）
 *
 * タップで記録の詳細、左スワイプで削除。
 * 右端のバッジは、その記録が自己ベストかどうかで 3 通りに変わる
 */
export const LiftRecordRow = ({
	record,
	pr,
	onPress,
	onPressDelete,
}: {
	record: LiftRecord;
	pr: LiftPr;
	onPress: () => void;
	onPressDelete: (swipeable: SwipeableMethods) => void;
}) => {
	const theme = useTheme();
	const prKind = getLiftPrKind(record, pr);

	return (
		<ReanimatedSwipeable
			friction={2}
			rightThreshold={DELETE_ACTION_WIDTH / 2}
			// 行より大きくスワイプされても地が見えないよう、削除の色で塗っておく。
			// `overflow: hidden` は使わない。行カードの影まで切られてしまうので、
			// 角丸は削除ボタン側にも持たせて枠に収める
			containerStyle={{
				borderRadius: radius.cardSmall,
				backgroundColor: theme.danger.val,
			}}
			renderRightActions={(_progress, _translation, swipeable) => (
				<YStack
					width={DELETE_ACTION_WIDTH}
					height="100%"
					borderTopRightRadius={radius.cardSmall}
					borderBottomRightRadius={radius.cardSmall}
					alignItems="center"
					justifyContent="center"
					gap={4}
					backgroundColor="$danger"
					pressStyle={{ opacity: 0.85 }}
					onPress={() => onPressDelete(swipeable)}
					accessibilityRole="button"
					accessibilityLabel="削除"
				>
					<Trash2 size={22} color={theme.onAccentFill.val} strokeWidth={2} />
					<SizableText fontSize={12} fontWeight="700" color="$onAccentFill">
						削除
					</SizableText>
				</YStack>
			)}
		>
			<SurfaceCard
				size="small"
				height={ROW_HEIGHT}
				paddingHorizontal={16}
				flexDirection="row"
				alignItems="center"
				gap={16}
				pressStyle={{ opacity: 0.7 }}
				onPress={onPress}
				accessibilityRole="button"
			>
				<YStack width={DATE_COLUMN_WIDTH}>
					<SizableText fontSize={12} lineHeight={16} color="$textMuted">
						{formatRecordYear(record.performedAt)}
					</SizableText>
					<NumberText weight="600" fontSize={20} lineHeight={22}>
						{formatRecordMonthDay(record.performedAt)}
					</NumberText>
				</YStack>

				<XStack flex={1} alignItems="baseline" gap={4}>
					<NumberText fontSize={34} lineHeight={38}>
						{formatWeight(record.weight)}
					</NumberText>
					<SizableText fontSize={13} color="$textMuted">
						kg
					</SizableText>
					<NumberText
						weight="600"
						fontSize={22}
						color="$textMuted"
						marginLeft={6}
					>
						× {record.reps}
					</NumberText>
				</XStack>

				{prKind === undefined ? (
					/* 自己ベストでない行は、バッジの代わりに推定値そのものを出す */
					<SizableText fontSize={12} color="$textMuted">
						推定1RM{" "}
						<NumberText fontSize={16}>{formatEstimated(record)}</NumberText> kg
					</SizableText>
				) : (
					<PrBadge kind={prKind} />
				)}
			</SurfaceCard>
		</ReanimatedSwipeable>
	);
};

/** 自己ベストのバッジ。実測はトロフィー、推定は換算表のアイコンにする */
const PrBadge = ({ kind }: { kind: LiftPrKind }) => {
	const theme = useTheme();
	const isActual = kind !== "estimated";
	const Icon = isActual ? Trophy : Table;

	return (
		<XStack
			alignItems="center"
			gap={4}
			height={26}
			paddingLeft={8}
			paddingRight={10}
			borderRadius={13}
			backgroundColor={isActual ? "$prBadgeBackground" : "$accentSoft"}
		>
			<Icon
				size={BADGE_ICON_SIZE}
				color={isActual ? theme.prBadgeIcon.val : theme.accent.val}
				strokeWidth={2.2}
			/>
			<SizableText
				fontSize={12}
				fontWeight="700"
				color={isActual ? "$prBadgeText" : "$accent"}
				numberOfLines={1}
			>
				{PR_BADGE_LABEL[kind]}
			</SizableText>
		</XStack>
	);
};

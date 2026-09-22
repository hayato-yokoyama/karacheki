import { Dumbbell, Table, Trophy } from "lucide-react-native";
import type { ReactNode } from "react";
import { SizableText, useTheme, XStack, YStack } from "tamagui";
import { HeroCard, NumberText } from "@/components/ui";
import {
	formatEstimated,
	formatHeroDate,
	formatSet,
	formatWeight,
} from "@/services/liftFormat";
import {
	LIFT_EXERCISE_LABEL,
	type LiftBest,
	type LiftExercise,
	type LiftRecord,
	ONE_REP_MAX_DESCRIPTION,
	RM_FORMULA_LABEL,
} from "@/services/oneRepMax";
import { heroNumberSize, radius } from "@/theme/designTokens";

/** ヒーローのバッジのアイコン */
const HERO_BADGE_ICON_SIZE = 16;

/** 記録がない種目に出す丸アイコン */
const EMPTY_ICON_CIRCLE_SIZE = 64;

/** 実測がまだない種目に出す丸アイコン */
const NO_ACTUAL_ICON_CIRCLE_SIZE = 36;

/**
 * 自己ベストのヒーロー（#81）
 *
 * 「今の自分のベストは何 kg か」を一目で分かるようにするための主役。
 * 実測 1RM と推定 1RM が一致するかどうかで、1 枚にまとめるか 2 枚並べるかが変わる
 */
export const LiftBestHero = ({
	exercise,
	best,
}: {
	exercise: LiftExercise;
	best: LiftBest;
}) => {
	if (best.kind === "none") {
		return <EmptyHero exercise={exercise} />;
	}

	if (best.kind === "same") {
		return (
			<HeroValue
				exercise={exercise}
				badge="actual"
				badgeLabel="実測1RM ＝ 推定1RM"
				value={formatWeight(best.record.weight)}
				performedAt={best.record.performedAt}
				withDescription
			/>
		);
	}

	if (best.kind === "estimatedOnly") {
		return (
			<>
				<EstimatedHero exercise={exercise} record={best.estimated} />
				<NoActualNote />
			</>
		);
	}

	return (
		<>
			<EstimatedHero exercise={exercise} record={best.estimated} />
			<HeroValue
				exercise={exercise}
				badge="actual"
				badgeLabel="実測1RM"
				value={formatWeight(best.actual.weight)}
				note="1レップ"
				performedAt={best.actual.performedAt}
			/>
		</>
	);
};

/** 推定 1RM のヒーロー。換算の元になったセットを値の右に併記する */
const EstimatedHero = ({
	exercise,
	record,
}: {
	exercise: LiftExercise;
	record: LiftRecord;
}) => (
	<HeroValue
		exercise={exercise}
		badge="estimated"
		badgeLabel="推定1RM"
		value={formatEstimated(record)}
		note={formatSet(record)}
		performedAt={record.performedAt}
		withDescription
	/>
);

/** 自己ベストを 1 つ載せたヒーロー */
const HeroValue = ({
	exercise,
	badge,
	badgeLabel,
	value,
	note,
	performedAt,
	withDescription = false,
}: {
	exercise: LiftExercise;
	badge: "actual" | "estimated";
	badgeLabel: string;
	value: string;
	/** 値の右に小さく添える内訳。`90.0kg × 5` や `1レップ` */
	note?: string;
	performedAt: string;
	/** 1RM の説明と換算式を下に出すかどうか。2 枚並ぶときは上の 1 枚だけに出す */
	withDescription?: boolean;
}) => {
	const theme = useTheme();
	const Icon = badge === "actual" ? Trophy : Table;

	return (
		<HeroCard gap={10}>
			<XStack alignItems="center" justifyContent="space-between">
				<XStack
					alignItems="center"
					gap={6}
					height={28}
					paddingLeft={10}
					paddingRight={12}
					borderRadius={14}
					backgroundColor="$onHeroChip"
				>
					<Icon
						size={HERO_BADGE_ICON_SIZE}
						color={theme.onHeroGold.val}
						strokeWidth={2.2}
					/>
					<SizableText fontSize={13} fontWeight="700" color="$onHeroGold">
						{badgeLabel}
					</SizableText>
				</XStack>
				<SizableText fontSize={13} color="$onHeroMuted">
					{formatHeroDate(performedAt)}
				</SizableText>
			</XStack>

			<XStack alignItems="baseline" gap={6}>
				<NumberText
					fontSize={heroNumberSize.lift.fontSize}
					lineHeight={heroNumberSize.lift.lineHeight}
					color="$onHero"
				>
					{value}
				</NumberText>
				<SizableText fontSize={24} fontWeight="500" color="$onHeroMuted">
					kg
				</SizableText>
				{note !== undefined && (
					<NumberText
						weight="600"
						fontSize={22}
						color="$onHeroSubtle"
						marginLeft={8}
					>
						{note}
					</NumberText>
				)}
			</XStack>

			{/* 1RM という単位そのものと、推定値の出どころを小さく置いておく */}
			{withDescription && (
				<YStack
					borderTopWidth={1}
					borderTopColor="$onHeroDivider"
					paddingTop={10}
				>
					<HeroCaption>{ONE_REP_MAX_DESCRIPTION}</HeroCaption>
					<HeroCaption>推定1RM ＝ {RM_FORMULA_LABEL[exercise]}</HeroCaption>
				</YStack>
			)}
		</HeroCard>
	);
};

const HeroCaption = ({ children }: { children: ReactNode }) => (
	<SizableText fontSize={12} lineHeight={18} color="$onHeroMuted">
		{children}
	</SizableText>
);

/**
 * 1 レップの記録がまだない種目に出す注記
 *
 * 推定のヒーローだけだと「実測 1RM が出ていない」のか
 * 「そもそも実測という区別がない」のかが分からないので、空席があることを示す
 */
const NoActualNote = () => {
	const theme = useTheme();

	return (
		<XStack
			alignItems="center"
			gap={12}
			paddingVertical={12}
			paddingHorizontal={16}
			borderRadius={radius.cardSmall}
			borderWidth={1.5}
			borderColor="$textPlaceholder"
			borderStyle="dashed"
		>
			<XStack
				width={NO_ACTUAL_ICON_CIRCLE_SIZE}
				height={NO_ACTUAL_ICON_CIRCLE_SIZE}
				borderRadius={NO_ACTUAL_ICON_CIRCLE_SIZE / 2}
				backgroundColor="$segmentTrack"
				alignItems="center"
				justifyContent="center"
			>
				<Trophy size={18} color={theme.textMuted.val} strokeWidth={2} />
			</XStack>
			<YStack flex={1} gap={1}>
				<SizableText fontSize={13} fontWeight="700" color="$textPrimary">
					実測1RM
				</SizableText>
				<SizableText fontSize={12} lineHeight={17} color="$textMuted">
					1レップの記録がまだありません。1回挙げた重量を記録すると表示されます
				</SizableText>
			</YStack>
		</XStack>
	);
};

/** 記録がない種目に出す、枠だけのヒーローと案内 */
const EmptyHero = ({ exercise }: { exercise: LiftExercise }) => {
	const theme = useTheme();

	return (
		<>
			<YStack
				borderRadius={radius.hero}
				borderWidth={2}
				borderColor="$textPlaceholder"
				borderStyle="dashed"
				paddingTop={18}
				paddingHorizontal={20}
				paddingBottom={16}
				gap={10}
			>
				<XStack
					alignSelf="flex-start"
					alignItems="center"
					gap={6}
					height={28}
					paddingLeft={10}
					paddingRight={12}
					borderRadius={14}
					backgroundColor="$segmentTrack"
				>
					<Trophy
						size={HERO_BADGE_ICON_SIZE}
						color={theme.textMuted.val}
						strokeWidth={2.2}
					/>
					<SizableText fontSize={13} fontWeight="700" color="$textMuted">
						実測1RM ／ 推定1RM
					</SizableText>
				</XStack>

				<XStack alignItems="baseline" gap={6}>
					<NumberText
						fontSize={heroNumberSize.lift.fontSize}
						lineHeight={heroNumberSize.lift.lineHeight}
						color="$textPlaceholder"
					>
						–.–
					</NumberText>
					<SizableText fontSize={24} fontWeight="500" color="$textPlaceholder">
						kg
					</SizableText>
				</XStack>

				<YStack
					borderTopWidth={1}
					borderTopColor="$textPlaceholder"
					borderStyle="dashed"
					paddingTop={10}
				>
					<SizableText fontSize={12} lineHeight={18} color="$textMuted">
						記録を追加すると、ここに自己ベストが表示されます
					</SizableText>
				</YStack>
			</YStack>

			{/* 何を記録すれば埋まるのかは、枠の中ではなく下に置いて読ませる */}
			<EmptyGuide exercise={exercise} />
		</>
	);
};

/** 記録の入れ方の案内 */
const EmptyGuide = ({ exercise }: { exercise: LiftExercise }) => {
	const theme = useTheme();

	return (
		<YStack
			alignItems="center"
			gap={8}
			paddingTop={26}
			paddingHorizontal={8}
			paddingBottom={4}
		>
			<XStack
				width={EMPTY_ICON_CIRCLE_SIZE}
				height={EMPTY_ICON_CIRCLE_SIZE}
				borderRadius={EMPTY_ICON_CIRCLE_SIZE / 2}
				backgroundColor="$accentSoft"
				alignItems="center"
				justifyContent="center"
			>
				<Dumbbell size={30} color={theme.accent.val} strokeWidth={1.8} />
			</XStack>
			<SizableText
				fontSize={16}
				lineHeight={24}
				fontWeight="800"
				color="$textPrimary"
				marginTop={4}
				textAlign="center"
			>
				{LIFT_EXERCISE_LABEL[exercise]}の記録はまだありません
			</SizableText>
			<SizableText
				fontSize={13}
				lineHeight={20}
				color="$textMuted"
				textAlign="center"
			>
				重量とレップ数を記録すると、{"\n"}
				自己ベストと推定1RMが自動で計算されます
			</SizableText>
		</YStack>
	);
};

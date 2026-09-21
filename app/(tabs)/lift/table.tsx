import { LinearGradient } from "@tamagui/linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { memo, useRef, useState } from "react";
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SizableText, XStack, YStack } from "tamagui";
import { LIFT_EXERCISE_SEGMENTS } from "@/components/lift";
import { SegmentedControl } from "@/components/segmentedControl";
import {
	BackLink,
	NumberText,
	Screen,
	ScreenHeader,
	SurfaceCard,
	useScreenPaddingTop,
} from "@/components/ui";
import {
	buildRmTableRow,
	isLiftExercise,
	type LiftExercise,
	RM_FORMULA_LABEL,
	RM_TABLE_REPS,
	RM_TABLE_WEIGHTS,
} from "@/services/oneRepMax";
import { layout, radius } from "@/theme/designTokens";

/** 表の行の高さ */
const ROW_HEIGHT = 44;

/** 重量の列の幅。見出しの「kg ＼ 回」が収まる幅 */
const WEIGHT_COLUMN_WIDTH = 72;

/** レップ数の列の幅 */
const REP_COLUMN_WIDTH = 52;

/** 横に続きがあることを示す、右端のフェードの幅 */
const FADE_WIDTH = 36;

/** 表の重量表示。刻みが 2.5kg なので、半端なときだけ小数を出す */
const formatTableWeight = (weight: number) =>
	Number.isInteger(weight) ? String(weight) : weight.toFixed(1);

/** 1 行おきに地の色を変える。列が多いと横に目が滑るため */
const rowBackground = (index: number) =>
	index % 2 === 0 ? "$cardBackground" : "$screenBackground";

/**
 * 1RM換算表（#81）
 *
 * 「100kg を挙げるなら今の 85kg を何レップやればいいか」を逆に引くためのもの。
 * 目的の行の前後も同時に見えるので、狙うレップ数まで決められる
 */
export default function Table() {
	const insets = useSafeAreaInsets();
	const paddingTop = useScreenPaddingTop();

	const { exercise: exerciseParam } = useLocalSearchParams<{
		exercise?: string;
	}>();

	/**
	 * 表示中の種目
	 *
	 * 一覧で選んでいた種目から始めて、ここでも切り替えられるようにする。
	 * 種目で換算式が変わるので、開き直さずに見比べられる方がよい
	 */
	const [exercise, setExercise] = useState<LiftExercise>(
		isLiftExercise(exerciseParam) ? exerciseParam : "benchPress",
	);

	return (
		<Screen
			paddingTop={paddingTop}
			paddingHorizontal={layout.screenPaddingHorizontal}
			paddingBottom={insets.bottom + layout.gap}
			gap={layout.gap}
		>
			<BackLink>BIG3</BackLink>
			<ScreenHeader
				label={`推定1RM ＝ ${RM_FORMULA_LABEL[exercise]}`}
				title="1RM換算表"
			/>
			<SegmentedControl
				options={LIFT_EXERCISE_SEGMENTS}
				value={exercise}
				onChange={setExercise}
			/>
			<RmTable exercise={exercise} />
		</Screen>
	);
}

/** 換算表そのもの */
const RmTable = ({ exercise }: { exercise: LiftExercise }) => {
	const headerScrollRef = useRef<ScrollView>(null);

	/**
	 * 見出しを本体の横スクロールに追従させる
	 *
	 * 見出しと重量の列は動かさずに値だけ横へ流したいので、
	 * 見出しは指で動かせないスクロールにして、本体の位置をそのまま写す
	 */
	const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		headerScrollRef.current?.scrollTo({
			x: event.nativeEvent.contentOffset.x,
			animated: false,
		});
	};

	return (
		// 角丸で中身を切るとカードの影まで切られてしまうので、影は外側、切り抜きは内側で持つ
		<SurfaceCard flex={1} padding={0}>
			<YStack flex={1} borderRadius={radius.card} overflow="hidden">
				<XStack height={ROW_HEIGHT} backgroundColor="$segmentTrack">
					<XStack
						width={WEIGHT_COLUMN_WIDTH}
						alignItems="center"
						paddingLeft={16}
					>
						<SizableText fontSize={12} fontWeight="500" color="$textMuted">
							kg ＼ 回
						</SizableText>
					</XStack>
					<ScrollView
						ref={headerScrollRef}
						horizontal
						scrollEnabled={false}
						showsHorizontalScrollIndicator={false}
					>
						<XStack>
							{RM_TABLE_REPS.map((reps) => (
								<Cell key={reps}>
									<NumberText weight="600" fontSize={18} color="$textMuted">
										{String(reps)}
									</NumberText>
								</Cell>
							))}
						</XStack>
					</ScrollView>
				</XStack>

				<ScrollView showsVerticalScrollIndicator={false}>
					<XStack>
						{/* 重量の列は横スクロールの外に置いて、右端まで送っても行が読めるようにする */}
						<YStack width={WEIGHT_COLUMN_WIDTH}>
							{RM_TABLE_WEIGHTS.map((weight, index) => (
								<XStack
									key={weight}
									height={ROW_HEIGHT}
									alignItems="center"
									paddingLeft={16}
									backgroundColor={rowBackground(index)}
								>
									<NumberText fontSize={22}>
										{formatTableWeight(weight)}
									</NumberText>
								</XStack>
							))}
						</YStack>
						<ScrollView
							horizontal
							showsHorizontalScrollIndicator={false}
							onScroll={handleScroll}
							scrollEventThrottle={16}
						>
							<YStack>
								{RM_TABLE_WEIGHTS.map((weight, index) => (
									<TableRow
										key={weight}
										exercise={exercise}
										weight={weight}
										index={index}
									/>
								))}
							</YStack>
						</ScrollView>
					</XStack>
				</ScrollView>

				<LinearGradient
					colors={["$cardBackgroundTransparent", "$cardBackground"]}
					start={{ x: 0, y: 0 }}
					end={{ x: 1, y: 0 }}
					pointerEvents="none"
					position="absolute"
					top={0}
					bottom={0}
					right={0}
					width={FADE_WIDTH}
				/>
			</YStack>
		</SurfaceCard>
	);
};

/** 換算表の 1 行ぶんの推定 1RM */
const TableRow = memo(
	({
		exercise,
		weight,
		index,
	}: {
		exercise: LiftExercise;
		weight: number;
		index: number;
	}) => (
		<XStack height={ROW_HEIGHT} backgroundColor={rowBackground(index)}>
			{buildRmTableRow(exercise, weight).map((value, column) => (
				<Cell key={RM_TABLE_REPS[column]}>
					<NumberText weight="600" fontSize={22}>
						{String(value)}
					</NumberText>
				</Cell>
			))}
		</XStack>
	),
);

/** レップ数の列のセル。見出しと値で幅を揃える */
const Cell = ({ children }: { children: React.ReactNode }) => (
	<XStack
		width={REP_COLUMN_WIDTH}
		height={ROW_HEIGHT}
		alignItems="center"
		justifyContent="center"
	>
		{children}
	</XStack>
);

import { LinearGradient } from "@tamagui/linear-gradient";
import { useLocalSearchParams } from "expo-router";
import { memo, useCallback, useState } from "react";
import { FlatList, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SizableText, useTheme, XStack, YStack } from "tamagui";
import {
	BackLink,
	NumberText,
	Screen,
	ScreenHeader,
	SurfaceCard,
	useScreenPaddingTop,
} from "@/components/ui";
import {
	getRmTableFormula,
	getRmTableRows,
	isLiftExercise,
	RM_TABLE_GROUP_LABEL,
	RM_TABLE_GROUPS,
	RM_TABLE_REPS,
	type RmTableGroup,
	type RmTableRow,
	toRmTableGroup,
} from "@/services/oneRepMax";
import { layout, radius } from "@/theme/designTokens";

/** 表の行の高さ */
const ROW_HEIGHT = 44;

/** 重量の列の幅。見出しの「kg ＼ 回」が収まる幅 */
const WEIGHT_COLUMN_WIDTH = 72;

/** レップ数の列の幅 */
const REP_COLUMN_WIDTH = 52;

/** 表の横幅。重量の列 ＋ レップ数の列 */
const CONTENT_WIDTH =
	WEIGHT_COLUMN_WIDTH + REP_COLUMN_WIDTH * RM_TABLE_REPS.length;

/** 横に続きがあることを示す、右端のフェードの幅 */
const FADE_WIDTH = 36;

/** まとまりを選ぶピルの高さ */
const PILL_HEIGHT = 44;

/** 最初に描く行数。1 画面に収まるぶんだけ描いて、残りはスクロールに合わせて足す */
const INITIAL_ROWS = 14;

/** 表の重量表示。刻みが 2.5kg なので、半端なときだけ小数を出す */
const formatTableWeight = (weight: number) =>
	Number.isInteger(weight) ? String(weight) : weight.toFixed(1);

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
	 * 表示中のまとまり
	 *
	 * 一覧で選んでいた種目のものから始めて、ここでも切り替えられるようにする。
	 * 除数が違うと表がまるごと変わるので、開き直さずに見比べられる方がよい
	 */
	const [group, setGroup] = useState<RmTableGroup>(
		toRmTableGroup(
			isLiftExercise(exerciseParam) ? exerciseParam : "benchPress",
		),
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
				label={`推定1RM ＝ ${getRmTableFormula(group)}`}
				title="1RM換算表"
			/>
			<GroupPills value={group} onChange={setGroup} />
			<RmTable group={group} />
		</Screen>
	);
}

/**
 * 表のまとまりを選ぶピル（#81）
 *
 * 選択肢が 2 つしかなく、片方は文字数が多いので、
 * 幅を等分するセグメントではなく文字に合わせて並べたボタンにする
 */
const GroupPills = ({
	value,
	onChange,
}: {
	value: RmTableGroup;
	onChange: (group: RmTableGroup) => void;
}) => (
	<XStack gap={8} accessibilityRole="tablist">
		{RM_TABLE_GROUPS.map((group) => {
			const isSelected = group === value;

			return (
				<XStack
					key={group}
					height={PILL_HEIGHT}
					paddingHorizontal={18}
					borderRadius={PILL_HEIGHT / 2}
					alignItems="center"
					justifyContent="center"
					backgroundColor={isSelected ? "$accentFill" : "$cardBackground"}
					// 幅が選択で変わらないよう、枠線は常に持たせて色だけ消す
					borderWidth={1}
					borderColor={isSelected ? "transparent" : "$cardBorder"}
					shadowColor={isSelected ? "transparent" : "$cardShadowColor"}
					shadowOffset={{ width: 0, height: 6 }}
					shadowOpacity={1}
					shadowRadius={18}
					pressStyle={{ opacity: 0.85 }}
					onPress={() => onChange(group)}
					accessibilityRole="tab"
					accessibilityState={{ selected: isSelected }}
				>
					<SizableText
						fontSize={14}
						fontWeight="700"
						color={isSelected ? "$onAccentFill" : "$textPrimary"}
						numberOfLines={1}
					>
						{RM_TABLE_GROUP_LABEL[group]}
					</SizableText>
				</XStack>
			);
		})}
	</XStack>
);

/**
 * 換算表そのもの
 *
 * 97 行をすべて描くと画面を開くだけで 1 秒以上かかるので、行は縦の `FlatList` に任せて
 * 見えているぶんだけ描く。横は表全体を 1 つのスクロールで動かし、
 * 重量の列と見出しのセルだけスクロール量を打ち消して左端に留める
 */
const RmTable = ({ group }: { group: RmTableGroup }) => {
	const theme = useTheme();

	/** 表の横スクロール量。重量の列を左端に留めるために使う */
	const scrollX = useSharedValue(0);

	const handleScroll = useAnimatedScrollHandler((event) => {
		scrollX.value = event.contentOffset.x;
	});

	/**
	 * 表の高さ
	 *
	 * 横スクロールの中に縦スクロールを入れるので、中身の高さが決まらないと
	 * 行が全部伸びてしまう。カードの実寸を測って渡す
	 */
	const [bodyHeight, setBodyHeight] = useState(0);

	// 1 行おきに地の色を変える。列が多いと横に目が滑るため
	const evenRowBackground = theme.cardBackground.val;
	const oddRowBackground = theme.screenBackground.val;

	const renderItem = useCallback(
		({ item, index }: { item: RmTableRow; index: number }) => (
			<TableRow
				row={item}
				backgroundColor={index % 2 === 0 ? evenRowBackground : oddRowBackground}
				scrollX={scrollX}
			/>
		),
		[evenRowBackground, oddRowBackground, scrollX],
	);

	return (
		// 角丸で中身を切るとカードの影まで切られてしまうので、影は外側、切り抜きは内側で持つ
		<SurfaceCard flex={1} padding={0}>
			{/* 内側は境界線 1px のぶんだけ小さく丸めないと、角で外にはみ出す */}
			<YStack
				flex={1}
				borderRadius={radius.card - 1}
				overflow="hidden"
				onLayout={(event) => setBodyHeight(event.nativeEvent.layout.height)}
			>
				{bodyHeight > 0 && (
					<Animated.ScrollView
						horizontal
						showsHorizontalScrollIndicator={false}
						onScroll={handleScroll}
						scrollEventThrottle={16}
					>
						<YStack width={CONTENT_WIDTH} height={bodyHeight}>
							<TableHeader scrollX={scrollX} />
							<FlatList
								data={getRmTableRows(group)}
								keyExtractor={(row) => String(row.weight)}
								renderItem={renderItem}
								// 行の高さが揃っているので、飛ばし読みの位置を計算で出せる
								getItemLayout={(_, index) => ({
									length: ROW_HEIGHT,
									offset: ROW_HEIGHT * index,
									index,
								})}
								initialNumToRender={INITIAL_ROWS}
								windowSize={5}
								style={{ flex: 1 }}
								showsVerticalScrollIndicator={false}
							/>
						</YStack>
					</Animated.ScrollView>
				)}

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

/** 見出し。縦スクロールの外に置いて、行を追っている間もレップ数が見えるようにする */
const TableHeader = ({ scrollX }: { scrollX: SharedValue<number> }) => {
	const theme = useTheme();

	return (
		<XStack
			width={CONTENT_WIDTH}
			height={ROW_HEIGHT}
			backgroundColor="$segmentTrack"
		>
			<PinnedWeightCell
				backgroundColor={theme.segmentTrack.val}
				scrollX={scrollX}
			>
				<SizableText fontSize={12} fontWeight="500" color="$textMuted">
					kg ＼ 回
				</SizableText>
			</PinnedWeightCell>
			{RM_TABLE_REPS.map((reps) => (
				<RepCell key={reps} weight="600" fontSize={18} color="$textMuted">
					{String(reps)}
				</RepCell>
			))}
		</XStack>
	);
};

/** 換算表の 1 行 */
const TableRow = memo(
	({
		row,
		backgroundColor,
		scrollX,
	}: {
		row: RmTableRow;
		backgroundColor: string;
		scrollX: SharedValue<number>;
	}) => (
		<View
			style={{
				width: CONTENT_WIDTH,
				height: ROW_HEIGHT,
				flexDirection: "row",
				backgroundColor,
			}}
		>
			<PinnedWeightCell backgroundColor={backgroundColor} scrollX={scrollX}>
				<NumberText fontSize={22} lineHeight={ROW_HEIGHT}>
					{formatTableWeight(row.weight)}
				</NumberText>
			</PinnedWeightCell>
			{row.values.map((value, column) => (
				<RepCell key={RM_TABLE_REPS[column]} weight="600" fontSize={22}>
					{String(value)}
				</RepCell>
			))}
		</View>
	),
);

/**
 * 左端に留まる重量のセル
 *
 * 横スクロールと同じぶんだけ右に戻して、その場に居続けているように見せる。
 * 値のセルが下をくぐるので、地の色は行と同じものを敷く
 */
const PinnedWeightCell = ({
	backgroundColor,
	scrollX,
	children,
}: {
	backgroundColor: string;
	scrollX: SharedValue<number>;
	children: React.ReactNode;
}) => {
	const pinnedStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: scrollX.value }],
	}));

	return (
		<Animated.View
			style={[
				{
					width: WEIGHT_COLUMN_WIDTH,
					height: ROW_HEIGHT,
					justifyContent: "center",
					paddingLeft: 16,
					backgroundColor,
					zIndex: 1,
				},
				pinnedStyle,
			]}
		>
			{children}
		</Animated.View>
	);
};

/**
 * レップ数の列のセル
 *
 * 入れ物を作らず文字そのものに幅と行高を持たせる。
 * 1 画面ぶんでも 150 セル以上並ぶので、要素の数をそのまま描画の速さとして払うことになる
 */
const RepCell = ({
	weight,
	fontSize,
	color,
	children,
}: {
	weight: "600" | "700";
	fontSize: number;
	color?: string;
	children: string;
}) => (
	<NumberText
		width={REP_COLUMN_WIDTH}
		lineHeight={ROW_HEIGHT}
		textAlign="center"
		weight={weight}
		fontSize={fontSize}
		{...(color !== undefined && { color })}
	>
		{children}
	</NumberText>
);

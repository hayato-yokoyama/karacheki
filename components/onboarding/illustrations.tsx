import { LinearGradient } from "@tamagui/linear-gradient";
import { Bluetooth, ChartLine, Clock } from "lucide-react-native";
import Svg, {
	Circle,
	Defs,
	Line,
	Path,
	RadialGradient,
	Stop,
} from "react-native-svg";
import { Text, useTheme, XStack, YStack, type YStackProps } from "tamagui";
import { NumberText, SurfaceCard } from "@/components/ui";
import {
	HERO_GRADIENT_COLORS,
	HERO_GRADIENT_END,
	HERO_GRADIENT_LOCATIONS,
	HERO_GRADIENT_START,
} from "@/theme/designTokens";

/**
 * オンボーディングのイラスト（#80）
 *
 * 4 ページとも「上にアプリ画面の見本、下に見出しと本文」という同じ型で、
 * 見本はどれも実データではない作りもの。
 * 画像や Lottie は持たず、`react-native-svg` と共通コンポーネントの組み合わせで描く
 * （画面は `app/(onboarding)/index.tsx`）
 */

export type IllustrationProps = {
	/** イラストに使える横幅。端末が狭いときはこの幅まで縮める */
	width: number;
};

/** 背後に敷く放射グラデーションの直径 */
const GLOW_SIZE = 330;

/**
 * イラストの背後に敷く光
 *
 * CSS の `radial-gradient(circle, accentSoft 0%, transparent 70%)` 相当。
 * RN にはこれに当たる背景が無いので SVG のグラデーションで描く
 */
export const IllustrationGlow = () => {
	const theme = useTheme();

	return (
		<YStack
			position="absolute"
			width={GLOW_SIZE}
			height={GLOW_SIZE}
			opacity={0.9}
			pointerEvents="none"
		>
			<Svg width={GLOW_SIZE} height={GLOW_SIZE}>
				<Defs>
					<RadialGradient id="onboardingGlow" cx="50%" cy="50%" r="50%">
						<Stop offset="0" stopColor={theme.accentSoft.val} stopOpacity={1} />
						<Stop
							offset="0.7"
							stopColor={theme.accentSoft.val}
							stopOpacity={0}
						/>
					</RadialGradient>
				</Defs>
				<Circle
					cx={GLOW_SIZE / 2}
					cy={GLOW_SIZE / 2}
					r={GLOW_SIZE / 2}
					fill="url(#onboardingGlow)"
				/>
			</Svg>
		</YStack>
	);
};

/** 1 ページ目のグラフの基準サイズ。実際の描画幅はこの比率のまま縮める */
const TREND_CHART_WIDTH = 320;
const TREND_CHART_HEIGHT = 210;

/** 目盛り線の y 座標 */
const TREND_GRID_LINES = [14, 74.7, 135.3, 196];

/** 日々の体重の点 */
const TREND_POINTS: readonly (readonly [number, number])[] = [
	[14, 162],
	[40.5, 157.3],
	[67.1, 135.4],
	[93.6, 137.3],
	[120.2, 132.8],
	[146.7, 110],
	[173.3, 79.5],
	[199.8, 76.8],
	[226.4, 70.6],
	[252.9, 86.7],
	[279.5, 65.4],
	[306, 69.3],
];

/** 傾向線 */
const TREND_LINE_PATH =
	"M14.0,150.5 C18.4,148.7 31.7,143.3 40.5,140.0 C49.4,136.7 58.2,133.8 67.1,130.9 C75.9,127.9 84.8,125.1 93.6,122.2 C102.5,119.4 111.3,116.6 120.2,113.9 C129.0,111.1 137.9,108.4 146.7,105.7 C155.6,103.1 164.4,100.4 173.3,97.8 C182.1,95.1 191.0,92.5 199.8,89.9 C208.7,87.3 217.5,84.7 226.4,82.2 C235.2,79.6 244.1,77.1 252.9,74.5 C261.8,72.0 270.6,69.5 279.5,67.0 C288.3,64.5 301.6,60.7 306.0,59.5";

/** 傾向線の先端 */
const TREND_HEAD = { x: 306, y: 59.5 } as const;

/**
 * 1 ページ目：日々の体重と傾向の対比
 *
 * 点が上下していても傾向線はなだらかに動く、というこのアプリの考え方をそのまま絵にしている
 */
export const TrendIllustration = ({ width }: IllustrationProps) => {
	const theme = useTheme();

	const chartWidth = Math.min(TREND_CHART_WIDTH, width);
	const chartHeight = (chartWidth * TREND_CHART_HEIGHT) / TREND_CHART_WIDTH;

	return (
		<YStack alignItems="center" gap={14}>
			<Svg
				width={chartWidth}
				height={chartHeight}
				viewBox={`0 0 ${TREND_CHART_WIDTH} ${TREND_CHART_HEIGHT}`}
			>
				{TREND_GRID_LINES.map((y) => (
					<Line
						key={y}
						x1={0}
						y1={y}
						x2={TREND_CHART_WIDTH}
						y2={y}
						stroke={theme.chartGrid.val}
						strokeWidth={1}
						strokeDasharray="3 5"
					/>
				))}
				{TREND_POINTS.map(([cx, cy]) => (
					<Circle key={cx} cx={cx} cy={cy} r={5} fill={theme.chartActual.val} />
				))}
				<Path
					d={TREND_LINE_PATH}
					fill="none"
					stroke={theme.accent.val}
					strokeWidth={5}
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<Circle
					cx={TREND_HEAD.x}
					cy={TREND_HEAD.y}
					r={12}
					fill={theme.accent.val}
					fillOpacity={0.22}
				/>
				<Circle
					cx={TREND_HEAD.x}
					cy={TREND_HEAD.y}
					r={7}
					fill={theme.accent.val}
					stroke={theme.screenBackground.val}
					strokeWidth={2.5}
				/>
			</Svg>
			<XStack gap={16} justifyContent="center">
				<XStack alignItems="center" gap={6}>
					<YStack
						width={8}
						height={8}
						borderRadius={4}
						backgroundColor="$chartActual"
					/>
					<Text fontSize={12} color="$textMuted">
						日々の体重
					</Text>
				</XStack>
				<XStack alignItems="center" gap={6}>
					<YStack
						width={18}
						height={4}
						borderRadius={2}
						backgroundColor="$accent"
					/>
					<Text fontSize={12} fontWeight="700" color="$textPrimary">
						傾向
					</Text>
				</XStack>
			</XStack>
		</YStack>
	);
};

/**
 * 2 ページ目：スマホ連携できる体重計
 *
 * 体重計の写真の代わりに、体重が乗った角丸のカードで「測る」を表す
 */
export const ScaleIllustration = () => {
	const theme = useTheme();

	return (
		<SurfaceCard
			width={200}
			height={200}
			borderRadius={48}
			alignItems="center"
			justifyContent="center"
		>
			<XStack
				width={136}
				height={76}
				borderRadius={20}
				backgroundColor="$segmentTrack"
				alignItems="baseline"
				justifyContent="center"
				gap={4}
				paddingTop={10}
			>
				<NumberText fontSize={48} lineHeight={56}>
					80.9
				</NumberText>
				<Text fontSize={14} color="$textMuted">
					kg
				</Text>
			</XStack>
			<XStack
				position="absolute"
				right={-14}
				top={-14}
				width={48}
				height={48}
				borderRadius={24}
				backgroundColor="$accentFill"
				alignItems="center"
				justifyContent="center"
				shadowColor="$accentFillShadowColor"
				shadowOffset={{ width: 0, height: 8 }}
				shadowOpacity={1}
				shadowRadius={20}
			>
				<Bluetooth size={24} color={theme.onAccentFill.val} strokeWidth={2.2} />
			</XStack>
			<SurfaceCard
				position="absolute"
				left={-26}
				bottom={18}
				height={36}
				borderRadius={18}
				flexDirection="row"
				alignItems="center"
				gap={6}
				paddingLeft={10}
				paddingRight={14}
			>
				<Clock size={17} color={theme.accent.val} strokeWidth={2.2} />
				{/* 「毎朝」は日本語なので NumberText（Barlow Condensed）には載せない */}
				<Text fontSize={14} fontWeight="700" color="$accent">
					毎朝
				</Text>
				<NumberText fontSize={19} color="$accent">
					8:00
				</NumberText>
			</SurfaceCard>
		</SurfaceCard>
	);
};

/** 3 ページ目の通知カードの基準幅 */
const NOTIFICATION_CARD_WIDTH = 320;

/** 通知カード。奥に重ねる 2 枚は中身を持たず、高さだけ前面と揃える */
const NotificationCard = (props: YStackProps) => (
	<SurfaceCard
		borderRadius={26}
		paddingVertical={14}
		paddingHorizontal={16}
		{...props}
	/>
);

/**
 * 3 ページ目：毎朝の通知
 *
 * 通知が積み重なる様子を、奥ほど縮めて薄くした 3 枚のカードで表す
 */
export const NotificationIllustration = ({ width }: IllustrationProps) => {
	const theme = useTheme();

	const cardWidth = Math.min(NOTIFICATION_CARD_WIDTH, width);

	return (
		<YStack alignItems="center">
			<NotificationCard
				width={cardWidth}
				opacity={0.45}
				scale={0.88}
				marginBottom={-60}
			>
				<YStack height={44} />
			</NotificationCard>
			<NotificationCard
				width={cardWidth}
				opacity={0.7}
				scale={0.94}
				marginBottom={-46}
			>
				<YStack height={44} />
			</NotificationCard>
			<NotificationCard width={cardWidth}>
				<XStack alignItems="center" gap={12}>
					<LinearGradient
						width={44}
						height={44}
						borderRadius={11}
						colors={HERO_GRADIENT_COLORS}
						locations={HERO_GRADIENT_LOCATIONS}
						start={HERO_GRADIENT_START}
						end={HERO_GRADIENT_END}
						alignItems="center"
						justifyContent="center"
					>
						<ChartLine size={24} color={theme.onHero.val} strokeWidth={2} />
					</LinearGradient>
					<YStack flex={1} gap={2}>
						<XStack justifyContent="space-between">
							<Text fontSize={13} fontWeight="700" color="$textPrimary">
								からチェキ
							</Text>
							<NumberText weight="600" fontSize={13} color="$textMuted">
								8:00
							</NumberText>
						</XStack>
						<Text fontSize={14} lineHeight={20} color="$textPrimary">
							今週の平均は <NumberText fontSize={17}>80.89</NumberText> kg です
						</Text>
					</YStack>
				</XStack>
			</NotificationCard>
		</YStack>
	);
};

/** 4 ページ目のグラフカードの基準サイズ */
const GRAPH_CARD_WIDTH = 334;
const GRAPH_CARD_PADDING = 18;
const GRAPH_CHART_WIDTH = 298;
const GRAPH_CHART_HEIGHT = 150;

/** 目盛り線の y 座標 */
const GRAPH_GRID_LINES = [14, 54.7, 95.3, 136];

/** 実測データの折れ線 */
const GRAPH_ACTUAL_PATH =
	"M14.0,112.6 L28.2,104.7 L42.4,91.8 L56.6,97.3 L70.8,91.9 L85.1,85.8 L99.3,90.4 L113.5,79.1 L127.7,72.3 L141.9,64.7 L156.1,76.0 L170.3,67.4 L184.5,68.1 L198.7,48.4 L212.9,47.1 L227.2,57.6 L241.4,33.1 L255.6,29.6 L269.8,32.7 L284.0,29.8";

/** 傾向線 */
const GRAPH_TREND_PATH =
	"M14.0,111.6 C16.4,110.7 23.5,107.7 28.2,106.0 C32.9,104.3 37.7,102.7 42.4,101.1 C47.2,99.6 51.9,98.0 56.6,96.5 C61.4,95.0 66.1,93.6 70.8,92.1 C75.6,90.6 80.3,89.2 85.1,87.8 C89.8,86.3 94.5,84.9 99.3,83.5 C104.0,82.1 108.7,80.7 113.5,79.3 C118.2,77.9 122.9,76.6 127.7,75.2 C132.4,73.8 137.2,72.5 141.9,71.1 C146.6,69.8 151.4,68.4 156.1,67.1 C160.8,65.8 165.6,64.4 170.3,63.1 C175.1,61.8 179.8,60.5 184.5,59.2 C189.3,57.8 194.0,56.5 198.7,55.2 C203.5,53.9 208.2,52.6 212.9,51.4 C217.7,50.1 222.4,48.8 227.2,47.5 C231.9,46.2 236.6,44.9 241.4,43.7 C246.1,42.4 250.8,41.1 255.6,39.9 C260.3,38.6 265.1,37.3 269.8,36.1 C274.5,34.8 281.6,32.9 284.0,32.3";

/** 傾向線の先端 */
const GRAPH_HEAD = { x: 284, y: 32.3 } as const;

/**
 * 4 ページ目：グラフ画面の見本
 *
 * グラフ画面と同じ「期間の傾向 ＋ 期間のチップ ＋ 実測線と傾向線」の組み合わせ
 */
export const GraphIllustration = ({ width }: IllustrationProps) => {
	const theme = useTheme();

	const cardWidth = Math.min(GRAPH_CARD_WIDTH, width);
	const chartWidth = cardWidth - GRAPH_CARD_PADDING * 2;
	const chartHeight = (chartWidth * GRAPH_CHART_HEIGHT) / GRAPH_CHART_WIDTH;

	return (
		<SurfaceCard
			width={cardWidth}
			borderRadius={28}
			paddingTop={GRAPH_CARD_PADDING}
			paddingHorizontal={GRAPH_CARD_PADDING}
			paddingBottom={14}
		>
			<XStack alignItems="flex-end" justifyContent="space-between">
				<YStack>
					<Text fontSize={12} color="$textMuted">
						この期間の傾向
					</Text>
					<XStack alignItems="baseline" gap={4}>
						<NumberText fontSize={52} lineHeight={54}>
							+1.2
						</NumberText>
						<Text fontSize={16} color="$textMuted">
							kg
						</Text>
					</XStack>
				</YStack>
				<XStack
					height={26}
					paddingHorizontal={10}
					borderRadius={13}
					backgroundColor="$accentSoft"
					alignItems="center"
				>
					<Text fontSize={12} fontWeight="700" color="$accent">
						3ヶ月
					</Text>
				</XStack>
			</XStack>
			<YStack marginTop={8}>
				<Svg
					width={chartWidth}
					height={chartHeight}
					viewBox={`0 0 ${GRAPH_CHART_WIDTH} ${GRAPH_CHART_HEIGHT}`}
				>
					{GRAPH_GRID_LINES.map((y) => (
						<Line
							key={y}
							x1={0}
							y1={y}
							x2={GRAPH_CHART_WIDTH}
							y2={y}
							stroke={theme.chartGrid.val}
							strokeWidth={1}
							strokeDasharray="3 5"
						/>
					))}
					<Path
						d={GRAPH_ACTUAL_PATH}
						fill="none"
						stroke={theme.chartActual.val}
						strokeWidth={1.8}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<Path
						d={GRAPH_TREND_PATH}
						fill="none"
						stroke={theme.accent.val}
						strokeWidth={4.5}
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<Circle
						cx={GRAPH_HEAD.x}
						cy={GRAPH_HEAD.y}
						r={12}
						fill={theme.accent.val}
						fillOpacity={0.22}
					/>
					<Circle
						cx={GRAPH_HEAD.x}
						cy={GRAPH_HEAD.y}
						r={7}
						fill={theme.accent.val}
						stroke={theme.screenBackground.val}
						strokeWidth={2.5}
					/>
				</Svg>
			</YStack>
		</SurfaceCard>
	);
};

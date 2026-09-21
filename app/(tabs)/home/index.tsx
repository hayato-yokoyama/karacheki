import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import * as Linking from "expo-linking";
import * as Notifications from "expo-notifications";
import { Link, useRouter } from "expo-router";
import {
	ArrowDownRight,
	ArrowUpRight,
	Bell,
	ChevronRight,
	ExternalLink,
	Minus,
	Plus,
	Settings,
	Trophy,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import type { AppStateStatus } from "react-native";
import { AppState } from "react-native";
import {
	Button,
	SizableText,
	Spinner,
	useTheme,
	View,
	XStack,
	YStack,
} from "tamagui";
import {
	EmptyWeightCard,
	HealthPermissionGuide,
} from "@/components/errorHealthData";
import {
	BottomActionBar,
	HeroCard,
	NumberText,
	PrimaryButton,
	Screen,
	ScreenHeader,
	ScreenScrollView,
	SurfaceCard,
} from "@/components/ui";
import { WeeklySparkline } from "@/components/weeklySparkline";
import { listLiftRecords } from "@/services/liftRecordService";
import { scheduleDailyWeightNotification } from "@/services/notificationService";
import {
	estimateOneRepMax,
	getLiftPr,
	LIFT_EXERCISE_SHORT_LABEL,
	LIFT_EXERCISES,
	type LiftExercise,
	type LiftRecord,
	roundOneRepMax,
} from "@/services/oneRepMax";
import {
	fetchAllWeights,
	formatWeekRangeLabel,
	getWeekRange,
	type HomeWeightSummary,
	summarizeWeightsForHome,
	TREND_MONTHS,
	useWeightRefetchOnActive,
	WEEKLY_AVERAGE_WEEKS,
} from "@/services/weightService";
import { heroNumberSize, layout } from "@/theme/designTokens";

// アプリ起動中の通知の動作設定（バナー表示、通知センター表示、通知音、バッジ表示）
Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: false,
		shouldSetBadge: false,
	}),
});

/** 数値が無いときに出すプレースホルダ */
const NO_VALUE = "--.--";

/** 見出しの右に置くボタンの高さ */
const HEADER_PILL_HEIGHT = 36;

/** 週平均の表示。小数第2位まで出す */
const formatAverage = (average: number | null) =>
	average === null ? NO_VALUE : average.toFixed(2);

/** 増減の表示。増えていれば + 、変わらなければ ± を付ける */
const formatDiff = (diff: number, fractionDigits: number) => {
	const value = diff.toFixed(fractionDigits);

	if (diff > 0) {
		return `+${value}`;
	}

	// -0.00 のような表示を避けるため、丸めた結果が 0 なら ± にする
	return Number(value) === 0
		? `±${Math.abs(diff).toFixed(fractionDigits)}`
		: value;
};

/** 増減を表す矢印 */
const DiffIcon = ({
	diff,
	size,
	color,
}: {
	diff: number;
	size: number;
	color: string;
}) => {
	if (diff > 0) {
		return <ArrowUpRight color={color} size={size} strokeWidth={2.4} />;
	}

	if (diff < 0) {
		return <ArrowDownRight color={color} size={size} strokeWidth={2.4} />;
	}

	return <Minus color={color} size={size} strokeWidth={2.4} />;
};

export default function Index() {
	// 通知設定する
	useEffect(() => {
		scheduleDailyWeightNotification();
	}, []);

	// 体重の取得。期間ごとに問い合わせず、全期間から画面に出す値を導出する
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["weights", "all"],
		queryFn: fetchAllWeights,
	});

	// 画面フォーカス時やフォアグラウンド復帰時に体重を再取得する
	useWeightRefetchOnActive(refetch);

	// 全期間ぶんを走査するので、データが変わったときだけ計算し直す
	const summary = useMemo(
		() => (data ? summarizeWeightsForHome(data) : null),
		[data],
	);

	const todayLabel = format(new Date(), "yyyy.M.d E", { locale: ja });

	if (isLoading) {
		return (
			<Screen>
				<ScreenScrollView>
					<ScreenHeader label={todayLabel} title="今週の体重" />
					<YStack height={400} alignItems="center" justifyContent="center">
						<Spinner size="small" />
					</YStack>
				</ScreenScrollView>
			</Screen>
		);
	}

	// 体重未入力・パーミッションエラー
	if (error || summary === null || data?.length === 0) {
		return (
			<Screen>
				<ScreenScrollView withBottomAction>
					<ScreenHeader label={todayLabel} title="今週の体重" />
					<EmptyWeightCard
						placeholder={{
							label: "今週の平均",
							periodLabel: formatWeekRangeLabel(getWeekRange(0, new Date())),
						}}
					/>
					<HealthPermissionGuide />
				</ScreenScrollView>
				<AddWeightButton />
			</Screen>
		);
	}

	return (
		<Screen>
			<ScreenScrollView>
				<ScreenHeader
					label={todayLabel}
					title="今週の体重"
					right={<AddWeightPill />}
				/>
				<CurrentWeekHero summary={summary} />
				<XStack gap={layout.gap}>
					<PrevWeekCard summary={summary} />
					<TrendCard summary={summary} />
				</XStack>
				<LiftSummaryCard />
				<NotificationSettingsCard />
			</ScreenScrollView>
		</Screen>
	);
}

/**
 * 体重の入力へ向かうヘッダーのボタン（#78）
 *
 * データがあるときは画面の主役が数値なので、下部を占有せずヘッダーに小さく置く
 */
const AddWeightPill = () => {
	const theme = useTheme();

	return (
		<Link href="/(tabs)/home/add" asChild>
			<Button
				height={HEADER_PILL_HEIGHT}
				borderRadius={HEADER_PILL_HEIGHT / 2}
				borderWidth={0}
				paddingLeft={10}
				paddingRight={14}
				gap={4}
				marginBottom={4}
				backgroundColor="$accentSoft"
				color="$accent"
				fontSize={13}
				fontWeight="700"
				// 36px はタップ領域の下限に届かないので、上下に広げて 44px 相当にする
				hitSlop={{ top: 4, bottom: 4, left: 0, right: 0 }}
				pressStyle={{ backgroundColor: "$accentSoft", opacity: 0.85 }}
				icon={<Plus color={theme.accent.val} size={16} strokeWidth={2.4} />}
			>
				体重を入力
			</Button>
		</Link>
	);
};

/**
 * 下部に固定する体重の入力ボタン
 *
 * データが無いときは入力が唯一の出口なので、こちらは大きいまま残す
 */
const AddWeightButton = () => {
	const theme = useTheme();

	return (
		<BottomActionBar>
			<Link href="/(tabs)/home/add" asChild>
				<PrimaryButton
					icon={
						<Plus color={theme.onAccentFill.val} size={20} strokeWidth={2.2} />
					}
				>
					体重を入力する
				</PrimaryButton>
			</Link>
		</BottomActionBar>
	);
};

/** 今週の平均を見せるヒーロー */
const CurrentWeekHero = ({ summary }: { summary: HomeWeightSummary }) => {
	const { currentWeek, weekOverWeekDiff, weeklyAverages } = summary;

	return (
		<HeroCard>
			<XStack alignItems="center" justifyContent="space-between">
				<SizableText fontSize={13} lineHeight={18} color="$onHeroMuted">
					今週の平均
				</SizableText>
				<SizableText fontSize={13} lineHeight={18} color="$onHeroSubtle">
					{formatWeekRangeLabel(currentWeek)}
				</SizableText>
			</XStack>
			<XStack alignItems="flex-end" justifyContent="space-between">
				<XStack alignItems="baseline" gap={4}>
					<NumberText
						fontSize={heroNumberSize.home.fontSize}
						lineHeight={heroNumberSize.home.lineHeight}
						letterSpacing={-0.68}
						color="$onHero"
					>
						{formatAverage(currentWeek.average)}
					</NumberText>
					<SizableText fontSize={20} fontWeight="500" color="$onHeroMuted">
						kg
					</SizableText>
				</XStack>
				{weekOverWeekDiff !== null && (
					<WeekOverWeekBadge diff={weekOverWeekDiff} />
				)}
			</XStack>
			<YStack marginTop={8} gap={2}>
				<WeeklySparkline
					values={weeklyAverages.map((week) => week.average)}
					label={`直近${WEEKLY_AVERAGE_WEEKS}週の週平均の推移`}
				/>
				<SizableText fontSize={11} lineHeight={14} color="$onHeroSubtle">
					直近{WEEKLY_AVERAGE_WEEKS}週の週平均
				</SizableText>
			</YStack>
		</HeroCard>
	);
};

/** ヒーローの右上に出す先週比 */
const WeekOverWeekBadge = ({ diff }: { diff: number }) => {
	const theme = useTheme();

	return (
		<XStack
			alignItems="center"
			gap={4}
			height={30}
			paddingLeft={8}
			paddingRight={12}
			marginBottom={4}
			borderRadius={15}
			backgroundColor="$onHeroChip"
		>
			<DiffIcon diff={diff} size={16} color={theme.onHero.val} />
			<NumberText weight="600" fontSize={18} color="$onHero">
				{formatDiff(diff, 2)}
			</NumberText>
			<SizableText fontSize={12} fontWeight="500" color="$onHero">
				先週比
			</SizableText>
		</XStack>
	);
};

/** 統計カードの見出し */
const StatLabel = ({ children }: { children: string }) => (
	<SizableText
		fontSize={12}
		lineHeight={16}
		fontWeight="500"
		color="$textMuted"
	>
		{children}
	</SizableText>
);

/** 統計カードの補足 */
const StatCaption = ({ children }: { children: string }) => (
	<SizableText fontSize={12} lineHeight={16} color="$textMuted">
		{children}
	</SizableText>
);

/** 統計カードの単位。数値のベースラインに合わせて少し下げる */
const StatUnit = () => (
	<SizableText fontSize={13} fontWeight="500" color="$textMuted" marginTop={8}>
		kg
	</SizableText>
);

/** 先週の平均 */
const PrevWeekCard = ({ summary }: { summary: HomeWeightSummary }) => (
	<SurfaceCard
		size="small"
		flex={1}
		paddingVertical={14}
		paddingHorizontal={16}
		gap={2}
	>
		<StatLabel>先週の平均</StatLabel>
		<XStack alignItems="center" gap={6}>
			<NumberText fontSize={36} lineHeight={40}>
				{formatAverage(summary.prevWeek.average)}
			</NumberText>
			<StatUnit />
		</XStack>
		<StatCaption>{formatWeekRangeLabel(summary.prevWeek)}</StatCaption>
	</SurfaceCard>
);

/** 3ヶ月の傾向 */
const TrendCard = ({ summary }: { summary: HomeWeightSummary }) => {
	const theme = useTheme();
	const { trend } = summary;

	return (
		<SurfaceCard
			size="small"
			flex={1}
			paddingVertical={14}
			paddingHorizontal={16}
			gap={2}
		>
			<StatLabel>{`${TREND_MONTHS}ヶ月の傾向`}</StatLabel>
			<XStack alignItems="center" gap={6}>
				<NumberText fontSize={36} lineHeight={40}>
					{trend === null ? "--.-" : formatDiff(trend.diffWeight, 1)}
				</NumberText>
				<StatUnit />
				{trend !== null && (
					<View
						marginLeft="auto"
						width={28}
						height={28}
						borderRadius={14}
						backgroundColor="$accentSoft"
						alignItems="center"
						justifyContent="center"
					>
						<DiffIcon
							diff={trend.diffWeight}
							size={16}
							color={theme.accent.val}
						/>
					</View>
				)}
			</XStack>
			<StatCaption>
				{trend === null
					? "傾向を出せるだけのデータがありません"
					: `${trend.startWeight.toFixed(1)} → ${trend.endWeight.toFixed(1)} kg`}
			</StatCaption>
		</SurfaceCard>
	);
};

/**
 * BIG3 の重量の表示
 *
 * 3 種目を横に並べるので、実測（0.1kg 刻み）と推定（整数）で桁数の見え方が
 * 揃うよう、意味の無い末尾の 0 は落とす。95.0 は 95、95.5 は 95.5 のまま出す
 */
const formatLiftWeight = (weight: number) => String(Number(weight.toFixed(1)));

/** 種目ごとの自己ベスト。実測が無ければ推定 1RM を出す */
const getBestLift = (
	records: readonly LiftRecord[],
	exercise: LiftExercise,
) => {
	const { actual, estimated } = getLiftPr(records, exercise);

	if (actual) {
		return { weight: formatLiftWeight(actual.weight), isActual: true };
	}

	if (estimated) {
		return {
			weight: formatLiftWeight(roundOneRepMax(estimateOneRepMax(estimated))),
			isActual: false,
		};
	}

	return null;
};

/** BIG3 の自己ベストを 3 分割で見せる行。タップで BIG3 タブへ */
const LiftSummaryCard = () => {
	const theme = useTheme();
	const router = useRouter();

	const { data: records } = useQuery({
		queryKey: ["liftRecords"],
		queryFn: listLiftRecords,
	});

	return (
		<SurfaceCard
			paddingVertical={12}
			paddingLeft={16}
			paddingRight={14}
			accessibilityRole="button"
			accessibilityLabel="BIG3 の自己ベストを見る"
			pressStyle={{ opacity: 0.85 }}
			onPress={() => router.push("/(tabs)/lift")}
		>
			<XStack alignItems="center">
				{LIFT_EXERCISES.map((exercise, index) => {
					const best = getBestLift(records ?? [], exercise);

					return (
						<YStack
							key={exercise}
							flex={1}
							gap={2}
							// 種目の境目は縦線で区切る。左端の種目の前には引かない
							borderLeftWidth={index === 0 ? 0 : 1}
							borderColor="$cardBorder"
							paddingLeft={index === 0 ? 0 : 14}
						>
							<XStack alignItems="center" gap={4}>
								<SizableText
									fontSize={11}
									lineHeight={14}
									fontWeight="500"
									color="$textMuted"
								>
									{LIFT_EXERCISE_SHORT_LABEL[exercise]}
								</SizableText>
								{/* 実測の自己ベストがある種目だけトロフィーを付ける */}
								{best?.isActual && (
									<Trophy
										color={theme.prBadgeIcon.val}
										size={13}
										strokeWidth={2}
									/>
								)}
							</XStack>
							<XStack alignItems="baseline" gap={best === null ? 6 : 3}>
								<NumberText
									fontSize={28}
									lineHeight={30}
									color={best === null ? "$textMuted" : "$textPrimary"}
								>
									{best?.weight ?? "—"}
								</NumberText>
								<SizableText
									fontSize={best === null ? 11 : 12}
									color="$textMuted"
								>
									{best === null ? "未記録" : "kg"}
								</SizableText>
							</XStack>
						</YStack>
					);
				})}
				<View marginLeft={6}>
					<ChevronRight color={theme.textMuted.val} size={20} strokeWidth={2} />
				</View>
			</XStack>
		</SurfaceCard>
	);
};

/** 通知設定誘導カード */
const NotificationSettingsCard = () => {
	const theme = useTheme();

	// 通知許可設定の状態管理
	const [isEnabledNotifications, setIsEnabledNotifications] = useState(false);

	// 初回描画時とフォアグラウンド時に通知許可を確認
	useEffect(() => {
		/** 通知設定の許可状態を取得する */
		const checkNotificationPermissions = async () => {
			const { status } = await Notifications.getPermissionsAsync();
			setIsEnabledNotifications(status === "granted");
		};

		checkNotificationPermissions();

		const handleChangeAppState = (nextAppState: AppStateStatus) => {
			if (nextAppState === "active") {
				checkNotificationPermissions();
			}
		};
		const subscription = AppState.addEventListener(
			"change",
			handleChangeAppState,
		);
		return () => {
			subscription.remove();
		};
	}, []);

	// 通知が許可されている場合はカードを非表示にする
	if (isEnabledNotifications) {
		return null;
	}

	// 通知が許可されていない場合に通知誘導カードを表示する
	return (
		// TODO:端末設定ではなくアプリ内で通知設定を保存できるようにする
		<SurfaceCard padding={14}>
			<XStack alignItems="center" gap={12}>
				<View
					width={40}
					height={40}
					borderRadius={20}
					backgroundColor="$accentSoft"
					alignItems="center"
					justifyContent="center"
				>
					<Bell color={theme.accent.val} size={20} strokeWidth={2} />
				</View>
				<SizableText
					flex={1}
					fontSize={14}
					lineHeight={22}
					color="$textPrimary"
				>
					通知を有効にすると、
					<SizableText fontSize={14} fontWeight="800" color="$accent">
						毎朝8時
					</SizableText>
					に体重データを通知します。
				</SizableText>
			</XStack>
			<Button
				marginTop={12}
				height={42}
				borderRadius={21}
				borderWidth={0}
				backgroundColor="$accentSoft"
				color="$accent"
				fontSize={14}
				fontWeight="700"
				pressStyle={{ backgroundColor: "$accentSoft", opacity: 0.85 }}
				onPress={() => Linking.openSettings()}
				icon={<Settings color={theme.accent.val} size={17} strokeWidth={2} />}
				iconAfter={
					<ExternalLink color={theme.accent.val} size={14} strokeWidth={2.2} />
				}
			>
				設定を開く
			</Button>
		</SurfaceCard>
	);
};

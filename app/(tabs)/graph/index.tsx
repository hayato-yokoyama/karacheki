import { ErrorHealthData } from "@/components/errorHealthData";
import {
	type GraphPoint,
	type GraphWindow,
	clampWindowEnd,
	formatWindowLabel,
	getWindow,
	getYRange,
	isShowingLatest,
	panToEndMs,
	sliceByWindow,
} from "@/services/graphWindow";
import {
	fetchAllWeights,
	transformWeightDataForGraph,
	useWeightRefetchOnActive,
} from "@/services/weightService";
import { matchFont } from "@shopify/react-native-skia";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Stack } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { type LayoutChangeEvent, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
	Button,
	ScrollView,
	Separator,
	SizableText,
	Spinner,
	Tabs,
	Text,
	View,
	XStack,
	YStack,
	useTheme,
} from "tamagui";
import { CartesianChart, Line, Scatter } from "victory-native";

/** グラフの表示期間幅（月） */
const MONTH_OPTIONS = [1, 3, 6, 12] as const;

export default function Graph() {
	const theme = useTheme();

	// 全期間のデータを取得する（過去へ遡れるようにするため期間を絞らない）
	const {
		data: fetchedWeights,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["graphWeights", "all"],
		queryFn: fetchAllWeights,
	});

	// 画面フォーカス時やフォアグラウンド復帰時に体重を再取得する
	useWeightRefetchOnActive(refetch);

	/** 表示期間幅（月） */
	const [months, setMonths] = useState<number>(3);
	/** 表示窓の終端時刻。スケールを切り替えても引き継ぐ */
	const [endMs, setEndMs] = useState<number>(() => Date.now());

	/** グラフ用の体重データ（日時・実測データ・傾向データ） */
	// パン中の再レンダーごとに全期間ぶんを計算し直さないようメモ化する
	const weightForGraph = useMemo(
		() => (fetchedWeights ? transformWeightDataForGraph(fetchedWeights) : []),
		[fetchedWeights],
	);

	if (isLoading) {
		return (
			<>
				<Stack.Screen
					options={{
						title: "グラフ",
						headerStyle: { backgroundColor: theme.background0.val },
					}}
				/>
				<YStack
					padding="$8"
					height={400}
					alignItems="center"
					justifyContent="center"
				>
					<Spinner size="small" />
				</YStack>
			</>
		);
	}

	// 体重未入力・パーミッションエラー
	if (error || fetchedWeights === undefined || fetchedWeights.length === 0) {
		return (
			<>
				<Stack.Screen
					options={{
						title: "グラフ",
						headerStyle: { backgroundColor: theme.background0.val },
					}}
				/>
				<ErrorHealthData />
			</>
		);
	}

	return (
		<>
			<Stack.Screen
				options={{
					title: "グラフ",
					headerStyle: { backgroundColor: theme.background0.val },
				}}
			/>
			<ScrollView>
				<YStack paddingVertical="$8" paddingHorizontal="$4">
					{/* グラフの見出し */}
					<XStack alignItems="center" justifyContent="center" gap="$4">
						<XStack alignItems="center" gap="$2">
							<View width="$1" height="$0.5" backgroundColor="$color7" />
							<Text>実測データ</Text>
						</XStack>
						<XStack alignItems="center" gap="$2">
							<View width="$1" height="$0.5" backgroundColor="$accentColor" />
							<Text>傾向データ</Text>
						</XStack>
					</XStack>
					{/* グラフ */}
					<Tabs
						value={String(months)}
						onValueChange={(value) => setMonths(Number(value))}
						orientation="horizontal"
						flexDirection="column"
						width="100%"
						height={540}
						overflow="hidden"
					>
						<Tabs.Content value={String(months)}>
							<GraphContent
								months={months}
								endMs={endMs}
								onChangeEndMs={setEndMs}
								data={weightForGraph}
							/>
						</Tabs.Content>

						<Tabs.List separator={<Separator vertical />} marginTop="$4">
							{MONTH_OPTIONS.map((month) => (
								<Tabs.Tab key={month} flex={1} value={String(month)}>
									<SizableText>
										{month === 12 ? "1年" : `${month}ヶ月`}
									</SizableText>
								</Tabs.Tab>
							))}
						</Tabs.List>
					</Tabs>
				</YStack>
			</ScrollView>
		</>
	);
}

const graphAxisFont = matchFont({
	fontFamily: Platform.select({ ios: "Helvetica", default: "serif" }),
	fontSize: 12,
});

const GraphContent = ({
	months,
	endMs,
	onChangeEndMs,
	data,
}: {
	months: number;
	endMs: number;
	onChangeEndMs: (endMs: number) => void;
	data: GraphPoint[];
}) => {
	const theme = useTheme();

	const nowMs = Date.now();
	const oldestMs = data[0]?.date ?? nowMs;

	// 端（最古データ〜今日）を超えないように表示位置を丸める
	const clampedEndMs = clampWindowEnd({ endMs, months, oldestMs, nowMs });
	const visibleWindow: GraphWindow = getWindow(clampedEndMs, months);

	const visibleData = sliceByWindow(data, visibleWindow);
	const yRange = getYRange(visibleData, visibleWindow);

	// ジェスチャーのコールバックから常に最新値を読めるようにする
	const chartWidthRef = useRef(0);
	const panRef = useRef({ months, endMs: clampedEndMs, oldestMs });
	panRef.current = { months, endMs: clampedEndMs, oldestMs };

	const handleLayout = (event: LayoutChangeEvent) => {
		chartWidthRef.current = event.nativeEvent.layout.width;
	};

	const panGesture = useMemo(
		() =>
			Gesture.Pan()
				// 表示位置を React の state で持つため、コールバックは JS スレッドで動かす
				.runOnJS(true)
				// 縦スクロールを潰さないよう、横方向が優勢なときだけパンを開始する
				.activeOffsetX([-10, 10])
				.failOffsetY([-10, 10])
				.onChange((event) => {
					const {
						months: currentMonths,
						endMs: currentEndMs,
						oldestMs: currentOldestMs,
					} = panRef.current;
					const pannedEndMs = panToEndMs({
						endMs: currentEndMs,
						deltaX: event.changeX,
						chartWidth: chartWidthRef.current,
						months: currentMonths,
					});
					// 端で行き過ぎが溜まらないよう、state に入れる前に丸める
					onChangeEndMs(
						clampWindowEnd({
							endMs: pannedEndMs,
							months: currentMonths,
							oldestMs: currentOldestMs,
							nowMs: Date.now(),
						}),
					);
				}),
		[onChangeEndMs],
	);

	return (
		<YStack gap="$1" height={470}>
			{/* 表示中の期間と、今日へ戻る導線 */}
			<XStack alignItems="center" justifyContent="space-between" height="$2">
				<Text fontSize={12} color="$color11">
					{formatWindowLabel(visibleWindow)}
				</Text>
				{isShowingLatest(clampedEndMs, nowMs) ? null : (
					<Button size="$2" onPress={() => onChangeEndMs(Date.now())}>
						今日へ
					</Button>
				)}
			</XStack>
			<Text fontSize={12}>（ ㎏ ）</Text>
			<GestureDetector gesture={panGesture}>
				<View flex={1} onLayout={handleLayout}>
					<CartesianChart
						data={visibleData}
						xKey="date"
						yKeys={["actualWeight", "trendWeight"]}
						// 表示窓をそのまま定義域にする。窓の外のデータはクリップされる
						domain={{
							x: [visibleWindow.startMs, visibleWindow.endMs],
							y: yRange,
						}}
						axisOptions={{
							font: graphAxisFont,
							formatYLabel: (value) => (value ? value.toFixed(1) : ""),
							formatXLabel: (value) => {
								if (!value) {
									return "";
								}
								return format(
									new Date(value),
									months === 12 ? "yyyy/MM" : "M/d",
								);
							},
							labelPosition: { x: "outset", y: "outset" },
							labelOffset: { x: 8, y: 8 },
							tickCount: {
								x: 4,
								y: 6,
							},
							lineColor: theme.color5.val,
							labelColor: theme.color12.val,
						}}
						// biome-ignore lint: correctness/noChildrenProp: Childrenで渡すとエラーになるためignore
						children={({ points }) => (
							<>
								<Line
									points={points.actualWeight}
									color={theme.color7.val}
									strokeWidth={months === 12 || months === 6 ? 1 : 2}
								/>
								{months === 1 ? (
									<Scatter
										points={points.actualWeight}
										color={theme.color7.val}
										radius={3}
									/>
								) : null}
								<Line
									points={points.trendWeight}
									color={theme.accentColor.val}
									strokeWidth={months === 12 || months === 6 ? 2 : 3}
								/>
								{months === 1 ? (
									<Scatter
										points={points.trendWeight}
										color={theme.accentColor.val}
										radius={3}
									/>
								) : null}
							</>
						)}
					/>
				</View>
			</GestureDetector>
		</YStack>
	);
};

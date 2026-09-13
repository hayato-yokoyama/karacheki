import { ErrorHealthData } from "@/components/errorHealthData";
import {
	FLING_DURATION_MS,
	type GraphPoint,
	type GraphWindow,
	SCROLL_TO_LATEST_DURATION_MS,
	clampCardLeft,
	clampWindowEnd,
	easeOutCubic,
	findNearestPoint,
	flingToEndMs,
	formatWindowLabel,
	getInitialEndMs,
	getWindow,
	getXTickValues,
	getYRange,
	isShowingLatest,
	msToX,
	panToEndMs,
	sliceByWindow,
	xToMs,
} from "@/services/graphWindow";
import {
	fetchAllWeights,
	transformWeightDataForGraph,
	useWeightRefetchOnActive,
} from "@/services/weightService";
import {
	Circle,
	Line as SkiaLine,
	matchFont,
	vec,
} from "@shopify/react-native-skia";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type LayoutChangeEvent, Platform } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
	Button,
	type ColorTokens,
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
import type { ChartBounds } from "victory-native";
import { CartesianChart, Line, Scatter } from "victory-native";

/** グラフの表示期間幅（月） */
const MONTH_OPTIONS = [1, 3, 6, 12] as const;

/** 初期表示の期間幅（月） */
const DEFAULT_MONTHS = 3;

/** X軸の目盛りの数 */
const X_TICK_COUNT = 4;

/** 選択中の値を表示するカードの幅 */
const CARD_WIDTH = 132;

/** 選択の有無でグラフの高さが動かないよう、カードのために常に空けておく高さ */
const CARD_AREA_HEIGHT = 76;

/** カードをプロット領域の端から離す余白 */
const CARD_EDGE_PADDING = 4;

/** グラフ本体（カード置き場を含む）の高さ */
const GRAPH_HEIGHT = 470 + CARD_AREA_HEIGHT;

/** 指が動いたらパンに譲るしきい値(px) */
const TAP_MAX_DISTANCE = 10;

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
	const [months, setMonths] = useState<number>(DEFAULT_MONTHS);
	/**
	 * 表示窓の終端時刻。スケールを切り替えても引き継ぐ
	 *
	 * まだ一度も動かしていない間は null にして、データから決めた初期位置を使う
	 */
	const [endMs, setEndMs] = useState<number | null>(null);

	/** グラフ用の体重データ（日時・実測データ・傾向データ） */
	// パン中の再レンダーごとに全期間ぶんを計算し直さないようメモ化する
	const weightForGraph = useMemo(
		() => (fetchedWeights ? transformWeightDataForGraph(fetchedWeights) : []),
		[fetchedWeights],
	);

	// 最後に記録したのが表示幅より前でも、開いた時点でデータが見えるようにする
	const initialEndMs = useMemo(
		() =>
			getInitialEndMs({
				newestMs: weightForGraph.at(-1)?.date,
				nowMs: Date.now(),
				months: DEFAULT_MONTHS,
			}),
		[weightForGraph],
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
						height={GRAPH_HEIGHT + 70}
						overflow="hidden"
					>
						<Tabs.Content value={String(months)}>
							<GraphContent
								months={months}
								endMs={endMs ?? initialEndMs}
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

	// パン中は毎フレーム再レンダーされるため、窓の導出はメモ化しておく
	const visibleWindow: GraphWindow = useMemo(
		() => getWindow(clampedEndMs, months),
		[clampedEndMs, months],
	);
	const visibleData = useMemo(
		() => sliceByWindow(data, visibleWindow),
		[data, visibleWindow],
	);
	const yRange = useMemo(
		() => getYRange(visibleData, visibleWindow),
		[visibleData, visibleWindow],
	);
	const xTickValues = useMemo(
		() =>
			getXTickValues(visibleWindow, {
				count: X_TICK_COUNT,
				// 長い期間では月初に揃えたほうが読みやすい
				snapToMonth: months >= 6,
			}),
		[visibleWindow, months],
	);

	/** タップで選択中のデータの日時。未選択は null */
	const [selectedMs, setSelectedMs] = useState<number | null>(null);

	// sliceByWindow は線を端まで届かせるために窓の前後1点も返すため、
	// 画面に見えていない点を選んでしまわないようここで落とす
	const selectablePoints = useMemo(
		() =>
			visibleData.filter(
				(point) =>
					point.date >= visibleWindow.startMs &&
					point.date <= visibleWindow.endMs,
			),
		[visibleData, visibleWindow],
	);

	// 選択した日が窓の外へ出たときも、再取得で消えたときも、同じく表示しない。
	// 選択自体は保持したままなので、窓の中に戻ってくれば再び表示される
	const selectedPoint = useMemo(
		() =>
			selectedMs === null
				? null
				: (selectablePoints.find((point) => point.date === selectedMs) ?? null),
		[selectablePoints, selectedMs],
	);

	// ジェスチャーのコールバックから常に最新値を読めるようにする
	const chartWidthRef = useRef(0);
	const chartBoundsRef = useRef<ChartBounds | null>(null);
	const tapRef = useRef({ window: visibleWindow, points: selectablePoints });
	tapRef.current = { window: visibleWindow, points: selectablePoints };

	// カードとガイド線の位置決めに使うため、プロット領域は描画にも反映させる
	const [chartBounds, setChartBounds] = useState<ChartBounds | null>(null);
	const panRef = useRef({ months, endMs: clampedEndMs, oldestMs });
	panRef.current = { months, endMs: clampedEndMs, oldestMs };

	// レイアウト確定直後、プロット領域が確定するまでの暫定値
	const handleLayout = (event: LayoutChangeEvent) => {
		chartWidthRef.current = event.nativeEvent.layout.width;
	};

	// 指の移動量を時間に換算する基準は、Y軸ラベルを除いたプロット領域の幅
	const handleChartBoundsChange = (bounds: ChartBounds) => {
		chartWidthRef.current = bounds.right - bounds.left;
		chartBoundsRef.current = bounds;
		// 毎回新しいオブジェクトで渡ってくるため、値が変わったときだけ state を更新する
		setChartBounds((prev) =>
			prev &&
			prev.left === bounds.left &&
			prev.right === bounds.right &&
			prev.top === bounds.top &&
			prev.bottom === bounds.bottom
				? prev
				: bounds,
		);
	};

	/** 表示位置を端に収める */
	const clampToEdges = useCallback((targetEndMs: number) => {
		const { months: currentMonths, oldestMs: currentOldestMs } = panRef.current;

		return clampWindowEnd({
			endMs: targetEndMs,
			months: currentMonths,
			oldestMs: currentOldestMs,
			nowMs: Date.now(),
		});
	}, []);

	// 実行中のアニメーションのフレーム ID
	const animationRef = useRef<number | null>(null);

	const stopAnimation = useCallback(() => {
		if (animationRef.current !== null) {
			cancelAnimationFrame(animationRef.current);
			animationRef.current = null;
		}
	}, []);

	/** 現在位置から目標位置まで、減速しながらスライドする */
	const animateToEndMs = useCallback(
		(targetEndMs: number, durationMs: number) => {
			stopAnimation();

			const fromEndMs = panRef.current.endMs;
			const toEndMs = clampToEdges(targetEndMs);
			const startedAt = Date.now();

			const step = () => {
				const progress = (Date.now() - startedAt) / durationMs;
				const eased = easeOutCubic(progress);

				const next = clampToEdges(fromEndMs + (toEndMs - fromEndMs) * eased);
				// 次のレンダーを待たずに現在位置を更新する
				panRef.current.endMs = next;
				onChangeEndMs(next);

				if (progress < 1) {
					animationRef.current = requestAnimationFrame(step);
					return;
				}
				animationRef.current = null;
			};

			animationRef.current = requestAnimationFrame(step);
		},
		[clampToEdges, onChangeEndMs, stopAnimation],
	);

	// 画面から離れるときにアニメーションを止める
	useEffect(() => stopAnimation, [stopAnimation]);

	const panGesture = useMemo(
		() =>
			Gesture.Pan()
				// 表示位置を React の state で持つため、コールバックは JS スレッドで動かす
				.runOnJS(true)
				// 縦スクロールを潰さないよう、横方向が優勢なときだけパンを開始する
				.activeOffsetX([-10, 10])
				.failOffsetY([-10, 10])
				// 慣性で滑っている途中に触られたら、その場で止めて指に追従させる
				.onBegin(stopAnimation)
				.onChange((event) => {
					const { months: currentMonths, endMs: currentEndMs } = panRef.current;
					const pannedEndMs = panToEndMs({
						endMs: currentEndMs,
						deltaX: event.changeX,
						chartWidth: chartWidthRef.current,
						months: currentMonths,
					});
					// 端で行き過ぎが溜まらないよう、state に入れる前に丸める
					const next = clampToEdges(pannedEndMs);
					// 1フレームに複数イベントが届いても移動量を取りこぼさないよう、
					// レンダーを待たずに現在位置を進めておく
					panRef.current.endMs = next;
					onChangeEndMs(next);
				})
				.onEnd((event, success) => {
					// 途中でキャンセルされたときは滑らせない
					if (!success) {
						return;
					}

					// 指を離したあとも慣性で滑らせて、1回のスワイプで長く移動できるようにする
					const { months: currentMonths, endMs: currentEndMs } = panRef.current;

					animateToEndMs(
						flingToEndMs({
							endMs: currentEndMs,
							velocityX: event.velocityX,
							chartWidth: chartWidthRef.current,
							months: currentMonths,
						}),
						FLING_DURATION_MS,
					);
				}),
		[animateToEndMs, clampToEdges, onChangeEndMs, stopAnimation],
	);

	const tapGesture = useMemo(
		() =>
			Gesture.Tap()
				// 選択状態を React の state で持つため、コールバックは JS スレッドで動かす
				.runOnJS(true)
				// 指が動いたら選択ではなくパンとして扱う
				.maxDistance(TAP_MAX_DISTANCE)
				.onEnd((event, success) => {
					if (!success) {
						return;
					}

					const bounds = chartBoundsRef.current;
					// X軸ラベルや余白の誤タップで選択が動かないよう、プロット領域の中だけ拾う
					if (
						bounds === null ||
						event.x < bounds.left ||
						event.x > bounds.right ||
						event.y < bounds.top ||
						event.y > bounds.bottom
					) {
						return;
					}

					const { window, points } = tapRef.current;
					const nearest = findNearestPoint(
						points,
						xToMs({ x: event.x, window, bounds }),
					);
					if (nearest === null) {
						return;
					}

					Haptics.selectionAsync();
					// 同じ点をもう一度タップしたら選択を解除する
					setSelectedMs((prev) =>
						prev === nearest.date ? null : nearest.date,
					);
				}),
		[],
	);

	// 横に動かせばパン、動かさなければ選択、と指の動きで振り分ける
	const gesture = useMemo(
		() => Gesture.Race(panGesture, tapGesture),
		[panGesture, tapGesture],
	);

	/** 選択中の点のX座標(px)。カードとガイド線で共有する */
	const selectedX =
		selectedPoint === null || chartBounds === null
			? null
			: msToX({
					ms: selectedPoint.date,
					window: visibleWindow,
					bounds: chartBounds,
				});

	return (
		<YStack gap="$1" height={GRAPH_HEIGHT}>
			{/* 表示中の期間と、今日へ戻る導線 */}
			<XStack alignItems="center" justifyContent="space-between" height="$2">
				<Text fontSize={12} color="$color11">
					{formatWindowLabel(visibleWindow)}
				</Text>
				{isShowingLatest(clampedEndMs, nowMs) ? null : (
					<Button
						size="$2"
						onPress={() =>
							animateToEndMs(Date.now(), SCROLL_TO_LATEST_DURATION_MS)
						}
					>
						今日へ
					</Button>
				)}
			</XStack>
			{/* カードの置き場。選択の有無でグラフの高さが動かないよう常に確保する */}
			<View height={CARD_AREA_HEIGHT}>
				{selectedPoint !== null &&
				selectedX !== null &&
				chartBounds !== null ? (
					<SelectedPointCard
						point={selectedPoint}
						left={clampCardLeft({
							centerX: selectedX,
							cardWidth: CARD_WIDTH,
							bounds: chartBounds,
							padding: CARD_EDGE_PADDING,
						})}
					/>
				) : null}
			</View>
			<Text fontSize={12}>（ ㎏ ）</Text>
			<GestureDetector gesture={gesture}>
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
						onChartBoundsChange={handleChartBoundsChange}
						// X軸は目盛りの位置を自前で決めるため xAxis 側で指定する。
						// axisOptions の x 向けの指定はこの場合使われない
						xAxis={{
							font: graphAxisFont,
							tickCount: X_TICK_COUNT,
							tickValues: xTickValues,
							formatXLabel: (value) => {
								if (!value) {
									return "";
								}
								return format(
									new Date(value),
									months === 12 ? "yyyy/MM" : "M/d",
								);
							},
							labelPosition: "outset",
							labelOffset: 8,
							lineColor: theme.color5.val,
							labelColor: theme.color12.val,
						}}
						axisOptions={{
							font: graphAxisFont,
							formatYLabel: (value) => (value ? value.toFixed(1) : ""),
							labelPosition: { x: "outset", y: "outset" },
							labelOffset: { x: 8, y: 8 },
							tickCount: {
								x: X_TICK_COUNT,
								y: 6,
							},
							lineColor: theme.color5.val,
							labelColor: theme.color12.val,
						}}
						// biome-ignore lint: correctness/noChildrenProp: Childrenで渡すとエラーになるためignore
						children={({ points, chartBounds: bounds }) => {
							// ハイライトの高さは、線を描くのに使われた座標をそのまま使う
							const selectedActualY =
								selectedPoint === null
									? null
									: (points.actualWeight.find(
											(point) => point.xValue === selectedPoint.date,
										)?.y ?? null);
							const selectedTrendY =
								selectedPoint === null
									? null
									: (points.trendWeight.find(
											(point) => point.xValue === selectedPoint.date,
										)?.y ?? null);

							return (
								<>
									{/* ガイド線はデータ線を隠さないよう下に敷く */}
									{selectedX === null ? null : (
										<SkiaLine
											p1={vec(selectedX, bounds.top)}
											p2={vec(selectedX, bounds.bottom)}
											color={theme.color8.val}
											strokeWidth={1}
										/>
									)}
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
									{/* ハイライトは最前面に置く */}
									{selectedX !== null && selectedActualY !== null ? (
										<Circle
											cx={selectedX}
											cy={selectedActualY}
											r={5}
											color={theme.color7.val}
										/>
									) : null}
									{selectedX !== null && selectedTrendY !== null ? (
										<Circle
											cx={selectedX}
											cy={selectedTrendY}
											r={5}
											color={theme.accentColor.val}
										/>
									) : null}
								</>
							);
						}}
					/>
				</View>
			</GestureDetector>
		</YStack>
	);
};

/** カード内の1行（凡例と同じ色の印・ラベル・値） */
const SelectedValueRow = ({
	color,
	label,
	value,
}: {
	color: ColorTokens;
	label: string;
	value: string;
}) => (
	<XStack alignItems="center" justifyContent="space-between">
		<XStack alignItems="center" gap="$1.5">
			<View width={8} height={8} borderRadius={4} backgroundColor={color} />
			<Text fontSize={11} color="$color11">
				{label}
			</Text>
		</XStack>
		<Text fontSize={12} fontWeight="700">
			{value}
		</Text>
	</XStack>
);

/** タップで選択した1点の日時・実測・傾向を出すカード */
const SelectedPointCard = ({
	point,
	left,
}: {
	point: GraphPoint;
	left: number;
}) => {
	// 傾向データは移動平均のため、記録を始めて10日に満たない期間は求まらない
	const trendLabel =
		point.trendWeight === null ? "-" : `${point.trendWeight.toFixed(1)}kg`;

	return (
		<YStack
			position="absolute"
			bottom={0}
			left={left}
			width={CARD_WIDTH}
			paddingVertical="$2"
			paddingHorizontal="$2.5"
			gap="$1"
			borderRadius="$4"
			borderWidth={1}
			borderColor="$color5"
			backgroundColor="$background"
			accessible
			accessibilityLabel={`${format(new Date(point.date), "yyyy年M月d日")} 実測${point.actualWeight.toFixed(1)}キログラム 傾向${
				point.trendWeight === null
					? "データなし"
					: `${point.trendWeight.toFixed(1)}キログラム`
			}`}
		>
			<SelectedValueRow
				color="$color7"
				label="実測"
				value={`${point.actualWeight.toFixed(1)}kg`}
			/>
			<SelectedValueRow color="$accentColor" label="傾向" value={trendLabel} />
			<Text fontSize={11} color="$color11" textAlign="right">
				{format(new Date(point.date), "yyyy/M/d")}
			</Text>
		</YStack>
	);
};

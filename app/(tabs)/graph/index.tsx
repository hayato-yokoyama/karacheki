import { BarlowCondensed_600SemiBold } from "@expo-google-fonts/barlow-condensed";
import {
	Circle,
	DashPathEffect,
	Line as SkiaLine,
	useFont,
	vec,
} from "@shopify/react-native-skia";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import * as Haptics from "expo-haptics";
import { Link } from "expo-router";
import { ChartLine, Plus } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Line as SvgLine, Path as SvgPath } from "react-native-svg";
import { SizableText, Spinner, useTheme, View, XStack, YStack } from "tamagui";
import type { ChartBounds } from "victory-native";
import { CartesianChart, Line, Scatter } from "victory-native";
import { HealthPermissionGuide } from "@/components/errorHealthData";
import {
	SegmentedControl,
	type SegmentOption,
} from "@/components/segmentedControl";
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
	clampCardLeft,
	clampWindowEnd,
	easeOutCubic,
	FLING_DURATION_MS,
	findNearestPoint,
	flingToEndMs,
	formatDiffWeight,
	formatWindowLabel,
	type GraphPoint,
	type GraphWindow,
	getInitialEndMs,
	getTrendSummary,
	getWindow,
	getXTickValues,
	getYRange,
	isShowingLatest,
	msToX,
	panToEndMs,
	SCROLL_TO_LATEST_DURATION_MS,
	sliceByWindow,
	type TrendSummary,
	xToMs,
} from "@/services/graphWindow";
import {
	fetchAllWeights,
	transformWeightDataForGraph,
	useWeightRefetchOnActive,
} from "@/services/weightService";
import { radius } from "@/theme/designTokens";

/** グラフの表示期間幅（月） */
const MONTH_OPTIONS = [1, 3, 6, 12] as const;

/**
 * 期間切り替えの選択肢
 *
 * セグメントの値は文字列のため、月数は文字列にして持つ
 */
const MONTH_SEGMENTS: SegmentOption<string>[] = MONTH_OPTIONS.map((month) => ({
	value: String(month),
	label: month === 12 ? "1年" : `${month}ヶ月`,
}));

/** 初期表示の期間幅（月） */
const DEFAULT_MONTHS = 3;

/** X軸の目盛りの数 */
const X_TICK_COUNT = 4;

/** Y軸の目盛りの数 */
const Y_TICK_COUNT = 5;

/** グラフカードの高さと内側の余白 */
const CARD_HEIGHT = 436;
const CARD_PADDING = 12;

/**
 * プロット領域の外に取る余白
 *
 * 上は値のピルと Y軸の単位（kg）の置き場。
 * 右は最新点の二重丸のぶん。プロット領域の右端に点が来るため、
 * 逃げが無いとキャンバスからはみ出して丸が半分に切れる。
 *
 * victory-native はプロット領域の中身を chartBounds でクリップするので、
 * ここで空けた外側に描くものは renderOutside に渡す
 */
const CHART_PADDING = {
	top: 34,
	right: 8,
	bottom: 0,
	left: 0,
} as const;

/** タップした値を出すピル */
const PILL_WIDTH = 92;
const PILL_HEIGHT = 26;

/** 最新点から下ろす破線の上端。ピルの高さの中ほどに合わせる */
const LATEST_LINE_TOP = PILL_HEIGHT / 2 + 1;

/** 傾向線の太さ。スケールを変えても主役の見え方を変えない */
const TREND_LINE_WIDTH = 3.6;

/** 実測線の太さ。長い期間は点が詰まるので細くする */
const ACTUAL_LINE_WIDTH = { short: 1.8, long: 1.2 } as const;

/** 最新点の二重丸。淡い外円 → カード色の縁 → 実点の順に重ねて、幅 2 の縁を作る */
const LATEST_HALO_RADIUS = 9;
const LATEST_RING_RADIUS = 6;
const LATEST_DOT_RADIUS = 4;

/** 指が動いたらパンに譲るしきい値(px) */
const TAP_MAX_DISTANCE = 10;

/** 主役の増減の字。ヒーローカードの主数値（`heroNumberSize`）に並ぶ大きさ */
const TREND_NUMBER_SIZE = { fontSize: 68, lineHeight: 70 } as const;

export default function Graph() {
	// 全期間のデータを取得する（過去へ遡れるようにするため期間を絞らない）
	const {
		data: fetchedWeights,
		isLoading,
		error,
		refetch,
	} = useQuery({
		// ホームと同じキャッシュを見る。同じ全期間のデータを二重に取りに行かない
		queryKey: ["weights", "all"],
		queryFn: fetchAllWeights,
	});

	// 画面フォーカス時やフォアグラウンド復帰時に体重を再取得する
	useWeightRefetchOnActive(refetch);

	/**
	 * 表示期間幅（月）と表示窓の終端時刻
	 *
	 * 再取得が一度こけて「データなし」に落ちても、戻ってきたときに
	 * 見ていた期間と位置のままにしたいので、出し分けより上で持つ。
	 * 終端時刻はまだ一度も動かしていない間は null にして、データから決めた初期位置を使う
	 */
	const [months, setMonths] = useState<number>(DEFAULT_MONTHS);
	const [endMs, setEndMs] = useState<number | null>(null);

	/** グラフ用の体重データ（日時・実測データ・傾向データ） */
	// パン中の再レンダーごとに全期間ぶんを計算し直さないようメモ化する
	const weightForGraph = useMemo(
		() => (fetchedWeights ? transformWeightDataForGraph(fetchedWeights) : []),
		[fetchedWeights],
	);

	if (isLoading) {
		return (
			<Screen>
				<ScreenScrollView>
					<ScreenHeader title="グラフ" />
					<YStack height={400} alignItems="center" justifyContent="center">
						<Spinner size="small" />
					</YStack>
				</ScreenScrollView>
			</Screen>
		);
	}

	// 体重未入力・パーミッションエラー
	if (error || fetchedWeights === undefined || fetchedWeights.length === 0) {
		return <GraphEmpty />;
	}

	return (
		<GraphContent
			data={weightForGraph}
			months={months}
			onChangeMonths={setMonths}
			endMs={endMs}
			onChangeEndMs={setEndMs}
		/>
	);
}

/**
 * データがあるときのグラフ画面
 *
 * 渡された表示窓（期間幅と終端時刻）から、見出し・傾向のサマリー・グラフの3つを導く。
 * 「この期間の傾向」を主役にするため、窓から導いた値は上から下へ一方向に流す
 */
const GraphContent = ({
	data,
	months,
	onChangeMonths,
	endMs,
	onChangeEndMs,
}: {
	data: GraphPoint[];
	months: number;
	onChangeMonths: (months: number) => void;
	endMs: number | null;
	onChangeEndMs: (endMs: number) => void;
}) => {
	const theme = useTheme();
	// 軸ラベルの書体。Skia は Tamagui のフォント設定を見ないので直接読む。
	// 読み終わるまでは null で、そのあいだ軸ラベルは描かれない
	const xAxisFont = useFont(BarlowCondensed_600SemiBold, 12);
	const yAxisFont = useFont(BarlowCondensed_600SemiBold, 11);

	// 最後に記録したのが表示幅より前でも、開いた時点でデータが見えるようにする
	const initialEndMs = useMemo(
		() =>
			getInitialEndMs({
				newestMs: data.at(-1)?.date,
				nowMs: Date.now(),
				months: DEFAULT_MONTHS,
			}),
		[data],
	);

	const nowMs = Date.now();
	const oldestMs = data[0]?.date ?? nowMs;

	// 端（最古データ〜今日）を超えないように表示位置を丸める
	const clampedEndMs = clampWindowEnd({
		endMs: endMs ?? initialEndMs,
		months,
		oldestMs,
		nowMs,
	});

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

	// victory-native はこの2つを主要な useMemo の依存に入れているので、参照を固定する
	const domain = useMemo(
		() => ({
			x: [visibleWindow.startMs, visibleWindow.endMs] as [number, number],
			y: yRange,
		}),
		[visibleWindow, yRange],
	);

	/** 見出しの下に出す、表示中の期間の増減 */
	const trendSummary = useMemo(
		() => getTrendSummary(visibleData, visibleWindow),
		[visibleData, visibleWindow],
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

	// 二重丸と破線で指す点。「今」ではなく「表示中の期間でいちばん新しい傾向データ」なので、
	// 過去へスライドすると窓の右端の点に付く（どこまでの話を見ているかが分かる）
	const latestTrendMs = useMemo(() => {
		for (let i = selectablePoints.length - 1; i >= 0; i--) {
			if (selectablePoints[i].trendWeight !== null) {
				return selectablePoints[i].date;
			}
		}

		return null;
	}, [selectablePoints]);

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

	// ピルとガイド線の位置決めに使うため、プロット領域は描画にも反映させる
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

	/** 選択中の点のX座標(px)。ピルとガイド線で共有する */
	const selectedX =
		selectedPoint === null || chartBounds === null
			? null
			: msToX({
					ms: selectedPoint.date,
					window: visibleWindow,
					bounds: chartBounds,
				});

	return (
		<Screen>
			<ScreenScrollView withBottomAction>
				<ScreenHeader
					label={formatWindowLabel(visibleWindow)}
					title="グラフ"
					right={
						isShowingLatest(clampedEndMs, nowMs) ? undefined : (
							<ScrollToLatestButton
								onPress={() =>
									animateToEndMs(Date.now(), SCROLL_TO_LATEST_DURATION_MS)
								}
							/>
						)
					}
				/>
				<XStack
					alignItems="flex-end"
					justifyContent="space-between"
					paddingHorizontal={4}
				>
					<WindowTrendSummary summary={trendSummary} />
					<GraphLegend />
				</XStack>
				<SurfaceCard height={CARD_HEIGHT} padding={CARD_PADDING}>
					<YStack flex={1}>
						<GestureDetector gesture={gesture}>
							<View
								flex={1}
								onLayout={handleLayout}
								accessible
								accessibilityRole="image"
								accessibilityLabel="体重の実測データと傾向データの折れ線グラフ"
							>
								<CartesianChart
									data={visibleData}
									xKey="date"
									yKeys={["actualWeight", "trendWeight"]}
									padding={CHART_PADDING}
									// 表示窓をそのまま定義域にする。窓の外のデータはクリップされる
									domain={domain}
									onChartBoundsChange={handleChartBoundsChange}
									/*
									 * 最新点の目印
									 *
									 * children はプロット領域でクリップされるため、
									 * 上へ伸ばす破線も、右端の点からはみ出す二重丸も切られてしまう。
									 * クリップの外で最前面に描かれる renderOutside に出す
									 * （デザインでも折れ線より上に重ねている）
									 */
									renderOutside={({ points, chartBounds: bounds }) => {
										const latest =
											latestTrendMs === null
												? null
												: (points.trendWeight.find(
														(point) => point.xValue === latestTrendMs,
													) ?? null);

										if (latest === null) {
											return null;
										}

										// 傾向が求まらない日は線に高さが無いので、破線だけ引いて丸は置かない
										const latestY = latest.y ?? null;

										return (
											<>
												<SkiaLine
													p1={vec(latest.x, LATEST_LINE_TOP)}
													p2={vec(latest.x, bounds.bottom)}
													color={theme.accent.val}
													strokeWidth={1}
													opacity={0.6}
												>
													<DashPathEffect intervals={[3, 3]} />
												</SkiaLine>
												{latestY === null ? null : (
													<>
														<Circle
															cx={latest.x}
															cy={latestY}
															r={LATEST_HALO_RADIUS}
															color={theme.accent.val}
															opacity={0.22}
														/>
														<Circle
															cx={latest.x}
															cy={latestY}
															r={LATEST_RING_RADIUS}
															color={theme.cardBackground.val}
														/>
														<Circle
															cx={latest.x}
															cy={latestY}
															r={LATEST_DOT_RADIUS}
															color={theme.accent.val}
														/>
													</>
												)}
											</>
										);
									}}
									xAxis={{
										font: xAxisFont,
										tickCount: X_TICK_COUNT,
										// victory-native に任せると「キリのよいミリ秒」に目盛りが置かれるため自前で決める
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
										lineColor: theme.graphGrid.val,
										lineWidth: 1,
										labelColor: theme.textMuted.val,
									}}
									yAxis={[
										{
											font: yAxisFont,
											tickCount: Y_TICK_COUNT,
											formatYLabel: (value) => (value ? value.toFixed(1) : ""),
											labelPosition: "outset",
											labelOffset: 8,
											lineColor: theme.graphGrid.val,
											lineWidth: 1,
											labelColor: theme.textMuted.val,
										},
									]}
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
														color={theme.graphActualLine.val}
														strokeWidth={1}
													/>
												)}
												<Line
													points={points.actualWeight}
													color={theme.graphActualLine.val}
													strokeWidth={
														months >= 6
															? ACTUAL_LINE_WIDTH.long
															: ACTUAL_LINE_WIDTH.short
													}
												/>
												{months === 1 ? (
													<Scatter
														points={points.actualWeight}
														color={theme.graphActualLine.val}
														radius={3}
													/>
												) : null}
												<Line
													points={points.trendWeight}
													color={theme.accent.val}
													strokeWidth={TREND_LINE_WIDTH}
												/>
												{months === 1 ? (
													<Scatter
														points={points.trendWeight}
														color={theme.accent.val}
														radius={3}
													/>
												) : null}
												{/* 選択した点のハイライトは最前面に置く */}
												{selectedX !== null && selectedActualY !== null ? (
													<Circle
														cx={selectedX}
														cy={selectedActualY}
														r={5}
														color={theme.graphActualLine.val}
													/>
												) : null}
												{selectedX !== null && selectedTrendY !== null ? (
													<Circle
														cx={selectedX}
														cy={selectedTrendY}
														r={5}
														color={theme.accent.val}
													/>
												) : null}
											</>
										);
									}}
								/>
							</View>
						</GestureDetector>
						{/* Y軸の単位。プロット領域の外（左上）に置く */}
						<SizableText
							position="absolute"
							top={0}
							left={0}
							fontSize={11}
							lineHeight={14}
							color="$textMuted"
							pointerEvents="none"
						>
							kg
						</SizableText>
						{selectedPoint !== null &&
						selectedX !== null &&
						chartBounds !== null ? (
							<SelectedPointPill
								point={selectedPoint}
								left={clampCardLeft({
									centerX: selectedX,
									cardWidth: PILL_WIDTH,
									bounds: chartBounds,
								})}
							/>
						) : null}
					</YStack>
				</SurfaceCard>
			</ScreenScrollView>
			{/* 表示期間幅の切り替え。共通の下部固定ボタンと同じ位置に置く */}
			<BottomActionBar>
				<YStack flex={1}>
					<SegmentedControl
						options={MONTH_SEGMENTS}
						value={String(months)}
						onChange={(value) => onChangeMonths(Number(value))}
					/>
				</YStack>
			</BottomActionBar>
		</Screen>
	);
};

/**
 * 過去へスライドしているときだけ出す、今日へ戻る導線
 *
 * デザインの見出しには置き場が無いが、横スライドで戻れなくなるのを防ぐため
 * タイトルの右に淡いアクセントのピルで添える
 */
const ScrollToLatestButton = ({ onPress }: { onPress: () => void }) => (
	<XStack
		height={32}
		paddingHorizontal={12}
		borderRadius={16}
		backgroundColor="$accentSoft"
		alignItems="center"
		pressStyle={{ opacity: 0.85 }}
		onPress={onPress}
		// Tamagui は tabIndex が 0 のときしか accessible を補わないので自分で付ける。
		// 付けないと VoiceOver がボタンとして拾わず、ラベルも読まれない
		accessible
		accessibilityRole="button"
		accessibilityLabel="今日へ戻る"
	>
		<SizableText fontSize={13} fontWeight="700" color="$accent">
			今日へ
		</SizableText>
	</XStack>
);

/** グラフの凡例。色見本は折れ線に実際に使っている色と揃える */
const GraphLegend = () => (
	<YStack gap={8} alignItems="flex-start" paddingBottom={6}>
		<XStack alignItems="center" gap={8}>
			<View
				width={20}
				height={3}
				borderRadius={2}
				backgroundColor="$graphActualLine"
			/>
			<SizableText fontSize={12} color="$textMuted">
				実測データ
			</SizableText>
		</XStack>
		<XStack alignItems="center" gap={8}>
			<View width={20} height={4} borderRadius={2} backgroundColor="$accent" />
			<SizableText fontSize={12} fontWeight="700" color="$textPrimary">
				傾向データ
			</SizableText>
		</XStack>
	</YStack>
);

/** 傾向がまだ求まらないときに数値の代わりに出す字 */
const PLACEHOLDER_NUMBER = "–.–";

/**
 * 表示中の期間の増減
 *
 * この画面の主役。グラフは「どう動いたか」の裏付けとして下に置く。
 *
 * 増減は色を変えない。増量期か減量期かはユーザーの目的しだいで、
 * アプリが良し悪しを決めて一喜一憂させないため
 */
const WindowTrendSummary = ({ summary }: { summary: TrendSummary | null }) => {
	const diffLabel =
		summary === null
			? PLACEHOLDER_NUMBER
			: formatDiffWeight(summary.diffWeight);
	const startLabel =
		summary === null ? PLACEHOLDER_NUMBER : summary.startWeight.toFixed(1);
	const endLabel =
		summary === null ? PLACEHOLDER_NUMBER : summary.endWeight.toFixed(1);
	// 傾向が出ていないあいだは、数字の置き場だけ見せて淡い色にする
	const numberColor = summary === null ? "$graphPlaceholder" : "$textPrimary";
	const unitColor = summary === null ? "$graphPlaceholder" : "$textMuted";

	return (
		<YStack
			accessible
			accessibilityLabel={
				summary === null
					? "この期間の傾向はまだ出せません"
					: `この期間の傾向 ${diffLabel}キログラム ${startLabel}から${endLabel}キログラム`
			}
		>
			<SizableText
				fontSize={13}
				lineHeight={18}
				fontWeight="500"
				color="$textMuted"
			>
				この期間の傾向
			</SizableText>
			<XStack alignItems="baseline" gap={4}>
				<NumberText
					fontSize={TREND_NUMBER_SIZE.fontSize}
					lineHeight={TREND_NUMBER_SIZE.lineHeight}
					color={numberColor}
				>
					{diffLabel}
				</NumberText>
				<SizableText fontSize={20} fontWeight="500" color={unitColor}>
					kg
				</SizableText>
			</XStack>
			<XStack alignItems="baseline" gap={4}>
				<NumberText
					weight="600"
					fontSize={13}
					lineHeight={18}
					color="$textMuted"
				>
					{startLabel}
				</NumberText>
				<SizableText fontSize={13} lineHeight={18} color="$textMuted">
					→
				</SizableText>
				<NumberText
					weight="600"
					fontSize={13}
					lineHeight={18}
					color="$textMuted"
				>
					{endLabel}
				</NumberText>
				<SizableText fontSize={13} lineHeight={18} color="$textMuted">
					kg
				</SizableText>
			</XStack>
		</YStack>
	);
};

/**
 * タップで選んだ1点の値を出すピル
 *
 * 出すのは実測値。傾向は上の見出しと折れ線で読めるので、
 * ここでは「その日に何kgだったか」という、他では見られない値を返す。
 *
 * デザインは日本語書体で描いているが、中身は日付と体重だけなので
 * 「数値はすべて Barlow Condensed」の決め（#77）に寄せる
 */
const SelectedPointPill = ({
	point,
	left,
}: {
	point: GraphPoint;
	left: number;
}) => (
	<XStack
		position="absolute"
		top={4}
		left={left}
		width={PILL_WIDTH}
		height={PILL_HEIGHT}
		borderRadius={PILL_HEIGHT / 2}
		backgroundColor="$graphTooltipBackground"
		alignItems="center"
		justifyContent="center"
		pointerEvents="none"
		accessible
		accessibilityLabel={`${format(new Date(point.date), "yyyy年M月d日")} 実測${point.actualWeight.toFixed(1)}キログラム`}
	>
		<NumberText fontSize={12} color="$graphTooltipText" numberOfLines={1}>
			{`${format(new Date(point.date), "M/d")}  ${point.actualWeight.toFixed(1)}kg`}
		</NumberText>
	</XStack>
);

/**
 * 体重データが無いときの画面
 *
 * 傾向の数値はプレースホルダにして置き場だけ見せ、
 * 何をすれば埋まるのかをカードの中と下部のボタンで示す。
 *
 * ヘルスケアの案内は、デザインでは手順を別画面に送る 1 行だが、
 * ホーム（#78）が入れた `HealthPermissionGuide` をそのまま使う。
 * 同じ案内をタブごとに違う形で出すより、部品ごと揃えたほうが迷わない
 */
const GraphEmpty = () => (
	<Screen>
		<ScreenScrollView withBottomAction>
			<ScreenHeader
				label={formatWindowLabel(getWindow(Date.now(), DEFAULT_MONTHS))}
				title="グラフ"
			/>
			<YStack paddingHorizontal={4}>
				<WindowTrendSummary summary={null} />
			</YStack>
			<EmptyGraphCard />
			<HealthPermissionGuide />
		</ScreenScrollView>
		<BottomActionBar>
			<Link href="/(tabs)/home/add" asChild>
				<PrimaryButton icon={Plus}>体重を入力する</PrimaryButton>
			</Link>
		</BottomActionBar>
	</Screen>
);

/** データなしのカードの高さと、中に敷く下絵の大きさ */
const EMPTY_CARD_HEIGHT = 268;
const EMPTY_ART_WIDTH = 334;
const EMPTY_ART_HEIGHT = 232;

/** 下絵の折れ線。右肩下がりのゆるい曲線で「傾向が見られる」ことだけ伝える */
const EMPTY_ART_PATH =
	"M12,196 C18.5,194.7 37.8,188.7 50.8,188 C63.7,187.3 76.6,193.7 89.5,192 C102.4,190.3 115.3,181.7 128.2,178 C141.2,174.3 154.1,170.7 167,170 C179.9,169.3 192.8,175.7 205.8,174 C218.7,172.3 231.6,163.7 244.5,160 C257.4,156.3 270.3,154 283.2,152 C296.2,150 315.5,148.7 322,148";

/** 下絵のグリッド線の位置 */
const EMPTY_ART_ROWS = [16, 62, 108, 154, 200];
const EMPTY_ART_COLUMNS = [50.8, 128.2, 205.8, 283.2];

/**
 * データが無いときのグラフカード
 *
 * 白いカードではなく破線の枠にして、「まだ中身が入っていない場所」だと分かるようにする
 */
const EmptyGraphCard = () => {
	const theme = useTheme();

	return (
		<YStack
			height={EMPTY_CARD_HEIGHT}
			borderRadius={radius.card}
			borderWidth={2}
			borderColor="$graphPlaceholder"
			borderStyle="dashed"
			paddingTop={18}
			paddingHorizontal={8}
		>
			<View opacity={0.55} pointerEvents="none">
				<Svg
					width="100%"
					height={EMPTY_ART_HEIGHT}
					viewBox={`0 0 ${EMPTY_ART_WIDTH} ${EMPTY_ART_HEIGHT}`}
					preserveAspectRatio="none"
				>
					{EMPTY_ART_ROWS.map((y) => (
						<SvgLine
							key={`row-${y}`}
							x1={12}
							y1={y}
							x2={EMPTY_ART_WIDTH - 12}
							y2={y}
							stroke={theme.graphGrid.val}
							strokeWidth={1}
							strokeDasharray="3 5"
						/>
					))}
					{EMPTY_ART_COLUMNS.map((x) => (
						<SvgLine
							key={`column-${x}`}
							x1={x}
							y1={16}
							x2={x}
							y2={200}
							stroke={theme.graphGrid.val}
							strokeWidth={1}
							strokeDasharray="3 5"
						/>
					))}
					<SvgPath
						d={EMPTY_ART_PATH}
						fill="none"
						stroke={theme.graphPlaceholder.val}
						strokeWidth={3.5}
						strokeLinecap="round"
						strokeDasharray="2 9"
					/>
				</Svg>
			</View>
			<YStack
				position="absolute"
				top={0}
				left={0}
				right={0}
				bottom={0}
				alignItems="center"
				justifyContent="center"
				gap={6}
				paddingHorizontal={28}
				paddingBottom={76}
			>
				<XStack
					width={56}
					height={56}
					borderRadius={28}
					backgroundColor="$accentSoft"
					alignItems="center"
					justifyContent="center"
				>
					<ChartLine color={theme.accent.val} size={26} strokeWidth={1.8} />
				</XStack>
				<SizableText
					fontSize={16}
					lineHeight={24}
					fontWeight="800"
					marginTop={6}
					color="$textPrimary"
				>
					体重データがありません
				</SizableText>
				<SizableText
					fontSize={13}
					lineHeight={20}
					color="$textMuted"
					textAlign="center"
				>
					体重を入力するか、ヘルスケアと連携すると傾向がグラフで見られます
				</SizableText>
			</YStack>
		</YStack>
	);
};

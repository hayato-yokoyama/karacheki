import {
	fetchRecentWeightsByMonths,
	transformWeightDataForGraph,
} from "@/app/_services/weightService";
import { matchFont } from "@shopify/react-native-skia";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import {
	H3,
	ScrollView,
	Separator,
	SizableText,
	Spinner,
	Tabs,
	Text,
	useTheme,
	View,
	XStack,
	YStack,
} from "tamagui";
import { CartesianChart, Line } from "victory-native";

export default function Graph() {
	const theme = useTheme();

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
							<View width="$1" height="$0.5" backgroundColor={"$color7"} />
							<Text>実測データ</Text>
						</XStack>
						<XStack alignItems="center" gap="$2">
							<View width="$1" height="$0.5" backgroundColor={"$accentColor"} />
							<Text>傾向データ</Text>
						</XStack>
					</XStack>
					{/* グラフ */}
					<Tabs
						defaultValue="3"
						orientation="horizontal"
						flexDirection="column"
						width="100%"
						height={510} // TODO:数値を指定せずにグラフいっぱいにしたい
						overflow="hidden"
					>
						<Tabs.Content value="1">
							<GraphContent month={1} />
						</Tabs.Content>
						<Tabs.Content value="3">
							<GraphContent month={3} />
						</Tabs.Content>
						<Tabs.Content value="6">
							<GraphContent month={6} />
						</Tabs.Content>
						<Tabs.Content value="12">
							<GraphContent month={12} />
						</Tabs.Content>
						<Tabs.List separator={<Separator vertical />} marginTop="$4">
							<Tabs.Tab flex={1} value="1">
								<SizableText>1ヶ月</SizableText>
							</Tabs.Tab>
							<Tabs.Tab flex={1} value="3">
								<SizableText>3ヶ月</SizableText>
							</Tabs.Tab>
							<Tabs.Tab flex={1} value="6">
								<SizableText>6ヶ月</SizableText>
							</Tabs.Tab>
							<Tabs.Tab flex={1} value="12">
								<SizableText>1年</SizableText>
							</Tabs.Tab>
						</Tabs.List>
						<Separator />
					</Tabs>
				</YStack>
			</ScrollView>
		</>
	);
}

const GraphContent = ({ month }: { month: number }) => {
	const theme = useTheme();

	// TODO: 最初に1年分取得して、それをスケールごとに使い回すようにしたい
	// 体重の取得
	const {
		data: fetchedWight,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["graphWeights", month],
		queryFn: () => fetchRecentWeightsByMonths(month),
	});

	if (isLoading) {
		return (
			<YStack padding="$8">
				<Spinner size="small" />
			</YStack>
		);
	}

	if (error || fetchedWight === undefined) {
		return (
			<YStack padding="$8">
				<H3>ヘルスケアデータを取得できませんでした</H3>
			</YStack>
		);
	}

	/** グラフ用の体重データ（日時・実測データ・傾向データ） */
	const weightForGraph = transformWeightDataForGraph(fetchedWight);

	const font = matchFont({
		fontFamily: Platform.select({ ios: "Helvetica", default: "serif" }),
		fontSize: 12,
	});

	return (
		<YStack gap="$1" height={440}>
			<Text fontSize={12}>（ ㎏ ）</Text>
			<CartesianChart
				data={weightForGraph}
				xKey="date"
				yKeys={["actualWeight", "trendWeight"]}
				axisOptions={{
					font,
					formatYLabel: (value) => (value ? value.toFixed(1) : ""),
					formatXLabel: (value) =>
						month === 12
							? format(new Date(value), "yyyy/MM")
							: format(new Date(value), "M/d"),
					labelPosition: { x: "outset", y: "outset" },
					labelOffset: { x: 8, y: 8 },
					tickCount: {
						x: 4,
						y: 6,
					},
					lineColor: theme.color12.val,
					labelColor: theme.color12.val,
				}}
				// biome-ignore lint: correctness/noChildrenProp: Childrenで渡すとエラーになるためignore
				children={({ points }) => (
					<>
						<Line
							points={points.actualWeight}
							color={theme.color7.val}
							strokeWidth={2}
						/>
						<Line
							points={points.trendWeight}
							color={theme.accentColor.val}
							strokeWidth={3}
						/>
					</>
				)}
			/>
		</YStack>
	);
};

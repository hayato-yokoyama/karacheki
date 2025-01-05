import { ErrorHealthData } from "@/app/_components/errorHealthData";
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
	Paragraph,
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

	// 13ヶ月分のデータを取得
	const {
		data: fetchedWeights,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["graphWeights", 13],
		queryFn: () => fetchRecentWeightsByMonths(13),
	});

	if (isLoading) {
		return (
			<YStack
				padding="$8"
				height={400}
				alignItems="center"
				justifyContent="center"
			>
				<Spinner size="small" />
			</YStack>
		);
	}

	if (error || fetchedWeights === undefined || fetchedWeights.length === 0) {
		return <ErrorHealthData />;
	}

	/** グラフ用の体重データ（日時・実測データ・傾向データ） */
	const weightForGraph = transformWeightDataForGraph(fetchedWeights);

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
						defaultValue="3"
						orientation="horizontal"
						flexDirection="column"
						width="100%"
						height={510}
						overflow="hidden"
					>
						<Tabs.Content value="1">
							<GraphContent month={1} data={weightForGraph} />
						</Tabs.Content>
						<Tabs.Content value="3">
							<GraphContent month={3} data={weightForGraph} />
						</Tabs.Content>
						<Tabs.Content value="6">
							<GraphContent month={6} data={weightForGraph} />
						</Tabs.Content>
						<Tabs.Content value="12">
							<GraphContent month={12} data={weightForGraph} />
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
	month,
	data,
}: {
	month: number;
	data: { date: string; actualWeight: number; trendWeight: number | null }[];
}) => {
	const theme = useTheme();

	// データを指定期間のものだけに絞る
	const filteredData = data.filter((item) => {
		const date = new Date(item.date);
		const cutoffDate = new Date();
		cutoffDate.setMonth(cutoffDate.getMonth() - month);
		return date >= cutoffDate;
	});

	if (filteredData.length === 0) {
		return (
			<YStack alignItems="center" justifyContent="center" height={440}>
				<Paragraph>指定期間のデータがありません。</Paragraph>
			</YStack>
		);
	}

	return (
		<YStack gap="$1" height={440}>
			<Text fontSize={12}>（ ㎏ ）</Text>
			<CartesianChart
				data={filteredData}
				xKey="date"
				yKeys={["actualWeight", "trendWeight"]}
				axisOptions={{
					font: graphAxisFont,
					formatYLabel: (value) => (value ? value.toFixed(1) : ""),
					formatXLabel: (value) => {
						if (!value) {
							return "";
						}
						return format(new Date(value), month === 12 ? "yyyy/MM" : "M/d");
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
							strokeWidth={month === 12 || month === 6 ? 1 : 2}
						/>
						<Line
							points={points.trendWeight}
							color={theme.accentColor.val}
							strokeWidth={month === 12 || month === 6 ? 2 : 3}
						/>
					</>
				)}
			/>
		</YStack>
	);
};

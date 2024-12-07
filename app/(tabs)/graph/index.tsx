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
	Tabs,
	Text,
	View,
	YStack,
} from "tamagui";
import { CartesianChart, Line } from "victory-native";

export default function Graph() {
	// 体重の取得
	const {
		data: fetchedWight,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["graphWeights", 3],
		queryFn: () => fetchRecentWeightsByMonths(3),
	});

	if (isLoading) {
		return (
			<YStack padding="$8">
				<H3>Loading...</H3>
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
		<>
			<Stack.Screen options={{ title: "グラフ" }} />
			<ScrollView>
				<YStack paddingVertical="$8" paddingHorizontal="$3">
					{/* グラフの見出し */}
					<YStack
						flexDirection="row"
						alignItems="center"
						justifyContent="center"
						gap="$3"
					>
						<View
							style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
						>
							<View
								style={{
									width: 20,
									height: 2,
									backgroundColor: "black",
								}}
							/>
							<Text style={{ fontSize: 12 }}>実測データ</Text>
						</View>
						<View
							style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
						>
							<View
								style={{
									width: 20,
									height: 2,
									backgroundColor: "red",
								}}
							/>
							<Text style={{ fontSize: 12 }}>傾向データ</Text>
						</View>
					</YStack>
					{/* グラフ */}
					<Tabs
						defaultValue="3"
						orientation="horizontal"
						flexDirection="column"
						width="100%"
						height={700} // 画面いっぱいにしたい
						borderRadius="$4"
						borderWidth="$0.25"
						overflow="hidden"
						borderColor="$borderColor"
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
						<Tabs.List
							separator={<Separator vertical />}
							disablePassBorderRadius="top"
							marginTop="$4"
						>
							<Tabs.Tab flex={1} value="1">
								<SizableText fontFamily="$body">1ヶ月</SizableText>
							</Tabs.Tab>
							<Tabs.Tab flex={1} value="3">
								<SizableText fontFamily="$body">3ヶ月</SizableText>
							</Tabs.Tab>
							<Tabs.Tab flex={1} value="6">
								<SizableText fontFamily="$body">6ヶ月</SizableText>
							</Tabs.Tab>
							<Tabs.Tab flex={1} value="12">
								<SizableText fontFamily="$body">1年</SizableText>
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
				<H3>Loading...</H3>
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
		<View style={{ height: 500, width: "100%" }}>
			<Text style={{ fontSize: 12, marginBottom: 4 }}>(㎏)</Text>
			<CartesianChart
				data={weightForGraph}
				xKey="date"
				yKeys={["actualWeight", "trendWeight"]}
				axisOptions={{
					font,
					formatXLabel: (value) => format(new Date(value), "M/d"),
					labelPosition: { x: "outset", y: "outset" }, // ラベルを外側に配置
					labelOffset: { x: 8, y: 8 }, // ラベルと軸の間の距離
					tickCount: {
						x: 4,
						y: 6,
					},
				}}
				// biome-ignore lint: correctness/noChildrenProp: Childrenで渡すとエラーになるため
				children={({ points }) => (
					<>
						<Line
							points={points.actualWeight}
							color="black"
							strokeWidth={2}
							opacity={0.3}
						/>
						<Line
							points={points.trendWeight}
							color="red"
							strokeWidth={3}
							animate={{ type: "timing", duration: 300 }}
						/>
					</>
				)}
			/>
		</View>
	);
};

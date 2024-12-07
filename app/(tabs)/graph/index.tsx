import {
	fetchRecentWeightsByMonths,
	transformWeightDataForGraph,
} from "@/app/_services/weightService";
import { matchFont } from "@shopify/react-native-skia";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Stack } from "expo-router";
import { Platform } from "react-native";
import { H3, ScrollView, Text, View, YStack } from "tamagui";
import { CartesianChart, Line } from "victory-native";

const DATA = Array.from({ length: 31 }, (_, i) => ({
	day: i,
	highTmp: 40 + 30 * Math.random(),
}));

export default function Graph() {
	// 体重の取得
	const {
		data: fetchedWight,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["graphWeights", 2],
		queryFn: () => fetchRecentWeightsByMonths(2),
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

	/** グラフ用の体重データ */
	const weightForGraph = transformWeightDataForGraph(fetchedWight);

	const font = matchFont({
		fontFamily: Platform.select({ ios: "Helvetica", default: "serif" }),
		fontSize: 12,
	});
	return (
		<>
			<Stack.Screen options={{ title: "グラフ" }} />
			<ScrollView>
				<YStack paddingVertical="$8" paddingHorizontal="$3" gap="$8">
					<View style={{ height: 500, width: "100%" }}>
						<Text style={{ fontSize: 12, marginBottom: 4 }}>(㎏)</Text>

						{/* 横幅を指定 */}
						<CartesianChart
							data={weightForGraph}
							xKey="date"
							yKeys={["weight"]}
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
										points={points.weight}
										color="black"
										strokeWidth={2}
										animate={{ type: "timing", duration: 300 }}
										opacity={0.3}
									/>
								</>
							)}
						/>
					</View>
				</YStack>
			</ScrollView>
		</>
	);
}

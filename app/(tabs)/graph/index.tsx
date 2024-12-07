import {
	fetchRecentWeightsByMonths,
	transformWeightDataForGraph,
} from "@/app/_services/weightService";
import { useQuery } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { H3, Paragraph, YStack } from "tamagui";

export default function Graph() {
	// 体重の取得
	const {
		data: fetchedWight,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["graphWeights", 6],
		queryFn: () => fetchRecentWeightsByMonths(6),
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

	return (
		<>
			<Stack.Screen options={{ title: "グラフ" }} />
			<YStack padding="$8" gap="$8">
				<H3>体重データ</H3>
				{weightForGraph.map((weight) => (
					<Paragraph key={weight.date.toISOString()}>
						{`日付: ${new Date(weight.date).toLocaleDateString()} - 体重: ${weight.weight.toFixed(2)} kg`}
					</Paragraph>
				))}
			</YStack>
		</>
	);
}

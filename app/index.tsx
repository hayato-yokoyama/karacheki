import { Card, H2, H3, Separator, SizableText, Tabs, YStack } from "tamagui";
import HealthKit, {
	HKQuantityTypeIdentifier,
} from "@kingstinct/react-native-healthkit";
import type {
	HKQuantitySample,
	HKUnit,
} from "@kingstinct/react-native-healthkit";
import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";

/** 今週と先週の体重を取得する */
const fetchWeights = async () => {
	try {
		const isAvailable = await HealthKit.isHealthDataAvailable();

		if (!isAvailable) {
			throw new Error("HealthKitはこのデバイスでは利用できません。");
		}

		// bodyMassの読み取り許可を要求する
		await HealthKit.requestAuthorization([HKQuantityTypeIdentifier.bodyMass]);

		const now = new Date();

		/** 今週分(1~7日前)の体重 */
		const currentWeekData = await HealthKit.queryQuantitySamples(
			HKQuantityTypeIdentifier.bodyMass,
			{
				from: subDays(now, 7),
				to: subDays(now, 1),
				unit: "kg",
			},
		);

		/** 先週分(8~14日前)の体重 */
		const prevWeekData = await HealthKit.queryQuantitySamples(
			HKQuantityTypeIdentifier.bodyMass,
			{
				from: subDays(now, 14),
				to: subDays(now, 8),
				unit: "kg",
			},
		);

		return {
			currentWeek: currentWeekData,
			prevWeekData: prevWeekData,
		};
	} catch (error) {
		console.error(error);
		throw new Error("HealthKitデータの取得にエラーが発生しました");
	}
};

/** 体重の平均値を算出する */
const calcWeightAvg = (
	weights: readonly HKQuantitySample<
		HKQuantityTypeIdentifier.bodyMass,
		HKUnit
	>[],
) => {
	const weightsAvg =
		weights.reduce((sum, sample) => sum + sample.quantity, 0) / weights.length;

	return weightsAvg;
};

export default function Index() {
	const { data, isLoading, error } = useQuery({
		queryKey: ["weights"],
		queryFn: fetchWeights,
	});

	if (isLoading) {
		return (
			<YStack padding="$8">
				<H3>Loading...</H3>
			</YStack>
		);
	}

	if (error || data === undefined) {
		return (
			<YStack padding="$8">
				<H3>ヘルスケアデータを取得できませんでした</H3>
			</YStack>
		);
	}

	const { currentWeek: currentWeekWeights, prevWeekData: prevWeekWeights } =
		data;

	const currentWeekWeightsAvg = calcWeightAvg(currentWeekWeights);
	const prevWeekWeightsAvg = calcWeightAvg(prevWeekWeights);
	const weightAvgDiff = currentWeekWeightsAvg - prevWeekWeightsAvg;

	const now = new Date();
	const currentWeekString = `今週 (${format(subDays(now, 7), "MM/dd")} ~ ${format(subDays(now, 1), "MM/dd")})`;
	const prevWeekString = `先週 (${format(subDays(now, 14), "MM/dd")} ~ ${format(subDays(now, 8), "MM/dd")})`;

	return (
		<YStack padding="$8" gap="$8">
			<Tabs
				defaultValue="weekly"
				orientation="horizontal"
				flexDirection="column"
				borderRadius="$4"
				borderWidth="$0.25"
				overflow="hidden"
				borderColor="$borderColor"
				gap="$4"
			>
				<Tabs.List
					separator={<Separator vertical />}
					disablePassBorderRadius="bottom"
				>
					<Tabs.Tab flex={1} value="weekly">
						<SizableText fontFamily="$body">週</SizableText>
					</Tabs.Tab>
					<Tabs.Tab flex={1} value="monthly">
						<SizableText fontFamily="$body">月</SizableText>
					</Tabs.Tab>
				</Tabs.List>
				<Tabs.Content value="weekly" gap="$4">
					<H2 size="$8">週</H2>
					<YStack gap="$4">
						<WeightCard
							title={currentWeekString}
							weight={currentWeekWeightsAvg}
						/>
						<WeightCard title={prevWeekString} weight={prevWeekWeightsAvg} />
						<WeightDiffCard weight={weightAvgDiff} />
					</YStack>
				</Tabs.Content>
				<Tabs.Content value="monthly" gap="$4">
					<H2 size="$8">月</H2>
				</Tabs.Content>
			</Tabs>
		</YStack>
	);
}

const WeightCard = ({ title, weight }: { title: string; weight: number }) => {
	return (
		<Card bordered padding="$4">
			<H3 size="$6" fontWeight="bold">
				{title}
			</H3>
			<SizableText size="$8" fontWeight="bold">
				{weight.toFixed(2)}
				<SizableText size="$4" theme="alt1">
					kg
				</SizableText>
			</SizableText>
		</Card>
	);
};

const WeightDiffCard = ({ weight }: { weight: number }) => {
	return (
		<Card bordered padding="$4">
			<H3 size="$6" fontWeight="bold">
				差分
			</H3>
			<SizableText size="$8" fontWeight="bold">
				{weight.toFixed(2)}
				<SizableText size="$4" theme="alt1">
					kg
				</SizableText>
			</SizableText>
		</Card>
	);
};

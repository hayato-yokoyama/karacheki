import { Card, H2, H3, Separator, SizableText, Tabs, YStack } from "tamagui";
import HealthKit, {
	HKQuantityTypeIdentifier,
} from "@kingstinct/react-native-healthkit";
import { subDays } from "date-fns";

export default async function Index() {
	const isAvailable = await HealthKit.isHealthDataAvailable();

	// bodyMassの読み取り許可を要求する
	await HealthKit.requestAuthorization([HKQuantityTypeIdentifier.bodyMass]);

	/** 今週分(1~7日前)の体重 */
	const currentWeekWeights = await HealthKit.queryQuantitySamples(
		HKQuantityTypeIdentifier.bodyMass,
		{
			from: subDays(new Date(), 7),
			unit: "kg",
		},
	);

	/** 先週分(8~14日前)の体重 */
	const prevWeekData = await HealthKit.queryQuantitySamples(
		HKQuantityTypeIdentifier.bodyMass,
		{
			from: subDays(new Date(), 14),
			to: subDays(new Date(), 8),
			unit: "kg",
		},
	);

	return (
		<YStack padding="$8" gap="$8">
			<p>{currentWeekWeights[0].quantity} kg</p>
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
					<H2 size="$8">週平均</H2>
					<YStack gap="$4">
						<WeightCard title="今週 (2024/11/10 ~ 2024/11/17)" weight={70.3} />
						<WeightCard title="先週 (2024/11/02 ~ 2024/11/09)" weight={67.6} />
						<WeightDiffCard weight={2.7} />
					</YStack>
				</Tabs.Content>
				<Tabs.Content value="monthly" gap="$4">
					<H2 size="$8">月平均</H2>
					<YStack gap="$4">
						<WeightCard title="今月 (2024/10/18 ~ 2024/11/17)" weight={68.3} />
						<WeightCard title="先月 (2024/09/18 ~ 2024/10/17)" weight={69.6} />
						<WeightDiffCard weight={-1.3} />
					</YStack>
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
				{weight}
				<SizableText size="$4" paddingLeft="$2" theme="alt1">
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
				{weight}
				<SizableText size="$4" paddingLeft="$2" theme="alt1">
					kg
				</SizableText>
			</SizableText>
		</Card>
	);
};

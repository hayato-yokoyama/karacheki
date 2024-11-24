import { format, sub, subDays, subMonths } from "date-fns";
import { Card, H3, SizableText, YStack } from "tamagui";

export const WeightTabContent = ({
	period,
	currentAve,
	prevAve,
}: {
	period: "Week" | "Month";
	currentAve: number;
	prevAve: number;
}) => {
	const now = new Date();
	const aveDiff = currentAve - prevAve;

	if (period === "Week") {
		const currentWeekString = `今週 (${format(subDays(now, 7), "MM/dd")} ~ ${format(subDays(now, 1), "MM/dd")})`;
		const prevWeekString = `先週 (${format(subDays(now, 14), "MM/dd")} ~ ${format(subDays(now, 8), "MM/dd")})`;
		return (
			<YStack gap="$4">
				<WeightCard title={currentWeekString} weight={currentAve} />
				<WeightCard title={prevWeekString} weight={prevAve} />
				<WeightDiffCard weight={aveDiff} />
			</YStack>
		);
	}

	if (period === "Month") {
		const currentMonthString = `今月 (${format(subMonths(now, 1), "MM/dd")} ~ ${format(subDays(now, 1), "MM/dd")})`;
		const prevMonthString = `先月 (${format(subMonths(now, 2), "MM/dd")} ~ ${format(sub(now, { months: 1, days: 1 }), "MM/dd")})`;
		return (
			<YStack gap="$4">
				<WeightCard title={currentMonthString} weight={currentAve} />
				<WeightCard title={prevMonthString} weight={prevAve} />
				<WeightDiffCard weight={aveDiff} />
			</YStack>
		);
	}
};

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

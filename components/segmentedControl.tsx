import { SizableText, XStack } from "tamagui";
import { layout, radius, typography } from "@/theme/designTokens";

/** セグメントの選択肢 */
export type SegmentOption<TValue extends string> = {
	value: TValue;
	label: string;
};

/**
 * 選択肢を横に並べて 1 つ選ばせるセグメント（#77）
 *
 * グラフの期間切り替えと BIG3 の種目切り替えで見た目が割れないよう、
 * 選択の見せ方をここに集める。
 * トラックの上に選択中だけ塗りを敷く形なので、Tamagui の Tabs ではなく自前で組む
 */
export const SegmentedControl = <TValue extends string>({
	options,
	value,
	onChange,
}: {
	options: readonly SegmentOption<TValue>[];
	value: TValue;
	onChange: (value: TValue) => void;
}) => (
	<XStack
		height={layout.segmentHeight}
		padding={layout.segmentPadding}
		gap={layout.segmentPadding}
		borderRadius={radius.segment}
		backgroundColor="$segmentTrack"
		accessibilityRole="tablist"
	>
		{options.map((option) => {
			const isSelected = option.value === value;

			return (
				<XStack
					key={option.value}
					flex={1}
					alignItems="center"
					justifyContent="center"
					borderRadius={radius.segmentThumb}
					backgroundColor={isSelected ? "$accentFill" : "transparent"}
					pressStyle={{ opacity: 0.85 }}
					onPress={() => onChange(option.value)}
					accessibilityRole="tab"
					accessibilityState={{ selected: isSelected }}
					accessibilityLabel={option.label}
				>
					<SizableText
						fontSize={typography.segment.fontSize}
						lineHeight={typography.segment.lineHeight}
						fontWeight={isSelected ? "700" : "500"}
						color={isSelected ? "$onAccentFill" : "$textPrimary"}
						numberOfLines={1}
					>
						{option.label}
					</SizableText>
				</XStack>
			);
		})}
	</XStack>
);

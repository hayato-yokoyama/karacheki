import { ChevronRight, HeartPulse } from "lucide-react-native";
import { SizableText, useTheme, XStack, YStack } from "tamagui";
import { BottomSheet, NumberText } from "@/components/ui";
import { radius } from "@/theme/designTokens";

/**
 * ヘルスケアのアクセスを許可する手順
 *
 * グラフのデータなし表示（#79）とホームのエラー表示で同じ文言を出すため、ここに置く
 */
export const HEALTH_ACCESS_STEPS = [
	"iPhoneの「設定」アプリを開く",
	"「アプリ」→「ヘルスケア」を選択",
	"「データアクセスとデバイス」を選択",
	"「からチェキ」を選択",
	"「すべてオンにする」を選択",
] as const;

/**
 * 「ヘルスケアと連携する」の案内行（#79）
 *
 * 体重データが無いときに、手順を開く入り口として出す
 */
export const HealthAccessRow = ({ onPress }: { onPress: () => void }) => {
	const theme = useTheme();

	return (
		<XStack
			alignItems="center"
			gap={12}
			paddingVertical={12}
			paddingHorizontal={14}
			borderRadius={radius.cardSmall}
			backgroundColor="$cardBackground"
			borderWidth={1}
			borderColor="$cardBorder"
			pressStyle={{ opacity: 0.85 }}
			onPress={onPress}
			// Tamagui は tabIndex が 0 のときしか accessible を補わない
			accessible
			accessibilityRole="button"
			accessibilityLabel="ヘルスケアと連携する。許可設定の手順を見る"
		>
			<XStack
				width={40}
				height={40}
				borderRadius={20}
				backgroundColor="$accentSoft"
				alignItems="center"
				justifyContent="center"
				flexShrink={0}
			>
				<HeartPulse color={theme.accent.val} size={20} strokeWidth={2} />
			</XStack>
			<YStack flex={1} gap={1}>
				<SizableText fontSize={14} fontWeight="700" color="$textPrimary">
					ヘルスケアと連携する
				</SizableText>
				<SizableText fontSize={12} color="$textMuted">
					許可設定の手順を見る
				</SizableText>
			</YStack>
			<ChevronRight color={theme.textMuted.val} size={20} strokeWidth={2} />
		</XStack>
	);
};

/** ヘルスケアの許可設定の手順を出すシート（#79） */
export const HealthAccessSheet = ({
	open,
	onClose,
}: {
	open: boolean;
	onClose: () => void;
}) => (
	<BottomSheet open={open} onClose={onClose}>
		<YStack gap={4}>
			<SizableText fontSize={18} lineHeight={24} fontWeight="800">
				ヘルスケアアクセスの設定手順
			</SizableText>
			<SizableText fontSize={13} lineHeight={20} color="$textMuted">
				許可すると、ヘルスケアに記録した体重がグラフに出ます
			</SizableText>
		</YStack>
		<YStack gap={10}>
			{HEALTH_ACCESS_STEPS.map((step, index) => (
				<XStack key={step} alignItems="center" gap={10}>
					<XStack
						width={24}
						height={24}
						borderRadius={12}
						backgroundColor="$accentSoft"
						alignItems="center"
						justifyContent="center"
						flexShrink={0}
					>
						<NumberText fontSize={12} color="$accent">
							{index + 1}
						</NumberText>
					</XStack>
					<SizableText fontSize={14} lineHeight={20} flex={1}>
						{step}
					</SizableText>
				</XStack>
			))}
		</YStack>
	</BottomSheet>
);

import { YStack, type YStackProps } from "tamagui";
import { radius } from "@/theme/designTokens";

export type SurfaceCardProps = YStackProps & {
	/** 2 列に並べるタイルなど、小さいカードは角丸を一段小さくする */
	size?: "default" | "small";
};

/**
 * 薄いグレーの地に重ねる白いカード（#77）
 *
 * 影はライトのみ。ダークは影が見えないので、境界線で面を分ける
 * （`$cardShadowColor` がダークでは透明になっている）
 */
export const SurfaceCard = ({
	size = "default",
	...props
}: SurfaceCardProps) => (
	<YStack
		backgroundColor="$cardBackground"
		borderWidth={1}
		borderColor="$cardBorder"
		borderRadius={size === "small" ? radius.cardSmall : radius.card}
		shadowColor="$cardShadowColor"
		shadowOffset={{ width: 0, height: 6 }}
		shadowOpacity={1}
		shadowRadius={18}
		{...props}
	/>
);

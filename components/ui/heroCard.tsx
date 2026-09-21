import { LinearGradient } from "@tamagui/linear-gradient";
import type { ReactNode } from "react";
import { YStack, type YStackProps } from "tamagui";
import {
	HERO_GRADIENT_COLORS,
	HERO_GRADIENT_END,
	HERO_GRADIENT_LOCATIONS,
	HERO_GRADIENT_START,
	radius,
} from "@/theme/designTokens";

export type HeroCardProps = Omit<YStackProps, "children"> & {
	children: ReactNode;
};

/**
 * その画面の主役の数値を載せる、濃い青のグラデーションのカード（#77）
 *
 * 中に置く文字は地が固定なのでテーマで色が変わらない。
 * `$onHero` / `$onHeroMuted` / `$onHeroSubtle` を使う。
 *
 * 影を外側の YStack に持たせているのは、`LinearGradient` が `overflow: hidden` を
 * 既定で持っていて、iOS だと自分の影まで切られてしまうため
 */
export const HeroCard = ({ children, ...props }: HeroCardProps) => (
	<YStack
		borderRadius={radius.hero}
		shadowColor="$heroShadowColor"
		shadowOffset={{ width: 0, height: 10 }}
		shadowOpacity={1}
		shadowRadius={28}
		{...props}
	>
		<LinearGradient
			colors={HERO_GRADIENT_COLORS}
			locations={HERO_GRADIENT_LOCATIONS}
			start={HERO_GRADIENT_START}
			end={HERO_GRADIENT_END}
			borderRadius={radius.hero}
			paddingTop={18}
			paddingHorizontal={20}
			paddingBottom={16}
			gap={6}
		>
			{children}
		</LinearGradient>
	</YStack>
);

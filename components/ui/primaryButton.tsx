import { LinearGradient } from "@tamagui/linear-gradient";
import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, type ButtonProps, XStack } from "tamagui";
import { layout, typography } from "@/theme/designTokens";

/**
 * 画面にひとつだけ置く主要ボタン（#77）
 *
 * 押せないときは地をセグメントのトラック色、文字を補助色にして、影を消す
 */
export const PrimaryButton = ({ disabled, ...props }: ButtonProps) => (
	<Button
		flex={1}
		height={layout.primaryButtonHeight}
		borderRadius={layout.primaryButtonHeight / 2}
		borderWidth={0}
		backgroundColor={disabled ? "$segmentTrack" : "$accentFill"}
		color={disabled ? "$textMuted" : "$onAccentFill"}
		fontSize={typography.primaryButton.fontSize}
		fontWeight={typography.primaryButton.fontWeight}
		shadowColor={disabled ? "transparent" : "$accentFillShadowColor"}
		shadowOffset={{ width: 0, height: 8 }}
		shadowOpacity={1}
		shadowRadius={20}
		pressStyle={{
			backgroundColor: disabled ? "$segmentTrack" : "$accentFill",
			opacity: 0.85,
		}}
		disabled={disabled}
		{...props}
	/>
);

export type BottomActionBarProps = {
	children: ReactNode;
	/** タブバーのある画面かどうか。モーダルで開く画面では false にして、下のセーフエリアを自分で持つ */
	withTabBar?: boolean;
};

/**
 * 下部に固定する主要ボタンの置き場（#77）
 *
 * ボタンの背後にスクロール中のコンテンツが透けないよう、
 * 画面の地の色へ向かうフェードを敷く
 */
export const BottomActionBar = ({
	children,
	withTabBar = true,
}: BottomActionBarProps) => {
	const insets = useSafeAreaInsets();

	// タブバーはナビゲータが画面の下に積むので、画面の下端がそのままボタンの基準になる
	const safeBottom = withTabBar ? 0 : insets.bottom;

	return (
		<>
			<LinearGradient
				colors={["$screenBackgroundTransparent", "$screenBackground"]}
				locations={[0, 0.62]}
				pointerEvents="none"
				position="absolute"
				left={0}
				right={0}
				bottom={safeBottom}
				height={layout.bottomFadeHeight}
			/>
			<XStack
				position="absolute"
				left={layout.screenPaddingHorizontal}
				right={layout.screenPaddingHorizontal}
				bottom={safeBottom + layout.primaryButtonGap}
				gap={10}
			>
				{children}
			</XStack>
		</>
	);
};

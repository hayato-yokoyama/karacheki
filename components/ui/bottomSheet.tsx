import type { ReactNode } from "react";
import { Modal, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { YStack } from "tamagui";
import { layout, radius } from "@/theme/designTokens";

export type BottomSheetProps = {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
	/** オーバーレイを読み上げたときのラベル */
	closeLabel?: string;
};

/**
 * 画面の下から出るシート（#77）
 *
 * 上端の角を丸め、中央にグラブハンドルを置く。
 * 背後のオーバーレイを押すと閉じる
 */
export const BottomSheet = ({
	open,
	onClose,
	children,
	closeLabel = "閉じる",
}: BottomSheetProps) => {
	const insets = useSafeAreaInsets();

	return (
		<Modal
			visible={open}
			transparent
			animationType="slide"
			onRequestClose={onClose}
			statusBarTranslucent
		>
			<YStack flex={1} justifyContent="flex-end">
				<Pressable
					style={StyleSheet.absoluteFill}
					onPress={onClose}
					accessibilityRole="button"
					accessibilityLabel={closeLabel}
				>
					<YStack flex={1} backgroundColor="$sheetOverlay" />
				</Pressable>
				<YStack
					backgroundColor="$cardBackground"
					borderTopLeftRadius={radius.sheet}
					borderTopRightRadius={radius.sheet}
					paddingTop={8}
					paddingHorizontal={layout.screenPaddingHorizontal}
					paddingBottom={insets.bottom + layout.screenPaddingHorizontal}
					gap={layout.gap}
				>
					<YStack
						alignSelf="center"
						width={layout.sheetHandleWidth}
						height={layout.sheetHandleHeight}
						borderRadius={layout.sheetHandleHeight / 2}
						backgroundColor="$sheetHandle"
					/>
					{children}
				</YStack>
			</YStack>
		</Modal>
	);
};

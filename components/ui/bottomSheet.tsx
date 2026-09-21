import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sheet, YStack } from "tamagui";
import { layout, radius } from "@/theme/designTokens";

export type BottomSheetProps = {
	open: boolean;
	onClose: () => void;
	children: ReactNode;
};

/**
 * 画面の下から出るシート（#77）
 *
 * Tamagui の `Sheet` に薄く被せて、デザインの見た目（角丸 28 の上端、
 * 中に置くグラブハンドル、指定のオーバーレイ）だけを固定する。
 * 下スワイプで閉じる・オーバーレイのタップで閉じるは `Sheet` 側の機能
 */
export const BottomSheet = ({ open, onClose, children }: BottomSheetProps) => {
	const insets = useSafeAreaInsets();

	return (
		<Sheet
			open={open}
			onOpenChange={(next: boolean) => {
				if (!next) {
					onClose();
				}
			}}
			// 中身の高さに合わせる。出す内容が決まっているので段階的な高さは要らない
			snapPointsMode="fit"
			dismissOnSnapToBottom
			modal
		>
			{/*
			 * NOTE: `animation` prop は渡さない。
			 * このプロジェクトの Tamagui では `animation` が型に出ておらず（#77 の変更前から）、
			 * シートの出入りは設定済みのアニメーションドライバに任せる
			 */}
			<Sheet.Overlay backgroundColor="$sheetOverlay" />
			<Sheet.Frame
				backgroundColor="$cardBackground"
				borderTopLeftRadius={radius.sheet}
				borderTopRightRadius={radius.sheet}
				paddingTop={8}
				paddingHorizontal={layout.screenPaddingHorizontal}
				// Sheet は上のセーフエリアしか見ないので、ホームバーの分は自分で持つ
				paddingBottom={insets.bottom + layout.screenPaddingHorizontal}
				gap={layout.gap}
			>
				{/*
				 * グラブハンドル
				 *
				 * `Sheet.Handle` はフレームの外（上）に浮くが、
				 * デザインはフレームの中に置く形なので自分で描く
				 */}
				<YStack
					alignSelf="center"
					width={layout.sheetHandleWidth}
					height={layout.sheetHandleHeight}
					borderRadius={layout.sheetHandleHeight / 2}
					backgroundColor="$sheetHandle"
				/>
				{children}
			</Sheet.Frame>
		</Sheet>
	);
};

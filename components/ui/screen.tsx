import type { ReactNode } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
	ScrollView,
	type ScrollViewProps,
	YStack,
	type YStackProps,
} from "tamagui";
import { layout } from "@/theme/designTokens";

/**
 * コンテンツの上端（#77）
 *
 * デザインは画面の上端から 60px。
 * ノッチが大きい端末でも文字がかぶらないよう、セーフエリアの方が大きければそちらに寄せる
 */
export const useScreenPaddingTop = () => {
	const insets = useSafeAreaInsets();

	return Math.max(layout.screenPaddingTop, insets.top + 8);
};

/**
 * 画面の地
 *
 * ネイティブヘッダーを使わず、コンテンツの中に見出しを置くので、
 * 画面はこれで包んで上端の余白を自分で持つ
 */
export const Screen = (props: YStackProps) => (
	<YStack flex={1} backgroundColor="$screenBackground" {...props} />
);

export type ScreenScrollViewProps = ScrollViewProps & {
	children: ReactNode;
	/** タブバーのある画面かどうか。モーダルで開く画面では false にして、下のセーフエリアを自分で持つ */
	withTabBar?: boolean;
	/** 下部固定ボタンがある画面かどうか。ある場合はその分だけ下に余白を足す */
	withBottomAction?: boolean;
};

/**
 * 画面の中身をスクロールさせる入れ物
 *
 * 下部固定ボタンはコンテンツの上に重ねるので、
 * 最後の要素がボタンに隠れないだけの下余白をここで足す
 */
export const ScreenScrollView = ({
	children,
	withTabBar = true,
	withBottomAction = false,
	...props
}: ScreenScrollViewProps) => {
	const insets = useSafeAreaInsets();
	const paddingTop = useScreenPaddingTop();

	// タブバーはナビゲータが画面の下に積むので、その分の余白は要らない
	const paddingBottom =
		(withTabBar ? 0 : insets.bottom) +
		(withBottomAction
			? layout.primaryButtonHeight + layout.primaryButtonGap * 2
			: 0) +
		layout.gap;

	return (
		<ScrollView
			contentContainerStyle={{
				paddingTop,
				paddingHorizontal: layout.screenPaddingHorizontal,
				paddingBottom,
				gap: layout.gap,
			}}
			{...props}
		>
			{children}
		</ScrollView>
	);
};

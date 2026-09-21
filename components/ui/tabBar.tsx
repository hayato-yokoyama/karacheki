import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SizableText, useTheme, XStack, YStack } from "tamagui";
import { layout, typography } from "@/theme/designTokens";

/**
 * `Tabs` の `tabBar` が受け取る props
 *
 * expo-router が react-navigation を内包していて `@react-navigation/bottom-tabs` を
 * 直接 import できないので、`Tabs` の型から取り出す
 */
type AppTabBarProps = Parameters<
	NonNullable<ComponentProps<typeof Tabs>["tabBar"]>
>[0];

/**
 * タブバーがホームバーに寄りすぎないよう最低限あける余白
 *
 * ホームバーのセーフエリア（iPhone で 34px）をそのまま下余白にすると
 * デザインの 83px より高くなるので、その分を差し引く
 */
const SAFE_AREA_TRIM = 8;

/** タップ領域を横いっぱいに広げて、4 タブを等幅に並べる */
const FILL = { flex: 1 } as const;

/**
 * タブバーの高さ
 *
 * 中身（上余白 8 ＋ ピル 32 ＋ 間 3 ＋ ラベル 14）＝ 57 に、
 * ホームバーのセーフエリアを足した高さ。iPhone ではデザイン通りの 83px になる
 */
const useTabBarHeight = () => {
	const insets = useSafeAreaInsets();

	return (
		layout.tabBarContentHeight +
		Math.max(insets.bottom - SAFE_AREA_TRIM, SAFE_AREA_TRIM)
	);
};

/**
 * デザインに合わせたタブバー（#77）
 *
 * OS 標準のタブバーだと、アクティブなタブの背後に敷くピルが作れないので差し替える。
 * `app/(tabs)/_layout.tsx` の `tabBar` に渡す
 */
export const AppTabBar = ({
	state,
	descriptors,
	navigation,
}: AppTabBarProps) => {
	const theme = useTheme();
	const height = useTabBarHeight();

	return (
		<XStack
			height={height}
			paddingTop={8}
			paddingHorizontal={8}
			backgroundColor="$tabBarBackground"
			borderTopWidth={1}
			borderTopColor="$cardBorder"
			accessibilityRole="tablist"
		>
			{state.routes.map((route, index) => {
				const descriptor = descriptors[route.key];
				const isFocused = state.index === index;
				const label = descriptor?.options.title ?? route.name;
				const color = isFocused ? theme.accent.val : theme.textMuted.val;

				const handlePress = () => {
					const event = navigation.emit({
						type: "tabPress",
						target: route.key,
						canPreventDefault: true,
					});

					if (!isFocused && !event.defaultPrevented) {
						// expo-router の型ではルート名が文字列に落ちないので、ここだけ型を外す
						navigation.navigate({
							name: route.name,
							params: route.params,
							merge: true,
						} as never);
					}
				};

				const handleLongPress = () => {
					navigation.emit({ type: "tabLongPress", target: route.key });
				};

				return (
					<Pressable
						key={route.key}
						style={FILL}
						onPress={handlePress}
						onLongPress={handleLongPress}
						accessibilityRole="tab"
						accessibilityState={{ selected: isFocused }}
						accessibilityLabel={label}
					>
						<YStack alignItems="center" gap={3}>
							<XStack
								width={layout.tabPillWidth}
								height={layout.tabPillHeight}
								borderRadius={layout.tabPillHeight / 2}
								alignItems="center"
								justifyContent="center"
								backgroundColor={isFocused ? "$accentSoft" : "transparent"}
							>
								{descriptor?.options.tabBarIcon?.({
									focused: isFocused,
									color,
									size: layout.tabIconSize,
								})}
							</XStack>
							<SizableText
								fontSize={typography.tabLabel.fontSize}
								lineHeight={typography.tabLabel.lineHeight}
								fontWeight={isFocused ? "700" : "500"}
								color={color}
								numberOfLines={1}
							>
								{label}
							</SizableText>
						</YStack>
					</Pressable>
				);
			})}
		</XStack>
	);
};

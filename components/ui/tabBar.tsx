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

/** タップ領域を横いっぱいに広げて、4 タブを等幅に並べる */
const FILL = { flex: 1 } as const;

/**
 * ホームバーが無い端末（iPhone SE など）で下に取る余白
 *
 * セーフエリアが 0 のときにラベルが画面の縁に貼り付くのを防ぐ
 */
const MIN_PADDING_BOTTOM = 8;

/**
 * タブバーの下余白
 *
 * ホームバーのセーフエリアをそのまま取る。
 * デザインキャンバスのタブバーは 83px（中身 57 ＋ 下 26）でセーフエリアに 8px 食い込んでいるが、
 * ホームバーとラベルを重ねたくないので、こちらはセーフエリアを削らない。
 * 高さはそのぶんデザインより 8px 高い 91px になる
 */
const useTabBarPaddingBottom = () => {
	const insets = useSafeAreaInsets();

	return Math.max(insets.bottom, MIN_PADDING_BOTTOM);
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
	const paddingBottom = useTabBarPaddingBottom();

	return (
		<XStack
			paddingTop={8}
			paddingBottom={paddingBottom}
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

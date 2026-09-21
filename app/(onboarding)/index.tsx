import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import {
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import {
	type NativeScrollEvent,
	type NativeSyntheticEvent,
	ScrollView,
	useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text, useTheme, XStack, YStack } from "tamagui";
import {
	GraphIllustration,
	IllustrationGlow,
	NotificationIllustration,
	ScaleIllustration,
	TrendIllustration,
} from "@/components/onboarding/illustrations";
import { PrimaryButton, Screen } from "@/components/ui";
import { layout } from "@/theme/designTokens";

/**
 * オンボーディングだけで使う寸法（#80）
 *
 * デザイン（390×844）の絶対座標から、上から順に積める余白に直したもの。
 * 画面ごとの値なので `theme/designTokens.ts` には置かない
 */
const ONBOARDING = {
	/** スキップの行の上端。セーフエリアの方が大きければそちらに寄せる */
	skipTop: 58,
	skipHeight: 36,
	/** スキップの行とイラスト領域の間 */
	illustrationTop: 10,
	illustrationHeight: 340,
	/** イラスト領域と見出しの間 */
	textTop: 34,
	textPaddingHorizontal: 24,
	/** ページインジケーターと主要ボタンの間 */
	indicatorBottom: 26,
	buttonHeight: 56,
	/** 画面の下端。ホームインジケーターのある端末ではセーフエリアがちょうどこの値になる */
	bottomPadding: 34,
} as const;

type OnboardingPage = {
	title: string;
	body: string;
	/** イラストに使える横幅を受け取って、そのページの見本を返す */
	renderIllustration: (width: number) => ReactNode;
};

const PAGES: OnboardingPage[] = [
	{
		title: "からチェキへようこそ！",
		body: "からチェキは、\n正しいボディメイクの考え方へ導きます",
		renderIllustration: (width) => <TrendIllustration width={width} />,
	},
	{
		title: "同じ時間に体重を測る",
		body: "スマホ連携できる体重計で、\n簡単に測定する",
		renderIllustration: () => <ScaleIllustration />,
	},
	{
		title: "毎朝の通知で\n平均の推移を把握する",
		body: "1日単位の数値にとらわれず、\n毎朝の通知で週ごとの傾向を確認し、\n正しいボディメイクを続けよう。",
		renderIllustration: (width) => <NotificationIllustration width={width} />,
	},
	{
		title: "グラフで長期的な\n変化の傾向をつかむ",
		body: "緩やかな変化や停滞を可視化して、\n長期的な視点で正しいボディメイクを\nサポートします。",
		renderIllustration: (width) => <GraphIllustration width={width} />,
	},
];

type PageContentProps = {
	page: OnboardingPage;
	/** 1 ページの横幅（＝画面の横幅） */
	width: number;
};

/**
 * 1 ページ分の中身
 *
 * 小さい端末で見出しや本文が切れないよう、ページごとに縦スクロールできるようにしている（#41）。
 * 背が高い端末では上端から積んだ位置がそのままデザイン通りになる
 */
const PageContent = ({ page, width }: PageContentProps) => {
	const illustrationWidth = width - layout.screenPaddingHorizontal * 2;

	return (
		<YStack width={width}>
			<ScrollView
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{
					flexGrow: 1,
					paddingTop: ONBOARDING.illustrationTop,
					paddingBottom: layout.gap,
				}}
			>
				<YStack
					height={ONBOARDING.illustrationHeight}
					alignItems="center"
					justifyContent="center"
					overflow="hidden"
				>
					<IllustrationGlow />
					{page.renderIllustration(illustrationWidth)}
				</YStack>
				<YStack
					marginTop={ONBOARDING.textTop}
					paddingHorizontal={ONBOARDING.textPaddingHorizontal}
					alignItems="center"
					gap={14}
				>
					<Text
						fontSize={26}
						lineHeight={36}
						fontWeight="800"
						color="$textPrimary"
						textAlign="center"
					>
						{page.title}
					</Text>
					<Text
						fontSize={15}
						lineHeight={24}
						color="$textMuted"
						textAlign="center"
					>
						{page.body}
					</Text>
				</YStack>
			</ScrollView>
		</YStack>
	);
};

export default function Index() {
	const theme = useTheme();
	const router = useRouter();
	const insets = useSafeAreaInsets();
	const { width } = useWindowDimensions();

	const pagerRef = useRef<ScrollView>(null);
	const [pageIndex, setPageIndex] = useState(0);

	const [isFirstLaunch, setIsFirstLaunch] = useState<null | boolean>(null);

	// 初回起動チェック
	useEffect(() => {
		const checkFirstLaunch = async () => {
			try {
				const value = await AsyncStorage.getItem("isFirstLaunch");
				if (value === null) {
					// 初回起動
					setIsFirstLaunch(true);
					await AsyncStorage.setItem("isFirstLaunch", "false");
				} else {
					// 2回目以降の起動
					setIsFirstLaunch(false);
				}
			} catch (error) {
				console.error("初回起動のチェックでエラーが発生しました:", error);
				// 読めなかったときはオンボーディングを出す。
				// 真っ白な画面で止まるより、2 回目に出てしまう方がまだ良い
				setIsFirstLaunch(true);
			}
		};
		checkFirstLaunch();
	}, []);

	const isLastPage = pageIndex === PAGES.length - 1;

	/** スキップ / はじめる。どちらもホームに入る */
	const goToHome = useCallback(() => {
		router.replace("/(tabs)/home");
	}, [router]);

	const goToNextPage = useCallback(() => {
		if (isLastPage) {
			goToHome();
			return;
		}

		const nextIndex = pageIndex + 1;
		pagerRef.current?.scrollTo({ x: nextIndex * width, animated: true });
		setPageIndex(nextIndex);
	}, [goToHome, isLastPage, pageIndex, width]);

	/** スワイプで動かしたときに、インジケーターとボタンの表示を合わせる */
	const handleMomentumScrollEnd = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			setPageIndex(Math.round(event.nativeEvent.contentOffset.x / width));
		},
		[width],
	);

	// NOTE: Layoutで初回起動かを取得しinitialRouteNameで分岐させたかったがうまく動作しないので、ここで分岐
	if (isFirstLaunch === false) {
		return <Redirect href="/(tabs)/home" />;
	}

	// 判定が終わるまでは何も出さない。オンボーディングが一瞬だけ見えるのを防ぐ
	if (isFirstLaunch === null) {
		return <Screen />;
	}

	return (
		<Screen>
			<XStack
				marginTop={Math.max(ONBOARDING.skipTop, insets.top + 8)}
				height={ONBOARDING.skipHeight}
				paddingHorizontal={20}
				justifyContent="flex-end"
			>
				{/* 4 ページ目にはスキップを出さない。行そのものは残して、ページ間で位置がずれないようにする */}
				{isLastPage ? null : (
					<Text
						accessibilityRole="button"
						onPress={goToHome}
						height={ONBOARDING.skipHeight}
						lineHeight={ONBOARDING.skipHeight}
						paddingHorizontal={8}
						fontSize={15}
						fontWeight="500"
						color="$textMuted"
						pressStyle={{ opacity: 0.6 }}
					>
						スキップ
					</Text>
				)}
			</XStack>

			<ScrollView
				ref={pagerRef}
				horizontal
				pagingEnabled
				showsHorizontalScrollIndicator={false}
				onMomentumScrollEnd={handleMomentumScrollEnd}
				style={{ flex: 1 }}
			>
				{PAGES.map((page) => (
					<PageContent key={page.title} page={page} width={width} />
				))}
			</ScrollView>

			<XStack
				justifyContent="center"
				alignItems="center"
				gap={8}
				marginBottom={ONBOARDING.indicatorBottom}
			>
				{PAGES.map((page, index) => (
					<YStack
						key={page.title}
						width={index === pageIndex ? 22 : 8}
						height={8}
						borderRadius={4}
						backgroundColor={
							index === pageIndex ? "$accentFill" : "$cardBorder"
						}
					/>
				))}
			</XStack>

			<XStack
				paddingHorizontal={layout.screenPaddingHorizontal}
				paddingBottom={Math.max(insets.bottom, ONBOARDING.bottomPadding)}
			>
				<PrimaryButton
					height={ONBOARDING.buttonHeight}
					borderRadius={ONBOARDING.buttonHeight / 2}
					fontSize={17}
					onPress={goToNextPage}
					iconAfter={
						isLastPage ? undefined : (
							<ChevronRight
								size={18}
								color={theme.onAccentFill.val}
								strokeWidth={2.4}
							/>
						)
					}
				>
					{isLastPage ? "はじめる" : "次へ"}
				</PrimaryButton>
			</XStack>
		</Screen>
	);
}

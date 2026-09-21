import { type Href, Link, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { H1, SizableText, useTheme, XStack, YStack } from "tamagui";
import { layout, typography } from "@/theme/designTokens";

export type ScreenHeaderProps = {
	/** タイトルの上に置く小さいラベル。日付や件数など */
	label?: string;
	title: string;
	/** タイトルの右に並べるもの。換算表を開くボタンなど */
	right?: ReactNode;
};

/**
 * 画面の見出し（#77）
 *
 * OS のヘッダーをやめて、コンテンツの中に置く見出しに一本化する。
 * 「ラベル ＋ タイトル」の 2 行で、`right` を渡すと右端に並ぶ
 */
export const ScreenHeader = ({ label, title, right }: ScreenHeaderProps) => {
	const heading = (
		<YStack gap={2}>
			{label !== undefined && (
				<SizableText
					fontSize={typography.screenLabel.fontSize}
					lineHeight={typography.screenLabel.lineHeight}
					fontWeight={typography.screenLabel.fontWeight}
					letterSpacing={typography.screenLabel.letterSpacing}
					color="$textMuted"
				>
					{label}
				</SizableText>
			)}
			<H1
				margin={0}
				fontSize={typography.screenTitle.fontSize}
				lineHeight={typography.screenTitle.lineHeight}
				fontWeight={typography.screenTitle.fontWeight}
				color="$textPrimary"
			>
				{title}
			</H1>
		</YStack>
	);

	if (right === undefined) {
		return <YStack paddingBottom={4}>{heading}</YStack>;
	}

	return (
		<XStack
			paddingBottom={4}
			alignItems="flex-end"
			justifyContent="space-between"
			gap={12}
		>
			{heading}
			{right}
		</XStack>
	);
};

export type BackLinkProps = {
	/** 戻り先。省略すると履歴を 1 つ戻る */
	href?: Href;
	/** 戻り先の画面名 */
	children: string;
};

/**
 * サブ画面の見出しの上に置く戻るリンク（#77）
 *
 * OS のヘッダーをやめた分、戻る手段をコンテンツの中に用意する
 */
export const BackLink = ({ href, children }: BackLinkProps) => {
	const theme = useTheme();
	const router = useRouter();

	const content = (
		<XStack
			alignItems="center"
			gap={2}
			height={layout.touchTargetHeight}
			marginLeft={-8}
			alignSelf="flex-start"
			accessibilityRole="link"
			{...(href === undefined && { onPress: () => router.back() })}
		>
			<ChevronLeft color={theme.accent.val} size={24} strokeWidth={2.2} />
			<SizableText
				fontSize={typography.backLink.fontSize}
				lineHeight={typography.backLink.lineHeight}
				fontWeight={typography.backLink.fontWeight}
				color="$accent"
			>
				{children}
			</SizableText>
		</XStack>
	);

	if (href === undefined) {
		return content;
	}

	return (
		<Link href={href} asChild>
			{content}
		</Link>
	);
};

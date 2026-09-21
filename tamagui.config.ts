import { config } from "@tamagui/config/v3";
import { Platform } from "react-native";
import { createFont, createTamagui } from "tamagui";
import { withDesignTokens } from "@/theme/designTokens";
import { themes as generatedThemes } from "./theme-output";

/**
 * 日本語は OS 標準のフォントに任せる（#77）
 *
 * Noto Sans JP を同梱すると日本語グリフの分だけアプリが数 MB 太るので、
 * 同梱するのは数値用の Barlow Condensed だけにして、
 * 本文は iOS なら San Francisco ＋ ヒラギノ角ゴシックに任せる
 */
const SYSTEM_FONT_FAMILY = Platform.select({
	ios: "System",
	default: "sans-serif",
});

/**
 * 数値用のフォント
 *
 * 体重・重量・レップ・日付などの数値はすべてこの書体で出す（`components/ui/numberText.tsx`）。
 * `face` に weight ごとの実ファミリ名を書いておくと、
 * `fontWeight` の指定だけで Tamagui がファミリを差し替えてくれる。
 * 実ファイルの読み込みは `app/_layout.tsx` の `useFonts`。
 */
const numericFont = createFont({
	family: "BarlowCondensed_700Bold",
	// 数値は実寸を直接指定することが多いので、目盛りはデザインで使う値だけ用意する
	size: { 1: 12, 2: 16, 3: 20, 4: 22, 5: 28, 6: 34, 7: 36, 8: 68, 9: 88 },
	lineHeight: {
		1: 16,
		2: 20,
		3: 22,
		4: 26,
		5: 30,
		6: 38,
		7: 40,
		8: 64,
		9: 80,
	},
	weight: { 1: "600", 2: "700" },
	letterSpacing: { 1: 0 },
	face: {
		600: { normal: "BarlowCondensed_600SemiBold" },
		700: { normal: "BarlowCondensed_700Bold" },
	},
});

/**
 * Tamagui の既定フォント（Inter）を OS 標準に差し替える
 *
 * `face` は Inter のウェイト別ファイル名の対応表なので消す。
 * OS 標準フォントは `fontWeight` だけでウェイトが変わる
 */
const toSystemFont = <TFont extends { face?: unknown }>({
	face: _face,
	...font
}: TFont) => ({ ...font, family: SYSTEM_FONT_FAMILY });

/** リデザインの意味づけした色を全テーマに足す（#77） */
const themes = withDesignTokens(generatedThemes);

export const tamaguiConfig = createTamagui({
	...config,
	fonts: {
		...config.fonts,
		body: toSystemFont(config.fonts.body),
		heading: toSystemFont(config.fonts.heading),
		numeric: numericFont,
	},
	// カスタムテーマの適用
	themes,
});

export default tamaguiConfig;

export type Conf = typeof tamaguiConfig;

declare module "tamagui" {
	interface TamaguiCustomConfig extends Conf {}
}

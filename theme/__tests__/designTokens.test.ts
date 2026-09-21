import {
	type ColorTokens,
	darkColorTokens,
	lightColorTokens,
	withDesignTokens,
} from "@/theme/designTokens";
import { themes as generatedThemes } from "@/theme-output";

/** #RRGGBB / rgb(a)(...) のどちらかであることだけ見る */
const COLOR_PATTERN = /^(#[0-9A-Fa-f]{6}|rgba?\([\d.,\s]+\))$/;

const tokenNames = Object.keys(lightColorTokens) as (keyof ColorTokens)[];

describe("デザイントークン", () => {
	it("ライトとダークで同じキーを持つ", () => {
		expect(Object.keys(lightColorTokens).sort()).toEqual(
			Object.keys(darkColorTokens).sort(),
		);
	});

	it("すべての値が色として読める", () => {
		for (const tokens of [lightColorTokens, darkColorTokens]) {
			for (const value of Object.values(tokens)) {
				expect(value).toMatch(COLOR_PATTERN);
			}
		}
	});
});

describe("withDesignTokens", () => {
	const themes = withDesignTokens(generatedThemes);

	it("light / dark にそれぞれのトークンが入る", () => {
		for (const name of tokenNames) {
			expect(themes.light[name]).toBe(lightColorTokens[name]);
			expect(themes.dark[name]).toBe(darkColorTokens[name]);
		}
	});

	it("子テーマにもトークンが入る", () => {
		// ヒーローカードのように子テーマの中で使うので、すべてのテーマに入っている必要がある
		for (const [name, theme] of Object.entries(themes)) {
			for (const tokenName of tokenNames) {
				expect({
					theme: name,
					token: tokenName,
					value: theme[tokenName],
				}).toEqual({
					theme: name,
					token: tokenName,
					value: name.startsWith("dark")
						? darkColorTokens[tokenName as keyof typeof darkColorTokens]
						: lightColorTokens[tokenName as keyof typeof lightColorTokens],
				});
			}
		}
	});

	it("生成済みテーマの値は上書きしない", () => {
		expect(themes.light.background).toBe(generatedThemes.light.background);
		expect(themes.dark.color).toBe(generatedThemes.dark.color);
	});
});

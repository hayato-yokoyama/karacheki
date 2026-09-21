import { Text, type TextProps } from "tamagui";

/**
 * 桁が動いても横幅が揺れないようにする指定
 *
 * Barlow Condensed は等幅の数字を持っているので、その字形を明示的に選ぶ。
 * これが無いと 1 と 8 で幅が変わり、体重が更新されるたびに数字が横に踊る
 */
const TABULAR_NUMS = { fontVariant: ["tabular-nums" as const] };

export type NumberTextProps = Omit<TextProps, "fontFamily"> & {
	/** デザインで使うのは 600（補助的な数値）と 700（主役の数値）だけ */
	weight?: "600" | "700";
};

/**
 * 数値用のテキスト
 *
 * 体重・重量・レップ・日付など、**数値はすべて** これで出す（#77）。
 * 書体は Barlow Condensed 固定で、日本語まじりの文字列には使わない
 * （日本語グリフを持たないので OS 標準にフォールバックして書体が混ざる）
 */
export const NumberText = ({
	weight = "700",
	style,
	...props
}: NumberTextProps) => (
	<Text
		fontFamily="$numeric"
		fontWeight={weight}
		color="$textPrimary"
		{...props}
		style={[TABULAR_NUMS, style]}
	/>
);

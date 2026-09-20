import { Fragment } from "react";
import { Separator, SizableText, Tabs } from "tamagui";

/** セグメントの選択肢 */
export type SegmentOption<TValue extends string> = {
	value: TValue;
	label: string;
};

/**
 * 選択中のセグメントに当てるスタイル
 *
 * Tabs.Tab の既定の選択表示は backgroundColor を $backgroundActive にするだけだが、
 * このアプリのカスタムテーマは $backgroundActive を持たないため、
 * 選択中と未選択が同じ見た目になり、どれを選んでいるか分からない。
 * activeStyle を渡すと既定の指定ごと差し替えられる
 * （@tamagui/tabs は activeStyle があるとき $backgroundActive を当てない）
 */
const SELECTED_STYLE = { backgroundColor: "$accentBackground" } as const;

/**
 * 選択中の文字色
 *
 * アクセント色の背景に既定の文字色だと読みにくい。
 * $color1 は各テーマの背景寄りの色で、
 * ライト（濃い青の背景）では明るく、ダーク（明るい青の背景）では暗くなるため、
 * どちらのテーマでもコントラストが取れる
 */
const SELECTED_TEXT_COLOR = "$color1" as const;

/**
 * 選択肢を横に並べて 1 つ選ばせるセグメント
 *
 * グラフの期間切り替えと BIG3 の種目切り替えで見た目が割れないよう、
 * 選択の見せ方をここに集める
 */
export const SegmentedControl = <TValue extends string>({
	options,
	value,
	onChange,
}: {
	options: readonly SegmentOption<TValue>[];
	value: TValue;
	onChange: (value: TValue) => void;
}) => (
	<Tabs
		value={value}
		onValueChange={(next) => onChange(next as TValue)}
		orientation="horizontal"
		flexDirection="column"
		width="100%"
	>
		{/* NOTE: Tamagui v2 で Group（Tabs.List）の separator prop が無くなったので手で挟む */}
		<Tabs.List>
			{options.map((option, index) => {
				const isSelected = option.value === value;

				return (
					<Fragment key={option.value}>
						{index > 0 && <Separator vertical />}
						<Tabs.Tab
							flex={1}
							value={option.value}
							activeStyle={SELECTED_STYLE}
							// 選択中をもう一度押したときに塗りが消えないようにする
							{...(isSelected && { pressStyle: SELECTED_STYLE })}
						>
							<SizableText
								size="$3"
								{...(isSelected && { color: SELECTED_TEXT_COLOR })}
							>
								{option.label}
							</SizableText>
						</Tabs.Tab>
					</Fragment>
				);
			})}
		</Tabs.List>
	</Tabs>
);

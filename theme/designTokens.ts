/**
 * リデザインのデザイントークン（#77）
 *
 * 色は Tamagui のテーマに流し込んで `$screenBackground` のように引く（`tamagui.config.ts` 参照）。
 * ここに置いてあるのは「テーマに入れる前の素の値」と、
 * 色ではないため テーマに入れられない寸法・字送りの値。
 *
 * 値の出どころは デザインキャンバス（からチェキ リデザイン）の各アートボード。
 */

/** ライト / ダークで差し替える色トークン */
export type ColorTokens = {
	/** 画面の地。カードを載せる薄いグレー */
	screenBackground: string;
	/** screenBackground と同じ色の透明版。下部のフェードのグラデーション始点に使う */
	screenBackgroundTransparent: string;
	/** カード面 */
	cardBackground: string;
	/** cardBackground と同じ色の透明版。カードの中の横スクロールを示すフェードに使う */
	cardBackgroundTransparent: string;
	/** 境界線・淡い面 */
	cardBorder: string;
	/** カードの影の色。不透明度込みで持たせて shadowOpacity は 1 で使う（ダークは影なし＝透明） */
	cardShadowColor: string;
	/** 本文 */
	textPrimary: string;
	/** 補助テキスト */
	textMuted: string;
	/** 未入力のプレースホルダ数値 */
	textPlaceholder: string;
	/** グラフの目盛り線 */
	chartGrid: string;
	/** グラフの実測データ（点と細い線）。傾向線はアクセント色で描く */
	chartActual: string;
	/** アクセント。文字・アイコン・リンクに使う */
	accent: string;
	/** 塗りつぶしのアクセント。主要ボタンと選択中のセグメントの地 */
	accentFill: string;
	/** accentFill の上に載る文字・アイコン */
	onAccentFill: string;
	/** accentFill の影 */
	accentFillShadowColor: string;
	/** アクセントの淡色。バッジ地・淡ボタン・タブのピル */
	accentSoft: string;
	/** セグメントのトラック。押せない主要ボタンの地にも使う */
	segmentTrack: string;
	/** タブバーの地（半透明） */
	tabBarBackground: string;
	/** 破壊的操作の文字 */
	danger: string;
	/** 破壊的操作の地 */
	dangerSoft: string;
	/** 破壊的操作の境界線 */
	dangerBorder: string;
	/** 自己ベスト（PR）バッジの地 */
	prBadgeBackground: string;
	/** 自己ベスト（PR）バッジの文字 */
	prBadgeText: string;
	/** 自己ベスト（PR）バッジのアイコン */
	prBadgeIcon: string;
	/** 写真のプレースホルダのグラデーション始点 */
	photoPlaceholderStart: string;
	/** 写真のプレースホルダのグラデーション終点 */
	photoPlaceholderEnd: string;
	/** 写真のプレースホルダに置くアイコン */
	photoPlaceholderIcon: string;
	/** ボトムシートの背後のオーバーレイ */
	sheetOverlay: string;
	/** ボトムシートのグラブハンドル */
	sheetHandle: string;
	/** グラフの目盛り線（#79） */
	graphGrid: string;
	/** グラフの実測データの線（#79） */
	graphActualLine: string;
	/** グラフのデータなし表示（破線の枠・プレースホルダの数値）（#79） */
	graphPlaceholder: string;
	/** タップした値を出すピルの地（#79） */
	graphTooltipBackground: string;
	/** タップした値を出すピルの文字（#79） */
	graphTooltipText: string;
	/** ヒーローカードの上に載る文字（ライト・ダーク共通） */
	onHero: string;
	/** ヒーローカードの上の補助文字 */
	onHeroMuted: string;
	/** ヒーローカードの上のさらに弱い文字 */
	onHeroSubtle: string;
	/** ヒーローカードの中の区切り線 */
	onHeroDivider: string;
	/** ヒーローカードの中のチップの地 */
	onHeroChip: string;
	/** ヒーローカードの中の自己ベストの金色 */
	onHeroGold: string;
	/** ヒーローカードの影 */
	heroShadowColor: string;
	/** オンボーディングのイラストのカードを浮かせる影（ライト・ダーク共通） */
	illustrationShadowColor: string;
};

/**
 * ヒーローカードの上に載るものはライト・ダークで同じ
 *
 * 地が濃い青のグラデーションで固定なので、テーマで色を変える必要がない
 */
const heroOnColors = {
	onHero: "#FFFFFF",
	onHeroMuted: "rgba(255,255,255,0.92)",
	onHeroSubtle: "rgba(255,255,255,0.85)",
	onHeroDivider: "rgba(255,255,255,0.22)",
	onHeroChip: "rgba(255,255,255,0.20)",
	onHeroGold: "#FFD979",
	heroShadowColor: "rgba(6,60,120,0.30)",
} as const;

/**
 * オンボーディングのイラストのカードの影（#80）
 *
 * 通常のカード（`$cardShadowColor`）はダークで透明にして境界線に任せているが、
 * オンボーディングのイラストは「作りもののアプリ画面が浮いている」ことが絵の一部なので、
 * ダークでも影を残す。そのためライト・ダークで同じ値を持たせる
 */
const illustrationShadow = {
	illustrationShadowColor: "rgba(0,60,120,0.12)",
} as const;

export const lightColorTokens: ColorTokens = {
	screenBackground: "#F3F4F7",
	screenBackgroundTransparent: "rgba(243,244,247,0)",
	cardBackground: "#FFFFFF",
	cardBackgroundTransparent: "rgba(255,255,255,0)",
	cardBorder: "#E2E5EC",
	cardShadowColor: "rgba(16,24,40,0.10)",
	textPrimary: "#12151C",
	textMuted: "#5B6272",
	textPlaceholder: "#C3CAD8",
	chartGrid: "#E6E9EF",
	chartActual: "#9CA6BB",
	accent: "#0057A8",
	accentFill: "#0057A8",
	onAccentFill: "#FFFFFF",
	accentFillShadowColor: "rgba(0,87,168,0.28)",
	accentSoft: "#E2EDF9",
	segmentTrack: "#E7EAF0",
	tabBarBackground: "rgba(255,255,255,0.94)",
	danger: "#B42318",
	dangerSoft: "#FDECEA",
	dangerBorder: "#F6C9C4",
	prBadgeBackground: "#FFF1D1",
	prBadgeText: "#7A4E00",
	prBadgeIcon: "#C98500",
	photoPlaceholderStart: "#DCE4F0",
	photoPlaceholderEnd: "#C2CDDF",
	photoPlaceholderIcon: "#7D8AA3",
	sheetOverlay: "rgba(16,24,40,0.42)",
	sheetHandle: "#E2E5EC",
	graphGrid: "#E6E9EF",
	graphActualLine: "#9CA6BB",
	graphPlaceholder: "#C3CAD8",
	graphTooltipBackground: "#12151C",
	graphTooltipText: "#FFFFFF",
	...heroOnColors,
	...illustrationShadow,
};

export const darkColorTokens: ColorTokens = {
	screenBackground: "#0B0E13",
	screenBackgroundTransparent: "rgba(11,14,19,0)",
	cardBackground: "#151A22",
	cardBackgroundTransparent: "rgba(21,26,34,0)",
	cardBorder: "#262E3A",
	// ダークは影ではなく境界線で面を分けるので、影は透明にして無効化する
	cardShadowColor: "rgba(0,0,0,0)",
	textPrimary: "#EEF1F6",
	textMuted: "#98A2B3",
	textPlaceholder: "#98A2B3",
	chartGrid: "#232B37",
	chartActual: "#617089",
	accent: "#4DA8FF",
	// ダークの #4DA8FF は白文字とのコントラストが足りないので、塗りだけ一段濃くする
	accentFill: "#1670CF",
	onAccentFill: "#FFFFFF",
	accentFillShadowColor: "rgba(22,112,207,0.35)",
	accentSoft: "#132B47",
	segmentTrack: "#1D232D",
	tabBarBackground: "rgba(15,19,26,0.94)",
	danger: "#FF9A8F",
	dangerSoft: "#2E1517",
	dangerBorder: "#4A2226",
	prBadgeBackground: "#2C2410",
	prBadgeText: "#FFC94D",
	prBadgeIcon: "#FFC94D",
	photoPlaceholderStart: "#242D3A",
	photoPlaceholderEnd: "#171D27",
	photoPlaceholderIcon: "#5B677B",
	sheetOverlay: "rgba(16,24,40,0.42)",
	sheetHandle: "#262E3A",
	graphGrid: "#232B37",
	graphActualLine: "#617089",
	// 本文色とのコントラストを取りたい textPlaceholder（#98A2B3）より一段暗い。
	// グラフのデータなし表示は面積が大きく、明るいと「データがある」ように見えてしまうため
	graphPlaceholder: "#37414F",
	graphTooltipBackground: "#EEF1F6",
	graphTooltipText: "#0B0E13",
	...heroOnColors,
	...illustrationShadow,
};

/**
 * 生成済みの Tamagui テーマにリデザインのトークンを足す
 *
 * Tamagui の型はテーマ同士でキーが揃っている前提なので、
 * light / dark だけでなく子テーマ（light_accent, dark_Button …）にも同じキーを入れる。
 * 生成済みの値の方が優先されるよう、トークンは先に広げる
 */
export const withDesignTokens = <TThemes extends Record<string, object>>(
	themes: TThemes,
) =>
	Object.fromEntries(
		Object.entries(themes).map(([name, theme]) => [
			name,
			{
				...(name.startsWith("dark") ? darkColorTokens : lightColorTokens),
				...theme,
			},
		]),
	) as { [TName in keyof TThemes]: TThemes[TName] & ColorTokens };

/**
 * ヒーローカードのグラデーション
 *
 * ライト・ダーク共通。`@tamagui/linear-gradient` の colors / locations にそのまま渡す
 * （`colors` / `locations` の型が可変配列なので `as const` を付けない）
 */
export const HERO_GRADIENT_COLORS: string[] = ["#1670CF", "#0A56A6", "#063C78"];
export const HERO_GRADIENT_LOCATIONS: number[] = [0, 0.55, 1];
/** CSS の linear-gradient(155deg, ...) に相当する向き */
export const HERO_GRADIENT_START = { x: 0, y: 0 } as const;
export const HERO_GRADIENT_END = { x: 0.42, y: 1 } as const;

/** 角丸 */
export const radius = {
	/** ヒーローカード */
	hero: 28,
	/** 通常カード */
	card: 22,
	/** 通常カード（小さめ。2 列に並べるタイルなど） */
	cardSmall: 20,
	/** 小さいタイル */
	tile: 16,
	/** ボトムシートの上端 */
	sheet: 28,
	/** セグメントのトラック */
	segment: 18,
	/** セグメントの選択中 */
	segmentThumb: 14,
} as const;

/** 余白・寸法 */
export const layout = {
	/** 画面の左右余白 */
	screenPaddingHorizontal: 16,
	/** コンテンツ上端（セーフエリア込み） */
	screenPaddingTop: 60,
	/** 要素間 */
	gap: 12,
	/** タブバーのアクティブなピル */
	tabPillWidth: 60,
	tabPillHeight: 32,
	tabIconSize: 24,
	/** 下部固定ボタン */
	primaryButtonHeight: 52,
	/** 下部固定ボタンとタブバーの間 */
	primaryButtonGap: 12,
	/** 下部固定ボタンの背後に敷くフェード */
	bottomFadeHeight: 140,
	/** セグメントコントロール */
	segmentHeight: 52,
	segmentPadding: 4,
	/** 戻るリンクなどのタップ領域 */
	touchTargetHeight: 44,
	/** ボトムシートのグラブハンドル */
	sheetHandleWidth: 36,
	sheetHandleHeight: 5,
} as const;

/** タイポグラフィ。数値は `NumberText`、それ以外は Tamagui の Text 系に渡す */
export const typography = {
	/** 画面タイトルの上のラベル */
	screenLabel: {
		fontSize: 13,
		lineHeight: 17,
		fontWeight: "500",
		letterSpacing: 0.26,
	},
	/** 画面タイトル */
	screenTitle: { fontSize: 30, lineHeight: 38, fontWeight: "800" },
	/** セクション見出し */
	sectionTitle: { fontSize: 18, lineHeight: 24, fontWeight: "800" },
	/** 戻るリンク */
	backLink: { fontSize: 16, lineHeight: 22, fontWeight: "600" },
	/** 下部固定ボタン */
	primaryButton: { fontSize: 16, lineHeight: 22, fontWeight: "700" },
	/** セグメント */
	segment: { fontSize: 14, lineHeight: 20 },
	/** タブバーのラベル */
	tabLabel: { fontSize: 11, lineHeight: 14 },
} as const;

/** ヒーローの主数値のサイズ。画面によって変わる */
export const heroNumberSize = {
	/** ホームの週平均 */
	home: { fontSize: 68, lineHeight: 64 },
	/** BIG3 の自己ベスト */
	lift: { fontSize: 88, lineHeight: 80 },
} as const;

import { useState } from "react";
import type { LayoutChangeEvent } from "react-native";
import Svg, {
	Circle,
	Defs,
	LinearGradient,
	Path,
	Stop,
} from "react-native-svg";
import { View } from "tamagui";
import { buildSparkline } from "@/services/sparkline";

/** ヒーローの中に置く高さ */
const HEIGHT = 50;

/** 線の太さ */
const STROKE_WIDTH = 2.5;

/** 最新の点に重ねる丸。外側は半透明にして線から浮かせる */
const LAST_POINT_RADIUS = 3.8;
const LAST_POINT_HALO_RADIUS = 7;

/** 端で丸や線が切れないだけ空ける */
const PADDING = LAST_POINT_HALO_RADIUS;

export type WeeklySparklineProps = {
	/** 週平均を古い順に並べたもの。測定のない週は null */
	values: readonly (number | null)[];
	/** アクセシビリティ用の説明 */
	label: string;
};

/**
 * ヒーローに敷く週平均の推移（#78）
 *
 * 地が濃い青のグラデーションで固定なので、線も塗りも白で描く。
 * 幅は親に合わせるため、レイアウトが決まるまでは描かない
 */
export const WeeklySparkline = ({ values, label }: WeeklySparklineProps) => {
	const [width, setWidth] = useState(0);

	const handleLayout = (event: LayoutChangeEvent) => {
		setWidth(event.nativeEvent.layout.width);
	};

	// 測定のない週は線をつなぐ点にできないので落とす。
	// 週の数が 8 に満たないときも、残った点だけで横幅いっぱいに引く
	const measured = values.filter((value): value is number => value !== null);

	const sparkline =
		width > 0
			? buildSparkline(measured, { width, height: HEIGHT, padding: PADDING })
			: null;

	return (
		<View height={HEIGHT} onLayout={handleLayout}>
			{sparkline !== null && (
				<Svg
					width={width}
					height={HEIGHT}
					accessibilityRole="image"
					accessibilityLabel={label}
				>
					<Defs>
						<LinearGradient id="sparklineFade" x1="0" y1="0" x2="0" y2="1">
							<Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.28} />
							<Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
						</LinearGradient>
					</Defs>
					{sparkline.areaPath !== "" && (
						<Path d={sparkline.areaPath} fill="url(#sparklineFade)" />
					)}
					{sparkline.linePath !== "" && (
						<Path
							d={sparkline.linePath}
							fill="none"
							stroke="#FFFFFF"
							strokeWidth={STROKE_WIDTH}
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					)}
					<Circle
						cx={sparkline.lastPoint.x}
						cy={sparkline.lastPoint.y}
						r={LAST_POINT_HALO_RADIUS}
						fill="#FFFFFF"
						fillOpacity={0.25}
					/>
					<Circle
						cx={sparkline.lastPoint.x}
						cy={sparkline.lastPoint.y}
						r={LAST_POINT_RADIUS}
						fill="#FFFFFF"
					/>
				</Svg>
			)}
		</View>
	);
};

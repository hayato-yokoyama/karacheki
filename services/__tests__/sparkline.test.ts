import { buildSparkline, getSparklinePoints } from "@/services/sparkline";

/** 端の余白を 0 にして、値と座標の対応を確かめやすくする */
const size = { width: 100, height: 50, padding: 0 };

describe("getSparklinePoints", () => {
	it("最大値を上端、最小値を下端に置く", () => {
		const points = getSparklinePoints([70, 72, 71], size);

		expect(points.map((point) => point.y)).toEqual([50, 0, 25]);
	});

	it("点を横幅に等間隔で並べる", () => {
		const points = getSparklinePoints([70, 71, 72], size);

		expect(points.map((point) => point.x)).toEqual([0, 50, 100]);
	});

	it("値がすべて同じなら高さの真ん中に水平に並べる", () => {
		const points = getSparklinePoints([70, 70, 70], size);

		expect(points.map((point) => point.y)).toEqual([25, 25, 25]);
	});

	it("値が1つのときは右端（最新の位置）に置く", () => {
		expect(getSparklinePoints([70], size)).toEqual([{ x: 100, y: 25 }]);
	});

	it("余白のぶんだけ内側に描く", () => {
		const points = getSparklinePoints([70, 72], {
			width: 100,
			height: 50,
			padding: 5,
		});

		expect(points).toEqual([
			{ x: 5, y: 45 },
			{ x: 95, y: 5 },
		]);
	});
});

describe("buildSparkline", () => {
	it("値が無ければ描くものが無いので null を返す", () => {
		expect(buildSparkline([], size)).toBeNull();
	});

	it("値が1つのときは線を引かず、点の位置だけを返す", () => {
		const sparkline = buildSparkline([70], size);

		expect(sparkline).not.toBeNull();
		expect(sparkline?.linePath).toBe("");
		expect(sparkline?.areaPath).toBe("");
		expect(sparkline?.lastPoint).toEqual({ x: 100, y: 25 });
	});

	it("8週に満たなくても残った点だけで線を引く", () => {
		const sparkline = buildSparkline([70, 71, 72], size);

		expect(sparkline?.linePath).toBe(
			"M0,50 C25,50 25,25 50,25 C75,25 75,0 100,0",
		);
		// 塗りは折れ線を下端で閉じた形になる
		expect(sparkline?.areaPath).toBe(
			"M0,50 C25,50 25,25 50,25 C75,25 75,0 100,0 L100,50 L0,50 Z",
		);
		expect(sparkline?.lastPoint).toEqual({ x: 100, y: 0 });
	});
});

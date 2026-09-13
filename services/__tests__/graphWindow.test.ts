import {
	type GraphPoint,
	clampWindowEnd,
	getWindow,
	getYRange,
	isShowingLatest,
	panToEndMs,
	sliceByWindow,
} from "@/services/graphWindow";

const at = (iso: string) => new Date(iso).getTime();

const point = (
	iso: string,
	actual: number,
	trend: number | null = null,
): GraphPoint => ({
	date: at(iso),
	actualWeight: actual,
	trendWeight: trend,
});

describe("getWindow", () => {
	it("終端から指定月数だけ遡った範囲を返す", () => {
		expect(getWindow(at("2026-06-15T00:00:00Z"), 3)).toEqual({
			startMs: at("2026-03-15T00:00:00Z"),
			endMs: at("2026-06-15T00:00:00Z"),
		});
	});
});

describe("clampWindowEnd", () => {
	const nowMs = at("2026-06-15T00:00:00Z");
	const oldestMs = at("2024-01-01T00:00:00Z");

	it("未来へは進めない", () => {
		expect(
			clampWindowEnd({
				endMs: at("2026-08-01T00:00:00Z"),
				months: 3,
				oldestMs,
				nowMs,
			}),
		).toBe(nowMs);
	});

	it("最古データが左端に来る位置より過去へは遡れない", () => {
		expect(
			clampWindowEnd({
				endMs: at("2023-01-01T00:00:00Z"),
				months: 3,
				oldestMs,
				nowMs,
			}),
		).toBe(at("2024-04-01T00:00:00Z"));
	});

	it("範囲内の位置はそのまま返す", () => {
		const endMs = at("2025-05-05T00:00:00Z");
		expect(clampWindowEnd({ endMs, months: 3, oldestMs, nowMs })).toBe(endMs);
	});

	it("データの範囲が表示幅より短いときは常に今日を終端にする", () => {
		// 最古データが1ヶ月前しかないのに1年表示している状態
		expect(
			clampWindowEnd({
				endMs: at("2026-01-01T00:00:00Z"),
				months: 12,
				oldestMs: at("2026-05-15T00:00:00Z"),
				nowMs,
			}),
		).toBe(nowMs);
	});

	it("データが1件（最古 = 今日）でも今日に収まる", () => {
		expect(
			clampWindowEnd({ endMs: nowMs, months: 1, oldestMs: nowMs, nowMs }),
		).toBe(nowMs);
	});
});

describe("panToEndMs", () => {
	const currentEndMs = at("2026-06-15T00:00:00Z");

	it("右へドラッグすると過去へ遡る", () => {
		const result = panToEndMs({
			endMs: currentEndMs,
			deltaX: 100,
			chartWidth: 300,
			months: 3,
		});
		expect(result).toBeLessThan(currentEndMs);
	});

	it("左へドラッグすると未来へ進む", () => {
		const result = panToEndMs({
			endMs: currentEndMs,
			deltaX: -100,
			chartWidth: 300,
			months: 3,
		});
		expect(result).toBeGreaterThan(currentEndMs);
	});

	it("画面幅ぶんドラッグすると表示幅ぶん移動する", () => {
		const chartWidth = 300;
		const { startMs, endMs } = getWindow(currentEndMs, 3);
		const result = panToEndMs({
			endMs: currentEndMs,
			deltaX: chartWidth,
			chartWidth,
			months: 3,
		});
		expect(result).toBe(endMs - (endMs - startMs));
	});

	it("差分を分けて渡しても累計で渡しても同じ位置になる", () => {
		const chartWidth = 300;
		const once = panToEndMs({
			endMs: currentEndMs,
			deltaX: 60,
			chartWidth,
			months: 3,
		});
		const twice = panToEndMs({
			endMs: panToEndMs({
				endMs: currentEndMs,
				deltaX: 30,
				chartWidth,
				months: 3,
			}),
			deltaX: 30,
			chartWidth,
			months: 3,
		});
		// 月の長さの差で厳密には一致しないため、1時間の誤差を許容する
		expect(Math.abs(once - twice)).toBeLessThan(60 * 60 * 1000);
	});

	it("レイアウト確定前（幅0）は動かさない", () => {
		expect(
			panToEndMs({
				endMs: currentEndMs,
				deltaX: 100,
				chartWidth: 0,
				months: 3,
			}),
		).toBe(currentEndMs);
	});
});

describe("sliceByWindow", () => {
	const points = [
		point("2026-01-01T00:00:00Z", 70),
		point("2026-02-01T00:00:00Z", 69),
		point("2026-03-01T00:00:00Z", 68),
		point("2026-04-01T00:00:00Z", 67),
		point("2026-05-01T00:00:00Z", 66),
	];

	it("窓の中の点に加えて前後1点ずつを含める", () => {
		const result = sliceByWindow(points, {
			startMs: at("2026-02-15T00:00:00Z"),
			endMs: at("2026-04-15T00:00:00Z"),
		});
		expect(result.map((p) => p.actualWeight)).toEqual([69, 68, 67, 66]);
	});

	it("窓が測定の空白期間に入るときは空白を挟む2点を返す", () => {
		const result = sliceByWindow(points, {
			startMs: at("2026-02-05T00:00:00Z"),
			endMs: at("2026-02-20T00:00:00Z"),
		});
		expect(result.map((p) => p.actualWeight)).toEqual([69, 68]);
	});

	it("すべてが窓より過去なら直前の1点を返す", () => {
		const result = sliceByWindow(points, {
			startMs: at("2026-06-01T00:00:00Z"),
			endMs: at("2026-07-01T00:00:00Z"),
		});
		expect(result.map((p) => p.actualWeight)).toEqual([66]);
	});

	it("すべてが窓より未来なら直後の1点を返す", () => {
		const result = sliceByWindow(points, {
			startMs: at("2025-01-01T00:00:00Z"),
			endMs: at("2025-06-01T00:00:00Z"),
		});
		expect(result.map((p) => p.actualWeight)).toEqual([70]);
	});

	it("データが無いときは空を返す", () => {
		expect(
			sliceByWindow([], {
				startMs: at("2026-01-01T00:00:00Z"),
				endMs: at("2026-02-01T00:00:00Z"),
			}),
		).toEqual([]);
	});
});

describe("getYRange", () => {
	const graphWindow = {
		startMs: at("2026-02-01T00:00:00Z"),
		endMs: at("2026-04-01T00:00:00Z"),
	};

	it("窓の中のデータだけで範囲を決める", () => {
		const range = getYRange(
			[
				// 窓の外（前後のバッファ）
				point("2026-01-01T00:00:00Z", 90),
				point("2026-02-10T00:00:00Z", 70, 71),
				point("2026-03-10T00:00:00Z", 60, 61),
				point("2026-05-01T00:00:00Z", 10),
			],
			graphWindow,
		);
		// 60〜71 に 10% の余白
		expect(range).toEqual([60 - 1.1, 71 + 1.1]);
	});

	it("変化が小さくても最低 0.5kg の余白をとる", () => {
		const range = getYRange([point("2026-03-01T00:00:00Z", 70)], graphWindow);
		expect(range).toEqual([69.5, 70.5]);
	});

	it("窓の中にデータが無いときは渡された点から範囲を決める", () => {
		const range = getYRange(
			[point("2026-01-01T00:00:00Z", 70), point("2026-05-01T00:00:00Z", 60)],
			graphWindow,
		);
		expect(range).toEqual([59, 71]);
	});

	it("データが無いときは undefined を返す", () => {
		expect(getYRange([], graphWindow)).toBeUndefined();
	});
});

describe("isShowingLatest", () => {
	const nowMs = at("2026-06-15T00:00:00Z");

	it("今日を表示していれば true", () => {
		expect(isShowingLatest(nowMs, nowMs)).toBe(true);
	});

	it("1日以内のずれは今日とみなす", () => {
		expect(isShowingLatest(at("2026-06-14T12:00:00Z"), nowMs)).toBe(true);
	});

	it("遡っていれば false", () => {
		expect(isShowingLatest(at("2026-05-15T00:00:00Z"), nowMs)).toBe(false);
	});
});

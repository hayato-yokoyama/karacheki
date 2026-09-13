import {
	type GraphPoint,
	clampWindowEnd,
	easeOutCubic,
	flingToEndMs,
	formatWindowLabel,
	getInitialEndMs,
	getWindow,
	getXTickValues,
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

describe("flingToEndMs", () => {
	const currentEndMs = at("2026-06-15T00:00:00Z");
	const chartWidth = 300;

	it("速く払うほど遠くまで滑る", () => {
		const slow = flingToEndMs({
			endMs: currentEndMs,
			velocityX: 500,
			chartWidth,
			months: 3,
		});
		const fast = flingToEndMs({
			endMs: currentEndMs,
			velocityX: 2000,
			chartWidth,
			months: 3,
		});
		expect(currentEndMs - fast).toBeGreaterThan(currentEndMs - slow);
	});

	it("右へ払うと過去、左へ払うと未来へ滑る", () => {
		expect(
			flingToEndMs({
				endMs: currentEndMs,
				velocityX: 1000,
				chartWidth,
				months: 3,
			}),
		).toBeLessThan(currentEndMs);
		expect(
			flingToEndMs({
				endMs: currentEndMs,
				velocityX: -1000,
				chartWidth,
				months: 3,
			}),
		).toBeGreaterThan(currentEndMs);
	});

	it("速度が 0 なら動かない", () => {
		expect(
			flingToEndMs({
				endMs: currentEndMs,
				velocityX: 0,
				chartWidth,
				months: 3,
			}),
		).toBe(currentEndMs);
	});
});

describe("easeOutCubic", () => {
	it("開始と終了は 0 と 1", () => {
		expect(easeOutCubic(0)).toBe(0);
		expect(easeOutCubic(1)).toBe(1);
	});

	it("範囲外の進捗は 0〜1 に丸める", () => {
		expect(easeOutCubic(-1)).toBe(0);
		expect(easeOutCubic(2)).toBe(1);
	});

	it("終わりに向かって減速する（前半のほうが多く進む）", () => {
		const firstHalf = easeOutCubic(0.5);
		expect(firstHalf).toBeGreaterThan(0.5);
		expect(easeOutCubic(1) - firstHalf).toBeLessThan(firstHalf);
	});
});

describe("getWindow と clampWindowEnd の組み合わせ", () => {
	const nowMs = at("2026-06-15T00:00:00Z");

	it.each([1, 3, 6, 12])(
		"%sヶ月表示でどこまで遡っても、最古データは表示範囲から外れない",
		(months) => {
			// 月末は addMonths / subMonths が往復しないため、境界としていちばん厳しい
			const oldestMs = at("2026-01-31T00:00:00Z");
			const clamped = clampWindowEnd({
				endMs: at("2000-01-01T00:00:00Z"),
				months,
				oldestMs,
				nowMs,
			});

			expect(getWindow(clamped, months).startMs).toBeLessThanOrEqual(oldestMs);
		},
	);

	it("月末が最古データでも、左端のずれは3日以内に収まる", () => {
		const oldestMs = at("2026-01-31T00:00:00Z");
		const clamped = clampWindowEnd({
			endMs: 0,
			months: 1,
			oldestMs,
			nowMs,
		});
		const gap = oldestMs - getWindow(clamped, 1).startMs;

		expect(gap).toBeGreaterThanOrEqual(0);
		expect(gap).toBeLessThanOrEqual(3 * 24 * 60 * 60 * 1000);
	});
});

describe("sliceByWindow の境界", () => {
	it("窓の端にちょうど乗っている点は窓の中として扱う", () => {
		const startMs = at("2026-02-01T00:00:00Z");
		const endMs = at("2026-04-01T00:00:00Z");
		const points = [
			point("2026-01-01T00:00:00Z", 71),
			point(new Date(startMs).toISOString(), 70),
			point(new Date(endMs).toISOString(), 68),
			point("2026-05-01T00:00:00Z", 67),
		];

		// 端の点が窓内と判定されるので、その外側の点までバッファとして含まれる
		expect(
			sliceByWindow(points, { startMs, endMs }).map((p) => p.actualWeight),
		).toEqual([71, 70, 68, 67]);
	});

	it("データが1点だけでも落ちない", () => {
		const points = [point("2026-03-01T00:00:00Z", 70)];

		expect(
			sliceByWindow(points, {
				startMs: at("2026-02-01T00:00:00Z"),
				endMs: at("2026-04-01T00:00:00Z"),
			}),
		).toEqual(points);
	});
});

describe("getInitialEndMs", () => {
	const nowMs = at("2026-06-15T00:00:00Z");

	it("最新の測定が表示幅の中にあれば今日を右端にする", () => {
		expect(
			getInitialEndMs({
				newestMs: at("2026-06-10T00:00:00Z"),
				nowMs,
				months: 3,
			}),
		).toBe(nowMs);
	});

	it("最新の測定が表示幅より古いときは、その測定を右端にする", () => {
		const newestMs = at("2026-01-20T00:00:00Z");

		expect(getInitialEndMs({ newestMs, nowMs, months: 3 })).toBe(newestMs);
	});

	it("表示幅の左端ちょうどの測定は今日を右端にする", () => {
		const newestMs = getWindow(nowMs, 3).startMs;

		expect(getInitialEndMs({ newestMs, nowMs, months: 3 })).toBe(nowMs);
	});

	it("データが無ければ今日を右端にする", () => {
		expect(getInitialEndMs({ newestMs: undefined, nowMs, months: 3 })).toBe(
			nowMs,
		);
	});
});

describe("getXTickValues", () => {
	const graphWindow = {
		startMs: at("2026-03-15T00:00:00Z"),
		endMs: at("2026-06-15T00:00:00Z"),
	};

	it("すべての目盛りが窓の内側に入る", () => {
		for (const tick of getXTickValues(graphWindow, {
			count: 4,
			snapToMonth: false,
		})) {
			expect(tick).toBeGreaterThan(graphWindow.startMs);
			expect(tick).toBeLessThan(graphWindow.endMs);
		}
	});

	it("日の頭に丸められる（半端な時刻にならない）", () => {
		for (const tick of getXTickValues(graphWindow, {
			count: 4,
			snapToMonth: false,
		})) {
			const date = new Date(tick);
			expect([date.getHours(), date.getMinutes(), date.getSeconds()]).toEqual([
				0, 0, 0,
			]);
		}
	});

	it("月初に丸めるときは日付が1日になる", () => {
		for (const tick of getXTickValues(
			{
				startMs: at("2025-06-15T00:00:00Z"),
				endMs: at("2026-06-15T00:00:00Z"),
			},
			{ count: 4, snapToMonth: true },
		)) {
			expect(new Date(tick).getDate()).toBe(1);
		}
	});

	it("目盛りは昇順で重複しない", () => {
		const ticks = getXTickValues(graphWindow, { count: 4, snapToMonth: false });

		expect(ticks).toEqual([...new Set(ticks)]);
		expect(ticks).toEqual([...ticks].sort((a, b) => a - b));
	});

	it("窓が狭すぎて丸めると全部つぶれる場合は空を返す", () => {
		const startMs = at("2026-03-15T01:00:00Z");

		expect(
			getXTickValues(
				{ startMs, endMs: startMs + 60 * 60 * 1000 },
				{ count: 4, snapToMonth: false },
			),
		).toEqual([]);
	});
});

describe("formatWindowLabel", () => {
	it("開始日と終了日を並べる", () => {
		expect(
			formatWindowLabel({
				startMs: at("2026-03-05T00:00:00Z"),
				endMs: at("2026-06-15T00:00:00Z"),
			}),
		).toBe("2026/3/5 〜 2026/6/15");
	});
});

describe("isShowingLatest の境界", () => {
	const nowMs = at("2026-06-15T00:00:00Z");

	it("ちょうど1日前は今日とみなす", () => {
		expect(isShowingLatest(nowMs - 24 * 60 * 60 * 1000, nowMs)).toBe(true);
	});

	it("1日を1ミリ秒でも超えたら今日ではない", () => {
		expect(isShowingLatest(nowMs - 24 * 60 * 60 * 1000 - 1, nowMs)).toBe(false);
	});

	it("未来を指していても今日とみなす", () => {
		expect(isShowingLatest(nowMs + 60 * 60 * 1000, nowMs)).toBe(true);
	});
});

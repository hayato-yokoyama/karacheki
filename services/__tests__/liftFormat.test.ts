import {
	formatEstimated,
	formatFullDate,
	formatHeroDate,
	formatRecordMonthDay,
	formatRecordYear,
	formatSet,
	formatWeight,
	isToday,
} from "@/services/liftFormat";

describe("重量の表示", () => {
	it("小数第1位まで出す", () => {
		expect(formatWeight(95)).toBe("95.0");
		expect(formatWeight(87.5)).toBe("87.5");
	});

	it("推定1RM は整数に丸める", () => {
		// 90 × (1 + 5 / 40) = 101.25
		expect(
			formatEstimated({ exercise: "benchPress", weight: 90, reps: 5 }),
		).toBe("101");
		// 1 レップはそれ自体が 1RM なので換算しない
		expect(
			formatEstimated({ exercise: "benchPress", weight: 95, reps: 1 }),
		).toBe("95");
	});

	it("推定値の出どころは 重量 × レップ で出す", () => {
		expect(formatSet({ weight: 90, reps: 5 })).toBe("90.0kg × 5");
	});
});

describe("日付の表示", () => {
	it("記録の行は年と月日に分ける", () => {
		expect(formatRecordYear("2026-09-20")).toBe("2026");
		// 一桁の月日は 0 を落として、並んだときに数字が読みやすいようにする
		expect(formatRecordMonthDay("2026-09-20")).toBe("9/20");
	});

	it("ヒーローの日付はドット区切りにする", () => {
		expect(formatHeroDate("2026-09-20")).toBe("2026.9.20");
	});

	it("記録の詳細と日付チップはスラッシュ区切りの 0 埋めにする", () => {
		expect(formatFullDate("2026-09-20")).toBe("2026/09/20");
		expect(formatFullDate(new Date("2026-09-20T09:00:00+09:00"))).toBe(
			"2026/09/20",
		);
	});

	it("今日かどうかを判定できる", () => {
		expect(isToday(new Date())).toBe(true);
		expect(isToday(new Date("2020-01-01T09:00:00+09:00"))).toBe(false);
	});
});

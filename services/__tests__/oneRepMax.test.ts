import {
	estimateOneRepMax,
	getLiftPr,
	type LiftExercise,
	type LiftRecord,
	roundOneRepMax,
} from "@/services/oneRepMax";

const record = ({
	id,
	exercise = "benchPress",
	weight,
	reps,
	performedAt,
	createdAt = `${performedAt}T00:00:00.000Z`,
}: {
	id: string;
	exercise?: LiftExercise;
	weight: number;
	reps: number;
	performedAt: string;
	createdAt?: string;
}): LiftRecord => ({
	id,
	exercise,
	weight,
	reps,
	performedAt,
	createdAt,
});

/** 表示に出るのは丸めたあとの値なので、換算表との比較はここを通す */
const estimateForDisplay = (
	exercise: LiftExercise,
	weight: number,
	reps: number,
) => roundOneRepMax(estimateOneRepMax({ exercise, weight, reps }));

describe("estimateOneRepMax", () => {
	it("ベンチプレスは換算表と一致する", () => {
		expect(estimateForDisplay("benchPress", 85, 5)).toBe(96);
		expect(estimateForDisplay("benchPress", 100, 2)).toBe(105);
		expect(estimateForDisplay("benchPress", 100, 12)).toBe(130);
	});

	it("スクワット・デッドリフトは換算表と一致する", () => {
		expect(estimateForDisplay("squat", 85, 5)).toBe(98);
		expect(estimateForDisplay("deadlift", 85, 5)).toBe(98);
		expect(estimateForDisplay("squat", 100, 12)).toBe(136);
	});

	it("1 レップは換算せず挙上重量をそのまま返す", () => {
		expect(
			estimateOneRepMax({ exercise: "benchPress", weight: 100, reps: 1 }),
		).toBe(100);
		expect(estimateOneRepMax({ exercise: "squat", weight: 140, reps: 1 })).toBe(
			140,
		);
	});
});

describe("roundOneRepMax", () => {
	it("浮動小数の誤差で切り下がらない", () => {
		// 100 × (1 + 11 / 40) は 127.49999... になり、そのまま丸めると 127 になってしまう
		expect(
			estimateOneRepMax({ exercise: "benchPress", weight: 100, reps: 11 }),
		).toBeLessThan(127.5);
		expect(estimateForDisplay("benchPress", 100, 11)).toBe(128);
	});
});

describe("getLiftPr", () => {
	it("実測 PR は 1 レップの記録のうち最も重いものを選ぶ", () => {
		const records = [
			record({ id: "a", weight: 95, reps: 1, performedAt: "2026-07-01" }),
			record({ id: "b", weight: 100, reps: 1, performedAt: "2026-08-12" }),
			// 推定ではこれが最大だが、1 レップではないので実測 PR にはならない
			record({ id: "c", weight: 85, reps: 10, performedAt: "2026-09-01" }),
		];

		expect(getLiftPr(records, "benchPress").actual?.id).toBe("b");
	});

	it("1 レップの記録がなければ実測 PR は undefined", () => {
		const records = [
			record({ id: "a", weight: 85, reps: 10, performedAt: "2026-09-01" }),
		];

		expect(getLiftPr(records, "benchPress").actual).toBeUndefined();
	});

	it("換算 PR は推定 1RM が最も高い記録を選ぶ", () => {
		const records = [
			// 100kg
			record({ id: "a", weight: 100, reps: 1, performedAt: "2026-08-12" }),
			// 106kg
			record({ id: "b", weight: 85, reps: 10, performedAt: "2026-09-01" }),
			// 102kg
			record({ id: "c", weight: 90, reps: 6, performedAt: "2026-09-10" }),
		];

		expect(getLiftPr(records, "benchPress").estimated?.id).toBe("b");
	});

	it("実測 PR が最も高ければ実測と換算が同じ記録になる", () => {
		const records = [
			record({ id: "a", weight: 120, reps: 1, performedAt: "2026-08-12" }),
			record({ id: "b", weight: 85, reps: 10, performedAt: "2026-09-01" }),
		];

		const pr = getLiftPr(records, "benchPress");

		expect(pr.actual?.id).toBe("a");
		expect(pr.estimated?.id).toBe("a");
	});

	it("同値なら実施日が古い記録を選ぶ", () => {
		const records = [
			record({ id: "new", weight: 100, reps: 1, performedAt: "2026-09-01" }),
			record({ id: "old", weight: 100, reps: 1, performedAt: "2026-06-15" }),
		];

		expect(getLiftPr(records, "benchPress").actual?.id).toBe("old");
	});

	it("実施日まで同じなら保存が先の記録を選ぶ", () => {
		const records = [
			record({
				id: "later",
				weight: 100,
				reps: 1,
				performedAt: "2026-09-01",
				createdAt: "2026-09-01T21:00:00.000Z",
			}),
			record({
				id: "earlier",
				weight: 100,
				reps: 1,
				performedAt: "2026-09-01",
				createdAt: "2026-09-01T09:00:00.000Z",
			}),
		];

		expect(getLiftPr(records, "benchPress").actual?.id).toBe("earlier");
	});

	it("他の種目の記録は混ざらない", () => {
		const records = [
			record({ id: "bench", weight: 100, reps: 1, performedAt: "2026-09-01" }),
			record({
				id: "squat",
				exercise: "squat",
				weight: 160,
				reps: 1,
				performedAt: "2026-09-02",
			}),
		];

		expect(getLiftPr(records, "benchPress").actual?.id).toBe("bench");
		expect(getLiftPr(records, "squat").actual?.id).toBe("squat");
	});

	it("記録が空なら PR は両方 undefined", () => {
		expect(getLiftPr([], "benchPress")).toEqual({
			actual: undefined,
			estimated: undefined,
		});
	});

	it("記録を削除すると PR が計算し直される", () => {
		const records = [
			record({ id: "a", weight: 100, reps: 1, performedAt: "2026-08-12" }),
			record({ id: "b", weight: 85, reps: 10, performedAt: "2026-09-01" }),
		];

		expect(getLiftPr(records, "benchPress").estimated?.id).toBe("b");

		const afterDelete = records.filter((target) => target.id !== "b");

		expect(getLiftPr(afterDelete, "benchPress").estimated?.id).toBe("a");
	});
});

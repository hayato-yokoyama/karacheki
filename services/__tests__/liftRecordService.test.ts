import AsyncStorage from "@react-native-async-storage/async-storage";
import {
	addLiftRecord,
	deleteLiftRecord,
	listLiftRecords,
	updateLiftRecord,
} from "@/services/liftRecordService";

jest.mock("@react-native-async-storage/async-storage", () =>
	require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

/** 実施日は端末のローカル日付で持つ。テストのタイムゾーンは jest.globalSetup.js で固定している */
const at = (date: string) => new Date(`${date}T12:00:00+09:00`);

beforeEach(async () => {
	await AsyncStorage.clear();
});

describe("addLiftRecord", () => {
	it("実施日をローカル日付の YYYY-MM-DD で保存する", async () => {
		// UTC に寄せると前日になる時刻でも、記録した日のままになる
		const record = await addLiftRecord({
			exercise: "benchPress",
			weight: 85,
			reps: 4,
			performedAt: new Date("2026-09-20T08:00:00+09:00"),
		});

		expect(record.performedAt).toBe("2026-09-20");
		expect(await listLiftRecords()).toEqual([record]);
	});

	it("重量を小数第1位に丸めて保存する", async () => {
		const record = await addLiftRecord({
			exercise: "benchPress",
			weight: 87.55,
			reps: 4,
			performedAt: at("2026-09-20"),
		});

		expect(record.weight).toBe(87.6);
	});
});

describe("listLiftRecords", () => {
	it("実施日の降順で返す", async () => {
		await addLiftRecord({
			exercise: "benchPress",
			weight: 85,
			reps: 4,
			performedAt: at("2026-09-18"),
		});
		await addLiftRecord({
			exercise: "benchPress",
			weight: 90,
			reps: 3,
			performedAt: at("2026-09-20"),
		});

		expect(
			(await listLiftRecords()).map((record) => record.performedAt),
		).toEqual(["2026-09-20", "2026-09-18"]);
	});
});

describe("updateLiftRecord", () => {
	it("重量・レップ数・実施日を書き換える", async () => {
		const record = await addLiftRecord({
			exercise: "benchPress",
			weight: 85,
			reps: 4,
			performedAt: at("2026-09-20"),
		});

		const updated = await updateLiftRecord({
			id: record.id,
			weight: 87.5,
			reps: 3,
			performedAt: at("2026-09-21"),
		});

		expect(updated).toMatchObject({
			id: record.id,
			weight: 87.5,
			reps: 3,
			performedAt: "2026-09-21",
		});
		expect(await listLiftRecords()).toEqual([updated]);
	});

	it("種目と保存日時は据え置く", async () => {
		// 種目が変わると一覧の自己ベストが黙って別の種目に移ってしまう。
		// 保存日時は自己ベストが同値で並んだときの順番に効くので、値を直しただけでは動かさない
		const record = await addLiftRecord({
			exercise: "squat",
			weight: 120,
			reps: 5,
			performedAt: at("2026-09-20"),
		});

		const updated = await updateLiftRecord({
			id: record.id,
			weight: 125,
			reps: 5,
			performedAt: at("2026-09-20"),
		});

		expect(updated.exercise).toBe("squat");
		expect(updated.createdAt).toBe(record.createdAt);
	});

	it("他の記録は書き換えない", async () => {
		const kept = await addLiftRecord({
			exercise: "benchPress",
			weight: 85,
			reps: 4,
			performedAt: at("2026-09-18"),
		});
		const target = await addLiftRecord({
			exercise: "benchPress",
			weight: 90,
			reps: 3,
			performedAt: at("2026-09-20"),
		});

		await updateLiftRecord({
			id: target.id,
			weight: 92.5,
			reps: 3,
			performedAt: at("2026-09-20"),
		});

		const records = await listLiftRecords();

		expect(records).toHaveLength(2);
		expect(records.at(-1)).toEqual(kept);
	});

	it("重量を小数第1位に丸めて保存する", async () => {
		const record = await addLiftRecord({
			exercise: "benchPress",
			weight: 85,
			reps: 4,
			performedAt: at("2026-09-20"),
		});

		const updated = await updateLiftRecord({
			id: record.id,
			weight: 87.55,
			reps: 4,
			performedAt: at("2026-09-20"),
		});

		expect(updated.weight).toBe(87.6);
	});

	it("他の種目の記録が混ざっていても対象だけ書き換える", async () => {
		const squat = await addLiftRecord({
			exercise: "squat",
			weight: 120,
			reps: 5,
			performedAt: at("2026-09-20"),
		});
		const bench = await addLiftRecord({
			exercise: "benchPress",
			weight: 85,
			reps: 4,
			performedAt: at("2026-09-20"),
		});

		await updateLiftRecord({
			id: bench.id,
			weight: 90,
			reps: 3,
			performedAt: at("2026-09-20"),
		});

		const records = await listLiftRecords();

		expect(records.find((record) => record.id === squat.id)).toEqual(squat);
		expect(records.find((record) => record.id === bench.id)).toMatchObject({
			exercise: "benchPress",
			weight: 90,
			reps: 3,
		});
	});

	it("見つからない記録は保存せずに失敗する", async () => {
		const record = await addLiftRecord({
			exercise: "benchPress",
			weight: 85,
			reps: 4,
			performedAt: at("2026-09-20"),
		});

		await expect(
			updateLiftRecord({
				id: "missing",
				weight: 100,
				reps: 1,
				performedAt: at("2026-09-21"),
			}),
		).rejects.toThrow();
		expect(await listLiftRecords()).toEqual([record]);
	});
});

describe("deleteLiftRecord", () => {
	it("指定した記録だけ消す", async () => {
		const kept = await addLiftRecord({
			exercise: "benchPress",
			weight: 85,
			reps: 4,
			performedAt: at("2026-09-18"),
		});
		const removed = await addLiftRecord({
			exercise: "benchPress",
			weight: 90,
			reps: 3,
			performedAt: at("2026-09-20"),
		});

		await deleteLiftRecord(removed.id);

		expect(await listLiftRecords()).toEqual([kept]);
	});
});

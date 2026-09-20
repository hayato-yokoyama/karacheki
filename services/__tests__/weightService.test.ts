import type { WeightSample } from "@/services/weightService";
import { transformWeightDataForGraph } from "@/services/weightService";

jest.mock("@kingstinct/react-native-healthkit", () => ({
	isHealthDataAvailable: jest.fn(),
	queryQuantitySamples: jest.fn(),
	requestAuthorization: jest.fn(),
	saveQuantitySample: jest.fn(),
}));

const at = (iso: string) => new Date(iso).getTime();

/** 移動平均の検証に使うのは日時と体重だけなので、その2つを持つ最小のサンプルを作る */
const sample = (iso: string, quantity: number) =>
	({ startDate: new Date(iso), quantity }) as WeightSample;

describe("transformWeightDataForGraph", () => {
	it("実測データを日付の昇順で返す", () => {
		const points = transformWeightDataForGraph([
			sample("2026-06-03T09:00:00+09:00", 70),
			sample("2026-06-01T09:00:00+09:00", 72),
			sample("2026-06-02T09:00:00+09:00", 71),
		]);

		expect(points.map((point) => point.actualWeight)).toEqual([72, 71, 70]);
		expect(points.map((point) => point.date)).toEqual([
			at("2026-06-01T09:00:00+09:00"),
			at("2026-06-02T09:00:00+09:00"),
			at("2026-06-03T09:00:00+09:00"),
		]);
	});

	it("同じ日に複数の測定があっても最初の1件だけを使う", () => {
		const points = transformWeightDataForGraph([
			sample("2026-06-01T09:00:00+09:00", 70),
			sample("2026-06-01T21:00:00+09:00", 71),
		]);

		expect(points).toHaveLength(1);
		expect(points[0].actualWeight).toBe(70);
	});

	it("傾向データを直近N日の平均で求める", () => {
		// 7日窓なら 6/08 の点は 6/02〜6/08 の 7 件が対象。6/01 は窓の外
		const points = transformWeightDataForGraph(
			[
				sample("2026-06-01T09:00:00+09:00", 100),
				sample("2026-06-02T09:00:00+09:00", 70),
				sample("2026-06-03T09:00:00+09:00", 70),
				sample("2026-06-04T09:00:00+09:00", 70),
				sample("2026-06-05T09:00:00+09:00", 70),
				sample("2026-06-06T09:00:00+09:00", 70),
				sample("2026-06-07T09:00:00+09:00", 70),
				sample("2026-06-08T09:00:00+09:00", 70),
			],
			7,
		);

		expect(points.at(-1)?.trendWeight).toBe(70);
	});

	it("測定が疎でも対象期間は日数で決まる", () => {
		// 週1回の測定。7日窓では 6/29 の点から遡って 6/23 までが窓なので、その1件だけが対象になる
		const points = transformWeightDataForGraph(
			[
				sample("2026-06-01T09:00:00+09:00", 76),
				sample("2026-06-08T09:00:00+09:00", 75),
				sample("2026-06-15T09:00:00+09:00", 74),
				sample("2026-06-22T09:00:00+09:00", 73),
				sample("2026-06-29T09:00:00+09:00", 72),
			],
			7,
		);

		expect(points.map((point) => point.trendWeight)).toEqual([
			76, 75, 74, 73, 72,
		]);
	});

	it("N日ぶん揃っていない期間の先頭も、揃っている測定値だけで平均する", () => {
		const points = transformWeightDataForGraph(
			[
				sample("2026-06-01T09:00:00+09:00", 70),
				sample("2026-06-02T09:00:00+09:00", 72),
			],
			7,
		);

		expect(points.map((point) => point.trendWeight)).toEqual([70, 71]);
	});

	it("窓の境界は測定時刻ではなく日付で判定する", () => {
		// 6/01 深夜と 6/08 朝は 7 日に満たない間隔だが、日付では 7 日離れているので窓から外れる
		const points = transformWeightDataForGraph(
			[
				sample("2026-06-01T23:00:00+09:00", 100),
				sample("2026-06-08T09:00:00+09:00", 70),
			],
			7,
		);

		expect(points.at(-1)?.trendWeight).toBe(70);
	});

	it("既定では直近7日で平均する", () => {
		const points = transformWeightDataForGraph([
			sample("2026-06-01T09:00:00+09:00", 100),
			sample("2026-06-02T09:00:00+09:00", 70),
			sample("2026-06-08T09:00:00+09:00", 70),
		]);

		// 6/08 の点からは 6/02 までが窓。6/01 は外れる
		expect(points.at(-1)?.trendWeight).toBe(70);
	});

	it("データが無いときは空配列を返す", () => {
		expect(transformWeightDataForGraph([])).toEqual([]);
	});
});

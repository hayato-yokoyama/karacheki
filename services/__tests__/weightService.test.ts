import type { WeightSample } from "@/services/weightService";
import {
	formatWeekRangeLabel,
	getLatestWeight,
	getWeeklyAverages,
	getWeekRange,
	summarizeWeightsForHome,
	transformWeightDataForGraph,
	WEEKLY_AVERAGE_WEEKS,
} from "@/services/weightService";

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

	it("既定では直近10日で平均する", () => {
		const points = transformWeightDataForGraph([
			sample("2026-06-01T09:00:00+09:00", 100),
			sample("2026-06-02T09:00:00+09:00", 60),
			sample("2026-06-11T09:00:00+09:00", 80),
		]);

		// 6/11 の点からは 6/02 までが窓。ちょうど10日離れた 6/01 は外れる
		expect(points.at(-1)?.trendWeight).toBe(70);
	});

	it("データが無いときは空配列を返す", () => {
		expect(transformWeightDataForGraph([])).toEqual([]);
	});
});

/** 集計の基準にする「今日」。9/21 の夕方に開いたつもりで揃える */
const NOW = new Date("2026-09-21T16:23:00+09:00");

describe("getWeekRange", () => {
	it("今日を最終日とする7日間を今週とする", () => {
		expect(formatWeekRangeLabel(getWeekRange(0, NOW))).toBe("9/15 – 9/21");
	});

	it("先週は今週の7日前までの7日間", () => {
		expect(formatWeekRangeLabel(getWeekRange(1, NOW))).toBe("9/8 – 9/14");
	});
});

describe("getWeeklyAverages", () => {
	it("週ごとの平均を古い順に返す", () => {
		const weeklyAverages = getWeeklyAverages(
			[
				sample("2026-09-16T09:00:00+09:00", 80.8),
				sample("2026-09-18T09:00:00+09:00", 81.0),
				sample("2026-09-10T09:00:00+09:00", 80.0),
			],
			NOW,
			2,
		);

		expect(weeklyAverages).toHaveLength(2);
		expect(formatWeekRangeLabel(weeklyAverages[0])).toBe("9/8 – 9/14");
		expect(weeklyAverages[0].average).toBe(80.0);
		expect(formatWeekRangeLabel(weeklyAverages[1])).toBe("9/15 – 9/21");
		expect(weeklyAverages[1].average).toBeCloseTo(80.9);
	});

	it("測定のない週も null で残す", () => {
		const weeklyAverages = getWeeklyAverages(
			[sample("2026-09-16T09:00:00+09:00", 80.8)],
			NOW,
			3,
		);

		expect(weeklyAverages.map((week) => week.average)).toEqual([
			null,
			null,
			80.8,
		]);
	});

	it("週の境目は日付で切る", () => {
		// 9/15 の 0:05 は今週、9/14 の 23:55 は先週
		const weeklyAverages = getWeeklyAverages(
			[
				sample("2026-09-14T23:55:00+09:00", 70),
				sample("2026-09-15T00:05:00+09:00", 80),
			],
			NOW,
			2,
		);

		expect(weeklyAverages.map((week) => week.average)).toEqual([70, 80]);
	});

	it("既定では8週ぶん返す", () => {
		expect(getWeeklyAverages([], NOW)).toHaveLength(WEEKLY_AVERAGE_WEEKS);
	});
});

describe("getLatestWeight", () => {
	it("最後に測った体重を返す", () => {
		expect(
			getLatestWeight([
				sample("2026-09-20T09:00:00+09:00", 80.9),
				sample("2026-09-21T09:00:00+09:00", 81.2),
				sample("2026-09-19T09:00:00+09:00", 80.5),
			]),
		).toBe(81.2);
	});

	it("1件も無ければ null を返す", () => {
		expect(getLatestWeight([])).toBeNull();
	});
});

describe("summarizeWeightsForHome", () => {
	it("今週と先週の平均から先週比を求める", () => {
		const summary = summarizeWeightsForHome(
			[
				sample("2026-09-10T09:00:00+09:00", 80.0),
				sample("2026-09-16T09:00:00+09:00", 80.5),
			],
			NOW,
		);

		expect(summary.currentWeek.average).toBe(80.5);
		expect(summary.prevWeek.average).toBe(80.0);
		expect(summary.weekOverWeekDiff).toBeCloseTo(0.5);
	});

	it("どちらかの週に測定が無ければ先週比を出さない", () => {
		const summary = summarizeWeightsForHome(
			[sample("2026-09-16T09:00:00+09:00", 80.5)],
			NOW,
		);

		expect(summary.prevWeek.average).toBeNull();
		expect(summary.weekOverWeekDiff).toBeNull();
	});

	it("3ヶ月の傾向を傾向データの両端から求める", () => {
		const summary = summarizeWeightsForHome(
			[
				// 3ヶ月より前の測定は傾向に入れない
				sample("2026-05-01T09:00:00+09:00", 60.0),
				sample("2026-06-25T09:00:00+09:00", 79.7),
				sample("2026-09-20T09:00:00+09:00", 80.9),
			],
			NOW,
		);

		expect(summary.trend?.startWeight).toBeCloseTo(79.7);
		expect(summary.trend?.endWeight).toBeCloseTo(80.9);
		expect(summary.trend?.diffWeight).toBeCloseTo(1.2);
	});

	it("3ヶ月の中に2点そろわなければ傾向を出さない", () => {
		const summary = summarizeWeightsForHome(
			[sample("2026-09-20T09:00:00+09:00", 80.9)],
			NOW,
		);

		expect(summary.trend).toBeNull();
	});

	it("スパークラインに渡す週平均を8週ぶん返す", () => {
		const summary = summarizeWeightsForHome([], NOW);

		expect(summary.weeklyAverages).toHaveLength(WEEKLY_AVERAGE_WEEKS);
	});
});

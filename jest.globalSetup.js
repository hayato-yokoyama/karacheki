// 表示窓の計算は date-fns のローカル時刻に依存するため、テストのタイムゾーンを固定する。
// ワーカーが fork される前に設定する必要があるので setupFiles ではなく globalSetup で行う
module.exports = () => {
	process.env.TZ = "Asia/Tokyo";
};

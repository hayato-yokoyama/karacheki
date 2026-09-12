# 実機ビルド・TestFlight 手順（iOS / SDK 57）

開発用ビルド（dev client）で実機検証し、TestFlight に上げるまでの手順。

- 2026-09-12: SDK 52 のまま dev client で実機検証を完了。体重の読み書き・通知・写真選択すべて動作
- 2026-09-12: SDK 57 へアップグレード（#46 手順4）。Xcode 26.6 でのビルドと Simulator 起動まで確認済み

## これで入るもの

| | |
| --- | --- |
| アプリ名 | からチェキ.dev |
| Bundle ID | `com.h-yokoyama.karacheki.dev` |
| ビルド種別 | development（dev client + internal distribution / Ad Hoc） |

App Store 版（`com.h-yokoyama.karacheki`）とは別アプリとして入るので、**普段使いのアプリは消えない**。

## 前提

- Apple Developer Program が有効であること（2026-09-12 に更新済み）
- ネイティブビルドはクラウド（EAS）で行える。ローカルに Xcode は必須ではない
- リモートプッシュは使っていない（`expo-notifications` のローカル通知のみ）ため、**APNs キーの用意は不要**
- `node_modules` が `package-lock.json` と一致していること（後述。ここがズレるとビルドが落ちる）

### なぜ SDK 57 が要るのか

2026-04-28 以降、App Store Connect へのアップロードは **Xcode 26 / iOS 26 SDK でビルドしたものに限られる**。
これを満たさないと `ITMS-90725` で弾かれる。

EAS は SDK ごとに決まった Xcode イメージでビルドするため、**満たせるのは SDK 55 以降**。
SDK 54 は Xcode 16 系なので条件を満たさない。

| Expo SDK | React Native | Xcode |
| --- | --- | --- |
| 54 | 0.81 | 16.1+ |
| 55 | 0.83 | 26.2+ |
| 56 | 0.85 | 26.4+ |
| **57** | 0.86 | **26.4+** |

次の移行を遠ざけるため 57 を選んだ。SDK 57 は **iOS 16.4 以上**が対象になる。

## ローカルの Simulator で確認する

EAS を使わず手元で完結する。Xcode 26.6 が入っていれば動く。**EAS に投げる前の切り分けはここでやる**のが速い。

```sh
npm run ios          # prebuild → CocoaPods → xcodebuild → 起動（初回 10 分ほど）
```

`ios/` は `prebuild` の生成物で gitignore 済み。設定の正は `app.json` / `app.config.ts` なので、
`ios/` を直接編集しない。おかしくなったら `rm -rf ios` して作り直す。

LAN の IP が変わっていると dev client が Metro を見つけられず
`Failed to load app from http://<古いIP>:8081` になる。Simulator なら localhost で繋ぎ直せる。

```sh
xcrun simctl openurl booted "exp+karacheki://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
```

### iOS 26 Simulator ではヘルスケアも動く

以前は「Simulator にヘルスケアが無いので体重機能は検証できない」としていたが、**これは iOS 26 Simulator では当てはまらない**。
ヘルスケアの許可ダイアログが出て、ヘルスケア App で体重を手入力すれば読み取りまで確認できる。

ただし `xcrun simctl privacy` はヘルスケアに対応していない（`Operation not permitted`）ため、
許可は Simulator 上で手でタップする必要がある。

## 手順

### 0. 依存関係をロックファイルに合わせる

```sh
npm ci
node -p "require('./node_modules/expo/package.json').version"   # → 57.x であること
npx expo-doctor                                                 # → 全チェック通過
```

EAS は**ローカルの `node_modules/expo` のバージョン**を見てビルドイメージ（Xcode）を選ぶ。
ここがズレると意図しない Xcode が選ばれてコンパイルに失敗する。

### 1. eas-cli を入れてログインする

パッケージ名は `eas` ではなく `eas-cli`（実行コマンドが `eas`）。

```sh
npm install -g eas-cli
eas login
```

### 2. 実機を登録する

Ad Hoc 配信なので、プロビジョニングプロファイルに端末の UDID が入っている必要がある。**ビルドより先**に行う。
**機種変更したら必ずやり直す**（古い端末の登録は残しておいてよい）。

```sh
npm run device:register
```

登録方法は **Website** を選ぶ。表示される URL / QR を iPhone で開き、プロファイルをインストール →
設定 > 一般 > VPN とデバイス管理 からインストールを承認する。

登録済みの端末は以下で確認できる。

```sh
eas device:list --apple-team-id 3T3P7N445K
```

### 3. ビルドする

```sh
npm run build:device
```

- Apple ID のログインを求められる（Developer Program のアカウント）
- 証明書・プロビジョニングプロファイル・App ID は EAS が自動生成する
  （Apple Developer Program の更新で失効した証明書があれば作り直される）
- HealthKit の capability（background delivery を含む）も EAS が自動で有効化する

**デバイス選択はスペースキーでチェックを付ける**。矢印で移動してそのまま Enter を押すと、
ハイライトされていた1件しか選ばれず、目的の端末が入っていないプロファイルができてしまう。

アップロード後、`SDK Version` が **57.0.0** と表示されていることを確認する。違っていたら手順0に戻る。

### 4. iPhone にインストールする

ビルド完了ページの QR を iPhone のカメラで読み取ってインストール。

> `npm run dev` が出す QR とは別物。あちらは**すでに入っているアプリを開発サーバに繋ぐ**ためのもので、
> インストールはできない。インストールできるのは EAS のビルド詳細ページだけ。

初回は 設定 > 一般 > VPN とデバイス管理 でデベロッパを信頼する。

さらに iOS 16 以降は**デベロッパモード**が必要。
設定 > プライバシーとセキュリティ > デベロッパモード をオン → 再起動 → 再起動後のダイアログでオンにする。

### 5. Metro をつなぐ

```sh
npm run dev
```

Mac と iPhone を同じネットワークに置き、**ホーム画面から `からチェキ.dev` を直接起動**して接続する。

初回起動時の「ローカルネットワーク上のデバイスの検索を求めています」は**必ず許可する**。
拒否すると開発サーバに接続できない。

`Fetch development servers` に出てこない場合は `Enter URL manually` に Mac の LAN アドレスを手入力する。

```sh
ipconfig getifaddr en0   # → 例: 192.168.11.10
```

```
http://192.168.11.10:8081
```

**JS の変更はリビルド不要**。`app.json` / config plugin / 依存パッケージを変えたときだけ 3 からやり直す。

## TestFlight に上げる

dev client での実機確認が済んでから行う。ビルドとアップロードは別のコマンド。

### 1. バージョンを上げる

`app.json` の `expo.version` だけ手で上げる。

```json
"version": "1.2.0",
```

**ビルド番号は触らない**。`eas.json` が `appVersionSource: "remote"` かつ production で `autoIncrement` なので、
EAS 側が採番する。`runtimeVersion` は `appVersion` ポリシーなので `version` に連動する。

### 2. 本番ビルドを作る

```sh
npm run build:production
```

- distribution は store（Ad Hoc ではないので端末登録は不要）
- 配布証明書とプロビジョニングプロファイルは EAS が自動生成する
- `SDK Version` が **57.0.0** であることを確認する

### 3. アップロードする

```sh
npm run submit:production
```

App Store Connect の「TestFlight」に現れ、処理が終わるとテスターに配れる。

> **`eas submit` は Apple ID ログインが必須**で、後述の不具合の影響を受ける。
> App Store Connect API キー（回避策B）では代替できない。回避策A を使うか、
> `.ipa` をダウンロードして **Transporter.app** で手動アップロードする。

暗号化の輸出申告（`ITSAppUsesNonExemptEncryption: false`）は `app.config.ts` で設定済みなので、
アップロードのたびに聞かれることはない。

## 既知の問題: Apple ID ログインが失敗する（2026-09 時点）

`eas device:create` / `eas build` で Apple ID を入力すると、こうなることがある。

```
Authentication with Apple Developer Portal failed!
iTunes service key is empty
```

アカウントやパスワードの問題ではない。eas-cli（内部の `@expo/apple-utils`）が
Apple ID ログインの前段で叩く以下のエンドポイントが、Apple 側で 404 を返すようになったため。

```sh
curl -sS 'https://appstoreconnect.apple.com/olympus/v1/app/config?hostname=itunesconnect.apple.com'
```

報告: [expo/eas-cli#4392](https://github.com/expo/eas-cli/issues/4392) / [fastlane#30199](https://github.com/fastlane/fastlane/issues/30199)
（どちらも 2026-09-11 起票。eas-cli 23.2.0 / 24.3.0 で再現し、バージョンを変えても回避できない）。

回避策は2つある。**A が手軽で、2026-09-12 の実機ビルドは A で通した。**

### 回避策A: サービスキーを環境変数で渡す（設定不要）

`@expo/apple-utils` は、壊れたエンドポイントから取得する代わりに環境変数からキーを読む経路を持っている。

```sh
export EXPO_APP_STORE_AUTH_SERVICE_KEY=e0b80c3bf78523bfe80974d320935bfa30add02e1bff88ec2166c6bd5a706c42
```

このキーは秘密情報ではなく、Apple ID ログインウィジェットの識別子（OAuth の `client_id` 相当）で、
世界中で共通の公開値。ログイン自体は従来どおり Apple ID・パスワード・2FA で行われる。
Apple がキーをローテーションしていたら、以下で現行の値が取れる。

```sh
curl -s -i https://appstoreconnect.apple.com/logout | grep -o 'widgetKey=[0-9a-f]*'
```

`export` はターミナルを開き直すたびに必要。EAS 側が対応するか Apple がエンドポイントを戻せば不要になる。

### 回避策B: App Store Connect API キーで認証する

Apple ID ログイン（非公式 Web API + Cookie）ではなく、公式の App Store Connect API（JWT）を使う。
壊れているエンドポイントを通らないため、Apple の復旧を待たずに済む。準備の手間はかかる。

1. App Store Connect > ユーザーとアクセス > 統合 > App Store Connect API > チームキー
2. キーを作成。アクセス権は **Admin**（証明書・端末・プロファイルを作るため）
3. `AuthKey_XXXXXXXXXX.p8` をダウンロード（**一度きり**）。Key ID と Issuer ID を控える

```sh
export EXPO_ASC_API_KEY_PATH="$HOME/.appstoreconnect/AuthKey_XXXXXXXXXX.p8"
export EXPO_ASC_KEY_ID="XXXXXXXXXX"
export EXPO_ASC_ISSUER_ID="（Issuer ID）"
export EXPO_APPLE_TEAM_ID="3T3P7N445K"
export EXPO_APPLE_TEAM_TYPE="INDIVIDUAL"
```

`.p8` は鍵そのものなので、リポジトリに置かないこと（`.gitignore` の `*.p8` で保護済み）。

#### この回避策で足りる範囲

eas-cli 24.3.0 のソースで確認した内容。

| | 認証モード |
| --- | --- |
| `eas device:create` | ASC 環境変数があれば API キー |
| Ad Hoc プロビジョニングプロファイルの作成・更新 | 同上 |
| 証明書・Bundle ID | 同上 |
| **Push キー / TestFlight / `eas submit`** | **Apple ID ログインが必須のまま** |

このアプリはローカル通知しか使っておらず Push キーが不要なので、実機ビルドには影響しない。
ただし**リリース（`eas submit`）の前にはこの問題の解消が必要**になる。

## トラブルシューティング

### ビルドが Pods のヘッダ not found で落ちる

```
ios/Pods/Headers/Private/RNWorklets/worklets/Tools/RNRuntimeStatus.h
  'worklets/Tools/RNRuntimeStatus.h' file not found
```

`pod install` の後に `node_modules` が変わると、Pods にコピー済みのヘッダと実体がズレる。
**ビルド中に `npm install` / `npx expo install` を走らせない**。起きたら作り直す。

```sh
rm -rf ios && npm run ios
```

同種の症状は `node_modules` が `package-lock.json` とズレているときにも出る。`npm ci` で揃える（手順0）。

### QR を読むと本番の「からチェキ」が開いてしまう

`app.json` の `scheme` が `myapp` のまま dev / 本番で共通なうえ、expo-dev-client が `exp+karacheki://` を登録するため、
App Store 版と dev 版が同じ URL スキームを持っている。どちらが開くかは iOS 任せになる。

回避策はディープリンクを使わないこと。**アプリを直接起動して `Enter URL manually` で繋ぐ**。

恒久対応するなら `app.config.ts` で dev だけスキームを分ける（ネイティブ設定なのでリビルドが必要）。

```ts
scheme: IS_DEV ? "karachekidev" : "myapp",
```

### アプリが「インターネット接続がオフラインのようです」で繋がらない

ローカルネットワーク権限が無い。設定 > プライバシーとセキュリティ > ローカルネットワーク → からチェキ.dev をオン。

切り分けは iPhone の Safari で `http://<MacのIP>:8081/status` を開く。
`packager-status:running` が返る（= ダウンロードを聞かれる）ならネットワークは正常で、原因はこの権限。

> `:8081` のトップページを開くと Metro が Web 版をバンドルしようとして
> `@lottiefiles/dotlottie-react` が無いというエラーを出すが、これは Web 専用の経路なので iOS には影響しない。

### 通知が登録されない

`services/notificationService.ts` は権限が無いと早期 return するため、スケジュール自体が登録されない。
一度拒否すると `requestPermissionsAsync()` はダイアログを出さなくなるので、
設定 > 通知 > からチェキ.dev から許可し、アプリを再起動する。

Metro のログに `通知の権限がありません` も `体重データの取得に失敗しました` も出なければ、
権限・HealthKit 取得・通知登録がすべて通っている。

## 実機で確認したいこと

Simulator でも大半は見られるようになったが、実機でしか確かめられない・実機で見たほうが確実な箇所。

- **体重の取得・保存**（HealthKit）— ホーム画面の週平均、グラフ画面、手動記録
  - 初回起動時にヘルスケアの読み取り／書き込み許可ダイアログが出る
  - 実機には実データの蓄積があるので、移動平均やグラフの見え方は実機で確認する
- **通知** — 毎朝8時のローカル通知と、その本文（週平均と変化幅）
- **カメラ撮影** — 未実装。`cameraPermission: false` のままなので、着手時に `app.json` の変更とリビルドが要る

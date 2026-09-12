# 実機ビルド手順（iOS / SDK 52 のまま）

Simulator では検証できなかった箇所を実機で確認するための、開発用ビルド（dev client）の手順。
SDK アップグレード（#46 手順4）の前に、**まず今のコードが実機で動くこと**を確かめるためのもの。

## これで入るもの

| | |
| --- | --- |
| アプリ名 | からチェキ.dev |
| Bundle ID | `com.h-yokoyama.karacheki.dev` |
| ビルド種別 | development（dev client + internal distribution / Ad Hoc） |

App Store 版（`com.h-yokoyama.karacheki`）とは別アプリとして入るので、**普段使いのアプリは消えない**。

## 前提

- Apple Developer Program が有効であること
- ネイティブビルドはクラウド（EAS）で行う。ローカルに Xcode は不要
- リモートプッシュは使っていない（`expo-notifications` のローカル通知のみ）ため、**APNs キーの用意は不要**

## 手順

### 1. eas-cli を入れてログインする

パッケージ名は `eas` ではなく `eas-cli`（実行コマンドが `eas`）。

```sh
npm install -g eas-cli
eas login
```

### 2. 実機を登録する

Ad Hoc 配信なので、プロビジョニングプロファイルに端末の UDID が入っている必要がある。**ビルドより先**に行う。

```sh
npm run device:register
```

表示される URL / QR を iPhone で開き、プロファイルをインストール →
設定 > 一般 > VPN とデバイス管理 からインストールを承認する。

### 3. ビルドする

```sh
npm run build:device
```

- Apple ID のログインを求められる
- 証明書・プロビジョニングプロファイル・App ID は EAS が自動生成する
  （Apple Developer Program の更新で失効した証明書があれば作り直される）
- HealthKit の capability（background delivery を含む）も EAS が自動で有効化する

### 4. iPhone にインストールする

ビルド完了ページの QR を iPhone のカメラで読み取ってインストール。
初回は 設定 > 一般 > VPN とデバイス管理 でデベロッパを信頼する。

### 5. Metro をつなぐ

```sh
npm run dev
```

Mac と iPhone を同じネットワークに置き、アプリ（からチェキ.dev）を起動して接続する。

**JS の変更はリビルド不要**。`app.json` / config plugin / 依存パッケージを変えたときだけ 3 からやり直す。

## 実機で初めて確認できること

Simulator では検証できず、積み残していた箇所。

- **体重の取得・保存**（HealthKit）— ホーム画面の週平均、グラフ画面、手動記録
  - 初回起動時にヘルスケアの読み取り／書き込み許可ダイアログが出る
- **通知** — 毎朝8時のローカル通知と、その本文（週平均と変化幅）
- **カメラ撮影** — 未実装。実機が使えるようになってから着手する（`cameraPermission: false` のままなので、着手時に `app.json` の変更とリビルドが要る）

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

報告: https://github.com/expo/eas-cli/issues/4392 （2026-09-11 起票、eas-cli 23.2.0 / 24.3.0 で再現）。
eas-cli のバージョンを変えても回避できない。

### 回避策: App Store Connect API キーで認証する

Apple ID ログイン（非公式 Web API + Cookie）ではなく、公式の App Store Connect API（JWT）を使う。
壊れているエンドポイントを通らない。

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

### この回避策で足りる範囲

eas-cli 24.3.0 のソースで確認した内容。

| | 認証モード |
| --- | --- |
| `eas device:create` | ASC 環境変数があれば API キー |
| Ad Hoc プロビジョニングプロファイルの作成・更新 | 同上 |
| 証明書・Bundle ID | 同上 |
| **Push キー / TestFlight / `eas submit`** | **Apple ID ログインが必須のまま** |

このアプリはローカル通知しか使っておらず Push キーが不要なので、実機ビルドには影響しない。
ただし**リリース（`eas submit`）の前にはこの問題の解消が必要**になる。

# クイックスタート — opencanon/canon

ゼロから最初のエピソード公開まで。所要時間の目安：10〜15分。

---

## 前提条件

- Node.js 18+ (`node --version`)
- Git (`git --version`)
- GitHubアカウント (https://github.com/signup)

---

## 1. CLIのインストール

```bash
npm install -g @opencanon/canon
canon --version   # 0.4.0 と表示されることを確認
```

---

## 2. 小説を作成する

### 方法A — Webセットアップ（推奨）

1. https://opencanon.co にアクセス
2. **ログイン** → GitHub OAuth で認証
3. **소설 만들기 / Create Novel** をクリック
4. 4つの質問に回答：小説タイトル、主人公の名前、ジャンル、あらすじ一文
5. opencanon.co が GitHub リポジトリを作成し、自動登録
6. 新しいリポジトリをクローン：
   ```bash
   git clone https://github.com/{ユーザー名}/{リポジトリ名}
   cd {リポジトリ名}
   ```

### 方法B — CLIセットアップ

```bash
# まず https://github.com/new でパブリックリポジトリを作成
git clone https://github.com/{ユーザー名}/{リポジトリ名}
cd {リポジトリ名}

canon setup
# 対話式ウィザード：
#   1. 小説のタイトル
#   2. 主人公の名前
#   3. ジャンル（SF、ファンタジー、現代、ロマンスなど）
#   4. あらすじ・世界観の背景（自由記述）
#   5. この小説に込めるキーワード（傷、喜び、つながりなど）

git add -A
git commit -m "canon: setup"
git push origin main
```

CLIセットアップ後、https://opencanon.co → ログイン → **내 소설 / My Canon** でリポジトリ登録の案内が表示されます。

---

## 3. CLIトークンの取得

1. https://opencanon.co/settings にアクセス
2. **CLIトークン** セクションで **生成** をクリック
3. `oct_...` 形式のトークンをコピー

```bash
canon login
# ホストを入力 [https://opencanon.co]: (Enterを押す)
# トークンを入力: oct_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
# ✓ {ユーザー名} として認証完了
```

トークンは `~/.canon/config.json` にパーミッション `0600` で保存されます。

---

## 4. 最初のエピソードを書く

```bash
canon write ep01-genesis
```

出力例：
```
[canon write] ep01-genesis
컨텍스트를 수집하고 있습니다...

  ✓ 자체 참조: ep01-seed (#a3f9c2b1e4d7)
  ○ 수첩: 비어있거나 토큰 없음
  ✓ 교차 참조: 0xjunkim/the-seed (#7e2c1a)

スキャフォールドを保存しました: stories/ep01-genesis/scaffold.md
コンテキストプロンプトが準備完了 — AIに貼り付けて執筆を開始してください。
```

**生成されたコンテキストプロンプトを Claude、ChatGPT などお好みのAIに貼り付けてください。** AIがあなたのキャノン構造に沿ってエピソードを執筆します。

または、Webフォームを使用：https://opencanon.co/write/{ユーザー名}/{リポジトリ} → **AIで執筆する** をクリックすると同じプロンプトが提供されます。

---

## 5. エピソードを提出する

執筆後、Webフォームで提出：

1. https://opencanon.co/write/{ユーザー名}/{リポジトリ} にアクセス
2. ストーリー名、エピソード名、タイトル（日本語+英語）、あらすじ、タイムライン、登場人物、場所、本文を入力
3. **검증 / Check** をクリック → **제출 / Submit** をクリック

または直接コミット（ローカルで執筆した場合）：

```bash
canon check
# ✓ metadata_schema_valid
# ✓ characters_valid
# ...
# 7/7 チェック通過

git add -A
git commit -m "story: ep01-genesis — 最初のエピソード"
git push
```

---

## 6. 公開する

```bash
canon publish ep01-genesis
# ✓ 公開済み → https://opencanon.co/story/{ユーザー名}/{リポジトリ}
```

エピソードが公開されます。ストーリーページでコンプライアンスバッジを確認：`canon · live · passed`。

---

## 次のステップ

- キャラクターを追加：`canon new character {id}`
- 場所を追加：`canon new location {id}`
- 次のエピソードを執筆：`canon write ep02-{タイトル}`
- セッション間のメモ：https://opencanon.co/notebook（`canon write` のコンテキストに自動反映）
- 全小説を見る：https://opencanon.co/browse

---

## よくあるエラー

| 症状 | 解決策 |
|---|---|
| `canon: command not found` | Node.js PATHの問題 — `sudo npm install -g @opencanon/canon` で再インストール |
| ログイン時 `INVALID_TOKEN` | トークンの期限切れまたは入力ミス — /settings で新しいトークンを生成 |
| 公開時 `NOT_REGISTERED` | opencanon.co でリポジトリを先に登録する（ステップ2参照） |
| `canon check` が終了コード1（✗表示） | `metadata.json` の該当フィールドを修正 — 最多原因：`locations[]` ファイルなし、`timeline` フォーマット違反 |
| 提出時 `CONFLICT` | このIDのエピソードが既に存在 — 別のIDを使用 |

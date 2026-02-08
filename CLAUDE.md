# 代理店管理 - レベニューシェア管理システム

## プロジェクト概要
SaaS事業における代理店管理・売上レベニューシェア管理サービス。
運営者（SaaS事業者）と代理店の双方がログインし、売上に対するパーセンテージ配分を正確・透明に確認できる管理基盤。

## 技術スタック
- **フレームワーク**: Next.js 16 (App Router) + TypeScript
- **ORM**: Prisma 7 with PostgreSQL
- **認証**: NextAuth.js v5 (Auth.js)
- **UI**: Tailwind CSS 4 + shadcn/ui手動コンポーネント
- **計算**: Decimal.js (金額計算の精度保証)
- **CSV処理**: PapaParse
- **バリデーション**: Zod

## プロジェクト構造
```
src/
  app/
    (auth)/login/          # ログインページ
    (operator)/            # 運営者ルートグループ
      dashboard/           # 運営者ダッシュボード
      agencies/            # 代理店管理
      commission-rules/    # 還元率設定
      sales/               # 売上管理・CSV取込
      calculations/        # 報酬計算
      payouts/             # 支払管理
      audit-log/           # 監査ログ
      settings/            # 設定
    (agency)/              # 代理店ルートグループ
      dashboard/           # 代理店ダッシュボード
      sales/               # 売上明細
      payouts/             # 引き出し履歴・申請
      profile/             # プロフィール
    api/
      auth/                # NextAuth
      webhooks/sales/      # Webhookエンドポイント
      export/              # CSV出力
      data/                # 内部データAPI
  components/
    ui/                    # UI基本コンポーネント
    layout/                # レイアウト（Sidebar, Header）
  lib/
    auth.ts                # NextAuth設定
    prisma.ts              # Prismaクライアント
    services/              # ビジネスロジック
    validations/           # Zodスキーマ
    utils/                 # ユーティリティ
    types/                 # TypeScript型定義
prisma/
  schema.prisma            # データモデル定義
  seed.ts                  # 開発用シードデータ
```

## 開発コマンド
```bash
npm run dev              # 開発サーバー起動
npm run build            # プロダクションビルド
npx prisma generate      # Prismaクライアント生成
npx prisma migrate dev   # マイグレーション実行
npx prisma db seed       # シードデータ投入
```

## ログイン情報（開発用）
- 運営者: admin@example.com / operator123
- 代理店1: tanaka@agency1.example.com / agency123
- 代理店2: suzuki@agency2.example.com / agency123

## 重要なビジネスルール
1. **報酬計算**: 税抜売上金額 × 還元率（%） = 代理店報酬
2. **閾値判定**: 確定残高（累計）が閾値以上で引き出し申請可能
3. **保留期間**: 売上計上後、設定日数経過で自動確定
4. **繰越**: 閾値未達の場合は残高が自動繰越
5. **還元率履歴**: 変更時は旧ルールの終了日を設定し、新ルールを作成
6. **金額計算**: Decimal.jsを使用し、切り捨て（ROUND_DOWN）で計算

## Prisma 7 注意事項
- `datasource`の`url`は`prisma.config.ts`で設定（schema.prismaには書かない）
- `provider`は`prisma-client`（`prisma-client-js`ではない）
- 出力先は`../src/generated/prisma`

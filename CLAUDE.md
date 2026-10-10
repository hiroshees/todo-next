# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` / `npm start` — production build / serve
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)

There is no test framework configured.

## Next.js version caveat

This is Next.js 16.4 / React 19.3 with breaking changes from older versions (see `AGENTS.md`). Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (`01-app` is the App Router). `next dev` re-adds the `AGENTS.md` block automatically.

## Architecture

A single-page, client-only TODO app (UI text is in Japanese; `<html lang="ja">`).

- `app/page.tsx` renders `components/TodoApp.tsx`, which holds essentially all the app logic. `app/layout.tsx` only sets fonts (Geist), metadata and the root `<html>/<body>` (typed with the global `LayoutProps<"/">` helper).
- **State lives in `localStorage` (key `todos`), exposed via `useSyncExternalStore`** with a module-level store in `TodoApp.tsx`: `getSnapshot` caches the parsed result keyed on the raw string (to keep snapshot identity stable), `save()` writes and notifies a module-level `listeners` set, and `subscribe` also listens to the `storage` event for cross-tab sync. The server snapshot is a constant empty array, so SSR renders an empty list and hydrates with stored data (hence `suppressHydrationWarning` in the layout). Mutations must go through `save()` so subscribers are notified.
- `next.config.ts` enables `cacheComponents` and `partialPrefetching`, and routes `*.css` through the `@tailwindcss/turbopack` loader. Styling is Tailwind CSS v4 (`@import "tailwindcss"` in `app/globals.css`, no tailwind config file), with dark mode via `prefers-color-scheme`.
- Path alias `@/*` maps to the repo root.

# テストコード作成時の厳守事項

## 絶対に守ってください！

### テストコードの品質
- テストは必ず実際の機能を検証すること
- `expect(true).toBe(true)` のような意味のないアサーションは絶対に書かない
- 各テストケースは具体的な入力と期待される出力を検証すること
- モックは必要最小限に留め、実際の動作に近い形でテストすること

### ハードコーディングの禁止
- テストを通すためだけのハードコードは絶対に禁止
- 本番コードに `if (testMode)` のような条件分岐を入れない
- テスト用の特別な値（マジックナンバー）を本番コードに埋め込まない
- 環境変数や設定ファイルを使用して、テスト環境と本番環境を適切に分離すること

### テスト実装の原則
- テストが失敗する状態から始めること（Red-Green-Refactor）
- 境界値、異常系、エラーケースも必ずテストすること
- カバレッジだけでなく、実際の品質を重視すること
- テストケース名は何をテストしているか明確に記述すること

### 実装前の確認
- 機能の仕様を正しく理解してからテストを書くこと
- 不明な点があれば、仮の実装ではなく、ユーザーに確認すること

# テストカバレッジ改善プロジェクト

## 概要

このドキュメントは、MIDI音楽エディタアプリケーションのユニットテスト作成プロジェクトの進捗を記録するものです。

**実施期間**: 2025年12月21日開始
**テストフレームワーク**: Bun test + @testing-library/react
**テスト言語**: TypeScript

## テストコーディングスタイル

`doc/CODING_STYLE.md` を参照

## テスト作成完了分

### ドメインモデル（5ファイル、71テスト）

| ファイル | テスト数 | 主要テスト対象 | 状態 |
|---------|---------|--------------|------|
| `src/models/Note.test.ts` | 5 | Note.create() の正規化、エッジケース | ✅ 完了 |
| `src/models/Channel.test.ts` | 27 | ノート管理、ラベル・楽器の設定、イミュータビリティ | ✅ 完了 |
| `src/models/Song.test.ts` | 25 | チャンネル管理、ノート操作、パッチ適用、シリアライゼーション | ✅ 完了 |
| `src/models/InstrumentKey.test.ts` | 6 | 楽器キー作成、URL解決、シリアライゼーション | ✅ 完了 |
| `src/models/ControlChangeList.test.ts` | 7 | CC リスト操作（put/remove）、ソート順序維持 | ✅ 完了（既存） |
| `src/lib.test.ts` | 32 | 型ガード、アサーション、minmax、quantize、formatDuration、Set操作 | ✅ 完了 |
| `src/Color.test.ts` | 36 | RGBA値管理、CSS文字列生成、RGB⇔HSL変換、16進カラー解析、アルファ・明度変更 | ✅ 完了 |
| `src/EventEmitter.test.ts` | 21 | on/off/emit、リスナー登録・削除・実行、チェーン、エッジケース | ✅ 完了 |
| `src/PromiseState.test.ts` | 18 | pending/fulfilled/rejected 状態判定、状態遷移の排他性 | ✅ 完了 |
| `src/Dependency/DIContainer.test.ts` | 20 | ComponentKey生成、singleton、set/get、依存グラフ、複数コンテナ独立性 | ✅ 完了 |
| `src/Stateful/Stateful.test.ts` | 7 | 状態初期化、setState/updateState、リスナー通知、購読削除 | ✅ 完了 |
| `src/Stateful/useStateful.test.tsx` | 5 | Hook値返却、更新時再レンダリング、値未変更時の最適化、セレクタ動作 | ✅ 完了 |
| `src/react/ListBox/ListBox.test.tsx` | 2 | レンダリング、キーボード操作 | ✅ 完了（既存） |
| `src/react/Select/Select.test.tsx` | 6 | レンダリング、combobox ロール、フォーカス、カスタム renderValue | ✅ 完了 |

---

## テスト対象外のコンポーネント

### DIコンテナで管理される複雑なサービスクラス

以下のコンポーネントは、多数の依存関係を持つため、現在テスト対象外。テスト可能な設計への改善検討は今後の課題：

- `src/Player/Player.ts` - 音声合成、MIDI操作の複雑な依存
- `src/Editor/Editor.ts` - UI状態管理の複雑な依存
- `src/SongStore.ts` - 全体状態管理
- `src/SoundFontStore.ts` - SoundFont管理
- `src/EditHistory/EditHistoryManager.ts` - Undo/Redo管理
- `src/KeyboardHandler.ts` - キーボードイベント処理
- `src/ContextMenu/ContextMenuManager.tsx` - コンテキストメニュー管理
- `src/StatusBar/StatusBar.tsx` - ステータスバー表示
- `src/GoogleDriveAPI/GoogleAPIClient.ts` - 外部API統合
- `src/react/OverlayPortal.ts` - ポータルレンダリング
- `src/Editor/PianoRoll/PianoRoll.ts` - Canvas描画

**理由**: これらはDIコンテナで複数の依存を受け取るため、多数のモック設定が必要になり、カバレッジ向上よりもテストメンテナンスコストが増加する。テスト駆動設計への改善が必要。

---

## 作業開始時のチェックポイント

次回作業開始時には以下を確認してください：

- [ ] 新しく追加されたファイルの確認
- [ ] 既存のテストの実行状況確認（`bun test`）
- [ ] CODING_STYLE.md のテストパターンの確認
- [ ] DIコンテナ以外の新規クラスについてテスト対象判定

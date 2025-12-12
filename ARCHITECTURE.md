# Architecture

シンプルなMVC設計

- Model
    - イミュータブルなデータクラス
- Controller
    - `Stateful` クラスが状態管理及びイベントベースの状態更新通知メカニズムを提供
    - Controller間は直接依存関係を持たない
    - Controller間で一方向の依存関係がある状態更新はイベントを介して行う
    - Controller間で双方向の依存関係がある連鎖的な状態更新はUseCaseを介して行う
    
- View
    - React
    - `useStateful()` フックが `Stateful` クラスと連携し、モデルの変更を検知
    
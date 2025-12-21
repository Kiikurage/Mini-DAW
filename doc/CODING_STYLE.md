# コーディングスタイル

## コレクション

- Set, Mapはunorderedなものとして扱う
- Array, Setに対する操作
    - APIは複数要素対象を前提とする
    - 単体の要素を対象とする場合は、配列にラップして渡す
    - `replaceXXX(value: Iterable<T>)`
        - 置換
        - 対応する要素が存在しない場合、その要素については追加は行われない。
    - `updateXXX(ids: Iterable<ID>, updater: (oldValue:T) => newValue:T)`
        - 置換
        - 現在の値を元に新しい値を生成する場合に使用
        - `ids`で指定された要素が存在しない場合、その要素については何も行われない
    - `putXXX(value: Iterable<T>)`
        - 置換または追加
    - `setAllXXX(values: Iterable<T>)`
        - 全置換
    - `removeXXX(values: Iterable<T>)`
        - 削除
        - 要素が実際に所有者から削除される場合のみに使用
        - 概念的に、`this`が`XXX`の所有者ではなく参照しているだけの場合には使用しない
            - 例: [NG] `Editor#removeSelectedNotes(noteIds)`
                - Noteは選択状態から解除されるだけでNote自体が削除されるわけではない
                - この場合はコンテキストを意識した命名を使用する
            - 例: [OK] `Channel#removeNotes(noteIds)`
                - `Channel`は`Note`の所有者であり、`Note`が`Channel`から削除される
            - 例: [OK] `SelectedNoteCollection#remove(noteIds)`
                - `XXX`が空文字列の場合、これは`this`の主要な関心対象を削除することを意味する
                - この場合`this`が`XXX`の所有者であることが期待される
      - `clearXXX()`
        - 全削除
- 禁止
  - `setXXX(values: Iterable<T>)`
        - 全置換か一部置換かが不明瞭なため

## データモデル

以下のテンプレートに従うこと

```ts
class MyData {
    // フィールドは全てイミュータブル・readonlyにする
    private readonly p1: T1;
    private readonly p2: ReadonlyMap<K2, T2>;

    // コンストラクタは全てのフィールドを単一のオブジェクトで受け取る
    constructor(props: {
        p1: T1; 
        p2: T2;
    } = {
        p1: defaultP1,
        p2: defaultP2,
    }) {
        this.p1 = props.p1;
        this.p2 = props.p2;
    }
    
    // この設計により、以下の方法でコピーが可能
    // const newData = new MyData({ ...oldData, p1: newP1  } );
}
```

## テスト

- テンプレート

    ```typescript
    import { describe, expect, it, mock } from "bun:test";
    
    describe("TargetClass", () => {
      describe("feature or method name", () => {
        it("should have expected behavior", () => {
          // Arrange: テストに必要なデータやモックの準備
          const value = createTestValue();
    
          // Act: テスト対象のメソッドを実行
          const result = targetClass.method(value);
    
          // Assert: 結果を検証
          expect(result).toBe(expectedValue);
        });
      });
    });
    ```

- データクラスのテスト

    ```typescript
    import { describe, expect, it, mock } from "bun:test";

    const defaultItem = new Item({ ... });   // デフォルトのインスタンスを定義
      
    it("should throw error if p1 is 0", () => {
        // テストしたい項目のみを上書きしてインスタンス化
        expect(() => new Item({ ...defaultItem, p1: 0 })).toThrow();
    });
    ```
    
- イミュータブル性のテスト
    
    ```typescript
    const instance1 = Item.create(10);
    const instance2 = Item.setValue(20);
    
    expect(instance1).not.toBe(instance2);  // 異なるインスタンス
    expect(instance1.value).toBe(10);  // 元は変わらない
    expect(instance2.value).toBe(20);  // 新しい値が反映
    ```

- コールバック呼び出しなど

    ```typescript
    import { mock } from "bun:test";
    const callback = mock(() => {});
    
    // 呼び出し検証
    expect(callback).toBeCalled();  // 呼ばれたか
    expect(callback).toBeCalledTimes(2);  // 呼び出し回数
    expect(callback).toBeCalledWith(arg);  // 正しい引数か
    expect(callback).not.toBeCalled();  // 呼ばれなかったか
    ```

- Reactコンポーネントのテスト

    ```tsx
    import { render, screen } from "@testing-library/react";
    
    render(<Component prop={value} />);
    
    expect(screen.getByText("expected text")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeInTheDocument();
    ```

- React Hookのテスト

    ```typescript
    import { act, renderHook } from "@testing-library/react";
    
    const stateful = new Stateful(42);
    
    const onRender = mock(() => {});
    const { result } = renderHook(() => {
      onRender();
      return useStateful(stateful);
    });
    act(() => {
        stateful.updateState(() => 100);
    });
    expect(onRender).toBeCalledTimes(2);            // 2回レンダリングされたことを確認
    ```

- ユーザー操作のテスト

    ```tsx
    import userEvent from "@testing-library/user-event";
    
    const user = userEvent.setup();
    const button = screen.getByRole("button");
    
    await user.click(button);
    await user.keyboard("{ArrowDown}");
    await user.type(inputElement, "text");
    
    expect(screen.getByText("result")).toBeInTheDocument();
    ```

- UIの状態のテスト

    ```tsx
    // ブラウザネイティブのフォーカス検証
    expect(listbox).toHaveFocus();
  
    // アプリケーションによる独自フォーカスはaria-activedescendantを使用
  	expect(listbox).toHaveAttribute("aria-activedescendant", option1.id);

    // 選択中の要素にはaria-selectedを仕様
  	expect(option1).toHaveAttribute("aria-selected", "true");
    ```
import { GlobalRegistrator } from "@happy-dom/global-registrator";

/**
 * testing-libraryの初期化より前に呼び出さないとtesting-library/reactの`screen`が
 * happy-domのdocument.bodyを参照できずにエラーになる。
 *
 * `import "@testing-library/jest-dom"` だけでtesting-libraryの初期化が始まってしまう。
 * 確実にこれより前にregisterが呼び出されるようにするために初期化スクリプトを2つに分けている。
 */
GlobalRegistrator.register();

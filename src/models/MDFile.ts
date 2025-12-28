import type { FileLocation } from "./FileLocation.ts";
import type { Song } from "./Song.ts";

/**
 * Mini-DAWで扱うファイルを表すインターフェース
 */
export interface MDFile {
	/**
	 * 楽曲データ
	 */
	song: Song;

	/**
	 * ファイルのメタデータ
	 * 新規作成されたファイルやアップロードされたファイルなど
	 * オンライン上に保存されていない場合は`null`となる
	 */
	metadata: {
		name: string;
		/**
		 * 楽曲が保存されている場所
		 */
		location: FileLocation;
	} | null;
}

import { ComponentKey } from "./Dependency/DIContainer.ts";

export const SynthesizerKey = ComponentKey<Synthesizer>("Synthesizer");

export interface Synthesizer {
	/**
	 * 音を鳴らす
	 */
	noteOn(message: NoteOnMessage): void;

	/**
	 * 指定したチャンネルで発音中の音をリリースする。
	 * 同じキーで複数音が発音中の場合、最も古い音をリリースする。
	 */
	noteOff(message: NoteOffMessage): void;

	/**
	 * 音色を変更する
	 */
	setPreset(message: ProgramChangeMessage): void;

	/**
	 * 音色バンクを変更する
	 */
	setBank(message: { channel: number; bankNumber: number }): void;

	/**
	 * 全てのチャンネルの全ての発音中の音をリリースする。
	 */
	noteOffAll(): void;

	/**
	 * 指定したチャンネルの状態を初期化する。再生中の音はリリースなく直ちに停止する。
	 */
	reset(channel: number): void;

	/**
	 * 全てのチャンネルの状態を初期化する。再生中の音はリリースなく直ちに停止する。
	 **/
	resetAll(): void;
}

export interface NoteOnMessage {
	channel: number;
	key: number;
	velocity: number;
	time?: number;
}

export interface NoteOffMessage {
	channel: number;
	key: number;
	time?: number;
}

export interface ProgramChangeMessage {
	channel: number;
	programNumber: number;
}

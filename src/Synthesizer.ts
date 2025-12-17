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

	/*
	 * 指定したチャンネルの発音中の音を全てリリースする。
	 */
	channelNoteOffAll(channel: number): void;

	/**
	 * 全てのチャンネルの全ての発音中の音をリリースする。
	 */
	noteOffAll(): void;

	/**
	 * 全てのチャンネルの発音中の音をリリースなく直ちに停止する。
	 */
	stopImmediatelyAll(): void;

	/**
	 * 指定したチャンネルの状態を初期化する。再生中の音はリリースなく直ちに停止する。
	 */
	reset(channel: number): void;

	/**
	 * 全てのチャンネルの状態を初期化する。再生中の音はリリースなく直ちに停止する。
	 **/
	resetAll(): void;

	/**
	 * ピッチベンドを設定する
	 * @param channel チャンネル番号
	 * @param cents セント単位のピッチベンド量。正の値で音が高く、負の値で音が低くなる。
	 * @param time ピッチベンドを適用するAudioContext時刻 [sec]。省略した場合は即座に適用される。
	 */
	setPitchBend(channel: number, cents: number, time?: number): void;
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

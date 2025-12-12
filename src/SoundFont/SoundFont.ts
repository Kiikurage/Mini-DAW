import { NUM_KEYS } from "../constants.ts";
import { assertNotNullish, minmax } from "../lib.ts";
import { Envelope } from "./Envelope.ts";
import { getAsciiString, RIFF } from "./RIFF.ts";

export class SoundFont {
	private readonly presets: ReadonlyMap<
		/* PresetNumber */ number,
		ReadonlyMap</* BankNumber */ number, Preset>
	>;

	constructor(props: {
		presets: ReadonlyMap<number, ReadonlyMap<number, Preset>>;
	}) {
		this.presets = props.presets;
	}

	/**
	 * 各プリセット番号について、プリセットの名前を取得する。
	 * 複数バンクに同じプリセット番号が存在する場合、最初に見つかったものを返す。
	 */
	getPresetNames(): {
		number: number;
		name: string;
		bankMap: ReadonlyMap<number, Preset>;
	}[] {
		const result: {
			number: number;
			name: string;
			bankMap: ReadonlyMap<number, Preset>;
		}[] = [];

		for (const [presetNumber, bankMap] of this.presets) {
			const firstPreset = [...bankMap.values()].sort(
				(a, b) => a.bankNumber - b.bankNumber,
			)[0];
			if (firstPreset === undefined) continue;

			result.push({
				number: presetNumber,
				name: firstPreset.name,
				bankMap,
			});
		}

		result.sort((a, b) => a.number - b.number);

		return result;
	}

	/**
	 * 指定されたプリセット番号に対応するすべてのバンクのプリセットを取得する。
	 * @param presetNumber
	 */
	getPresetsByPresetNumber(presetNumber: number): Preset[] {
		return (this.presets.get(presetNumber)?.values()?.toArray() ?? []).sort(
			(a, b) => a.bankNumber - b.bankNumber,
		);
	}

	/**
	 * 指定されたプリセット番号とバンク番号に対応するプリセットを取得する。
	 */
	getPreset(presetNumber: number, bankNumber: number): Preset | null {
		return this.presets.get(presetNumber)?.get(bankNumber) ?? null;
	}

	static async parse(buffer: ArrayBuffer) {
		const chunk = RIFF.parse(buffer);

		const sdta = parseSDTA(chunk.chunks[1] as RIFF.ListChunk);
		const pdta = parsePDTA(chunk.chunks[2] as RIFF.ListChunk);

		const samples: Sample[] = [];
		for (const [i, shdr] of pdta.shdr.entries()) {
			if (i === pdta.shdr.length - 1) continue;
			samples.push(Sample.create(sdta.sample, shdr));
		}

		const instrumentZones: InstrumentZone[] = [];
		for (let i = 0; i < pdta.ibag.length - 1; i++) {
			instrumentZones.push(InstrumentZone.create(pdta, i, samples));
		}

		const instruments: Instrument[] = [];
		for (const [i, inst] of pdta.inst.entries()) {
			// Terminator entry
			if (i === pdta.inst.length - 1) continue;

			instruments.push(Instrument.create(pdta, inst, i, instrumentZones));
		}

		const presetZones: PresetZone[] = [];
		for (let i = 0; i < pdta.pbag.length - 1; i++) {
			presetZones.push(PresetZone.create(pdta, i, instruments));
		}

		const presets: Preset[] = [];
		for (let i = 0; i < pdta.phdr.length - 1; i++) {
			presets.push(Preset.create(pdta, i, presetZones));
		}

		const presetsMap = new Map<number, Map<number, Preset>>();
		for (const preset of presets) {
			let ps = presetsMap.get(preset.presetNumber);
			if (!ps) {
				ps = new Map<number, Preset>();
				presetsMap.set(preset.presetNumber, ps);
			}
			ps.set(preset.bankNumber, preset);
		}
		return new SoundFont({
			presets: presetsMap,
		});
	}

	static async load(url: string) {
		const res = await fetch(url);
		const buffer = await res.arrayBuffer();

		return SoundFont.parse(buffer);
	}
}

export interface SDTA {
	sample: Int16Array<ArrayBuffer>;
}

export function parseSDTA(chunk: RIFF.ListChunk): SDTA {
	let sample: Int16Array<ArrayBuffer> | null = null;

	for (const child of chunk.chunks) {
		switch (child.fourCC) {
			case "smpl": {
				const payload = (child as RIFF.PayloadChunk).payload;
				sample = new Int16Array(
					payload.buffer,
					payload.byteOffset,
					payload.byteLength / 2,
				);
				break;
			}
			case "sm24":
				// ignore;
				break;
		}
	}

	assertNotNullish(sample);

	return { sample };
}

export interface PDTA {
	readonly phdr: PHDR[];
	readonly pbag: PBAG[];
	readonly pmod: PMOD[];
	readonly pgen: PGEN[];
	readonly inst: INST[];
	readonly ibag: IBAG[];
	readonly imod: IMOD[];
	readonly igen: IGEN[];
	readonly shdr: SHDR[];
}

export function parsePDTA(chunk: RIFF.ListChunk): PDTA {
	let phdr: PHDR[] | null = null;
	let pbag: PBAG[] | null = null;
	let pmod: PMOD[] | null = null;
	let pgen: PGEN[] | null = null;
	let inst: INST[] | null = null;
	let ibag: IBAG[] | null = null;
	let imod: IMOD[] | null = null;
	let igen: IGEN[] | null = null;
	let shdr: SHDR[] | null = null;

	for (const child of chunk.chunks) {
		switch (child.fourCC) {
			case "phdr":
				phdr = parsePHDR(child as RIFF.PayloadChunk);
				break;
			case "pbag":
				pbag = parsePBAG(child as RIFF.PayloadChunk);
				break;
			case "pmod":
				pmod = parsePMOD(child as RIFF.PayloadChunk);
				break;
			case "pgen":
				pgen = parsePGEN(child as RIFF.PayloadChunk);
				break;
			case "inst":
				inst = parseINST(child as RIFF.PayloadChunk);
				break;
			case "ibag":
				ibag = parseIBAG(child as RIFF.PayloadChunk);
				break;
			case "imod":
				imod = parseIMOD(child as RIFF.PayloadChunk);
				break;
			case "igen":
				igen = parseIGEN(child as RIFF.PayloadChunk);
				break;
			case "shdr":
				shdr = parseSHDR(child as RIFF.PayloadChunk);
				break;
			default:
				console.warn("Unknown pdta chunk:", child.fourCC);
		}
	}

	assertNotNullish(phdr);
	assertNotNullish(pbag);
	assertNotNullish(pmod);
	assertNotNullish(pgen);
	assertNotNullish(inst);
	assertNotNullish(ibag);
	assertNotNullish(imod);
	assertNotNullish(igen);
	assertNotNullish(shdr);

	return {
		phdr,
		pbag,
		pmod,
		pgen,
		inst,
		ibag,
		imod,
		igen,
		shdr,
	};
}

export interface PHDR {
	readonly name: string;
	readonly preset: number;
	readonly bank: number;
	readonly bagIndex: number;
	readonly library: number;
	readonly genre: number;
	readonly morphology: number;
}

export function parsePHDR(chunk: RIFF.PayloadChunk) {
	let offset = 0;
	const items: PHDR[] = [];
	while (offset < chunk.payload.byteLength) {
		items.push({
			name: getAsciiString(chunk.payload, offset, 20),
			preset: chunk.payload.getUint16(offset + 20, true),
			bank: chunk.payload.getUint16(offset + 22, true),
			bagIndex: chunk.payload.getUint16(offset + 24, true),
			library: chunk.payload.getUint32(offset + 26, true),
			genre: chunk.payload.getUint32(offset + 30),
			morphology: chunk.payload.getUint32(offset + 34),
		});
		offset += 38;
	}
	return items;
}

export interface PBAG {
	readonly generatorIndex: number;
	readonly modulatorIndex: number;
}

export function parsePBAG(chunk: RIFF.PayloadChunk) {
	let offset = 0;
	const items: PBAG[] = [];
	while (offset < chunk.payload.byteLength) {
		items.push({
			generatorIndex: chunk.payload.getUint16(offset, true),
			modulatorIndex: chunk.payload.getUint16(offset + 2, true),
		});
		offset += 4;
	}
	return items;
}

export interface PMOD {
	readonly srcOper: SFModulator;
	readonly destOper: SFGenerator;
	readonly amount: number;
	readonly amtSrcOper: SFModulator;
	readonly transOper: SFTransform;
}

export function parsePMOD(chunk: RIFF.PayloadChunk) {
	let offset = 0;
	const items: PMOD[] = [];
	while (offset < chunk.payload.byteLength) {
		items.push({
			srcOper: parseSFModulator(chunk.payload.getUint16(offset, true)),
			destOper: chunk.payload.getUint16(offset + 2, true) as SFGenerator,
			amount: chunk.payload.getInt16(offset + 4, true),
			amtSrcOper: parseSFModulator(chunk.payload.getUint16(offset + 6, true)),
			transOper: chunk.payload.getUint16(offset + 8, true),
		});
		offset += 10;
	}
	return items;
}

export interface PGEN {
	readonly generator: SFGenerator;
	readonly amount: DataView; // union of (uint8,uint8) | int16 | uint16
}

export function parsePGEN(chunk: RIFF.PayloadChunk) {
	let offset = 0;
	const items: PGEN[] = [];
	while (offset < chunk.payload.byteLength) {
		items.push({
			generator: chunk.payload.getUint16(offset, true) as SFGenerator,
			amount: new DataView(
				chunk.payload.buffer,
				chunk.payload.byteOffset + offset + 2,
				2,
			),
		});
		offset += 4;
	}
	return items;
}

export interface SFModulator {
	type: number;
	polarity: boolean;
	direction: boolean;
	cc: boolean;
	index: number;
}

export function parseSFModulator(value: number): SFModulator {
	return {
		type: value >> 10,
		polarity: ((value >> 9) & 0b1) === 1,
		direction: ((value >> 8) & 0b01) === 1,
		cc: ((value >> 7) & 0b01) === 1,
		index: value & 0b01111111,
	};
}

export const SFGenerator = {
	START_ADDRESS_OFFSET: 0,
	END_ADDRESS_OFFSET: 1,
	START_LOOP_ADDRESS_OFFSET: 2,
	END_LOOP_ADDRESS_OFFSET: 3,
	START_ADDRESS_COARSE_OFFSET: 4,
	MODULATION_LFO_TO_PITCH: 5,
	VIBRATE_LFO_TO_PITCH: 6,
	MODULATION_ENVELOPE_TO_PITCH: 7,
	INITIAL_FILTER_CUTOFF_FREQUENCY: 8,
	INITIAL_FILTER_Q: 9,
	MODULATION_LFO_TO_FILTER_CUTOFF: 10,
	MODULATION_ENVELOPE_TO_FILTER_CUTOFF: 11,
	END_ADDRESS_COARSE_OFFSET: 12,
	MODULATION_LFO_TO_VOLUME: 13,
	CHORUS_EFFECTS_SEND: 15,
	REVERB_EFFECTS_SEND: 16,
	PAN: 17,
	DELAY_MODULATION_LFO: 21,
	FREQUENCY_MODULATION_LFO: 22,
	DELAY_VIBRATE_LFO: 23,
	FREQUENCY_VIBRATE_LFO: 24,
	DELAY_MODULATION_ENVELOPE: 25,
	ATTACK_MODULATION_ENVELOPE: 26,
	HOLD_MODULATION_ENVELOPE: 27,
	DECAY_MODULATION_ENVELOPE: 28,
	SUSTAIN_MODULATION_ENVELOPE: 29,
	RELEASE_MODULATION_ENVELOPE: 30,
	KEY_NUMBER_TO_MODULATION_ENVELOPE_HOLD: 31,
	KEY_NUMBER_TO_MODULATION_ENVELOPE_DECAY: 32,
	DELAY_VOLUME_ENVELOPE: 33,
	ATTACK_VOLUME_ENVELOPE: 34,
	HOLD_VOLUME_ENVELOPE: 35,
	DECAY_VOLUME_ENVELOPE: 36,
	SUSTAIN_VOLUME_ENVELOPE: 37,
	RELEASE_VOLUME_ENVELOPE: 38,
	KEY_NUMBER_TO_VOLUME_ENVELOPE_HOLD: 39,
	KEY_NUMBER_TO_VOLUME_ENVELOPE_DECAY: 40,
	INSTRUMENT: 41,
	KEY_RANGE: 43,
	VELOCITY_RANGE: 44,
	START_LOOP_ADDRESS_COARSE_OFFSET: 45,
	KEY_NUMBER: 46,
	VELOCITY: 47,
	INITIAL_ATTENUATION: 48,
	END_LOOP_ADDRESS_COARSE_OFFSET: 50,
	COARSE_TUNE: 51,
	FINE_TUNE: 52,
	SAMPLE_ID: 53,
	SAMPLE_MODES: 54,
	SCALE_TUNING: 56,
	EXCLUSIVE_CLASS: 57,
	OVERRIDING_ROOT_KEY: 58,
	UNUSED5: 59,
	END_OPER: 60,
} as const;
export type SFGenerator = (typeof SFGenerator)[keyof typeof SFGenerator];
const InverseSFGenerator = Object.fromEntries(
	Object.entries(SFGenerator).map(([k, v]) => [v, k]),
);

export const SFTransform = {
	LINEAR: 0,
	ABSOLUTE_VALUE: 1,
};
export type SFTransform =
	| (typeof SFTransform)[keyof typeof SFTransform]
	| number;

export interface INST {
	readonly name: string;
	readonly bagIndex: number;
}

export function parseINST(chunk: RIFF.PayloadChunk) {
	let offset = 0;
	const items: INST[] = [];
	while (offset < chunk.payload.byteLength) {
		items.push({
			name: getAsciiString(chunk.payload, offset, 20),
			bagIndex: chunk.payload.getUint16(offset + 20, true),
		});
		offset += 22;
	}
	return items;
}

export interface IBAG {
	readonly generatorIndex: number;
	readonly modulatorIndex: number;
}

export function parseIBAG(chunk: RIFF.PayloadChunk) {
	let offset = 0;
	const items: IBAG[] = [];
	while (offset < chunk.payload.byteLength) {
		items.push({
			generatorIndex: chunk.payload.getUint16(offset, true),
			modulatorIndex: chunk.payload.getUint16(offset + 2, true),
		});
		offset += 4;
	}
	return items;
}

export interface IMOD {
	readonly srcOper: SFModulator;
	readonly destOper: SFGenerator;
	readonly amount: number;
	readonly amtSrcOper: SFModulator;
	readonly transOper: SFTransform;
}

export function parseIMOD(chunk: RIFF.PayloadChunk) {
	let offset = 0;
	const items: IMOD[] = [];
	while (offset < chunk.payload.byteLength) {
		items.push({
			srcOper: parseSFModulator(chunk.payload.getUint16(offset, true)),
			destOper: chunk.payload.getUint16(offset + 2, true) as SFGenerator,
			amount: chunk.payload.getInt16(offset + 4, true),
			amtSrcOper: parseSFModulator(chunk.payload.getUint16(offset + 6, true)),
			transOper: chunk.payload.getUint16(offset + 8, true),
		});
		offset += 10;
	}
	return items;
}

export interface IGEN {
	readonly generator: SFGenerator;
	readonly amount: DataView; // union of (uint8,uint8) | int16 | uint16
}

export function parseIGEN(chunk: RIFF.PayloadChunk) {
	let offset = 0;
	const items: IGEN[] = [];
	while (offset < chunk.payload.byteLength) {
		items.push({
			generator: chunk.payload.getUint16(offset, true) as SFGenerator,
			amount: new DataView(
				chunk.payload.buffer,
				chunk.payload.byteOffset + offset + 2,
				2,
			),
		});
		offset += 4;
	}
	return items;
}

export interface SHDR {
	readonly name: string;
	readonly start: number;
	readonly end: number;
	readonly startLoop: number;
	readonly endLoop: number;
	readonly sampleRate: number;

	/**
	 * サンプルのキー番号 [0-127]
	 */
	readonly originalPitch: number;

	readonly pitchCorrection: number;
	readonly sampleLink: number;
	readonly sampleType: SampleLink;
}

export function parseSHDR(chunk: RIFF.PayloadChunk) {
	let offset = 0;
	const items: SHDR[] = [];
	while (offset < chunk.payload.byteLength) {
		items.push({
			name: getAsciiString(chunk.payload, offset, 20),
			start: chunk.payload.getUint32(offset + 20, true),
			end: chunk.payload.getUint32(offset + 24, true),
			startLoop: chunk.payload.getUint32(offset + 28, true),
			endLoop: chunk.payload.getUint32(offset + 32, true),
			sampleRate: chunk.payload.getUint32(offset + 36, true),
			originalPitch: chunk.payload.getUint8(offset + 40),
			pitchCorrection: chunk.payload.getInt8(offset + 41),
			sampleLink: chunk.payload.getUint16(offset + 42, true),
			sampleType: chunk.payload.getUint16(offset + 44, true) as SampleLink,
		});
		offset += 46;
	}
	return items;
}

export class Sample {
	readonly name: string;
	readonly key: number;
	readonly sample: Float32Array;
	readonly rate: number;
	readonly loopStartIndex: number;
	readonly loopEndIndex: number;

	constructor(props: {
		name: string;
		key: number;
		sample: Float32Array<ArrayBuffer>;
		rate: number;
		loopStartIndex: number;
		loopEndIndex: number;
	}) {
		this.name = props.name;
		this.key = props.key;
		this.sample = props.sample;
		this.rate = props.rate;
		this.loopStartIndex = props.loopStartIndex;
		this.loopEndIndex = props.loopEndIndex;
	}

	get loopStartSeconds() {
		return this.loopStartIndex / this.rate;
	}

	get loopEndSeconds() {
		return this.loopEndIndex / this.rate;
	}

	static create(buffer: Int16Array<ArrayBuffer>, shdr: SHDR): Sample {
		return new Sample({
			name: shdr.name,
			key: shdr.originalPitch,
			sample: new Float32Array(buffer.slice(shdr.start, shdr.end)).map(
				(v) => v / 32768,
			),
			rate: shdr.sampleRate,
			loopStartIndex: shdr.startLoop - shdr.start,
			loopEndIndex: shdr.endLoop - shdr.start,
		});
	}
}

export const SampleLink = {
	MONO_SAMPLE: 1,
	RIGHT_SAMPLE: 2,
	LEFT_SAMPLE: 4,
	LINKED_SAMPLE: 8,
	ROM_MONO_SAMPLE: 0x8001,
	ROM_RIGHT_SAMPLE: 0x8002,
	ROM_LEFT_SAMPLE: 0x8004,
	ROM_LINKED_SAMPLE: 0x8008,
} as const;
export type SampleLink = (typeof SampleLink)[keyof typeof SampleLink];

/**
 * 閉区間
 */
export class Range {
	constructor(
		public min: number,
		public max: number,
	) {}

	includes(value: number) {
		return this.min <= value && value <= this.max;
	}
}

export class Preset {
	readonly name: string;
	readonly zones: PresetZone[];
	readonly presetNumber: number;
	readonly bankNumber: number;

	constructor(props: {
		name: string;
		zones: PresetZone[];
		presetNumber: number;
		bankNumber: number;
	}) {
		this.name = props.name;
		this.zones = props.zones;
		this.presetNumber = props.presetNumber;
		this.bankNumber = props.bankNumber;
	}

	static create(pdta: PDTA, phdrIndex: number, zones: PresetZone[]) {
		const phdr = pdta.phdr[phdrIndex];
		assertNotNullish(phdr);

		const zoneIndexFrom = pdta.phdr[phdrIndex]?.bagIndex;
		const zoneIndexTo = pdta.phdr[phdrIndex + 1]?.bagIndex;
		assertNotNullish(zoneIndexFrom);
		assertNotNullish(zoneIndexTo);

		return new Preset({
			name: phdr.name,
			presetNumber: phdr.preset,
			bankNumber: phdr.bank,
			zones: zones.slice(zoneIndexFrom, zoneIndexTo),
		});
	}

	getInstrumentZones(key: number, velocity: number): InstrumentZone[] {
		const zones: InstrumentZone[] = [];

		for (const zone of this.zones) {
			if (!zone.keyRange.includes(key)) continue;
			if (!zone.velocityRange.includes(velocity)) continue;
			if (zone.instrument === null) continue;

			zones.push(...zone.instrument.getZones(key, velocity));
		}

		return zones;
	}

	getNoLoopKeys(): Set<number> {
		const noLoopKeys = new Set<number>();
		for (let key = 0; key < NUM_KEYS; key++) {
			noLoopKeys.add(key);
		}

		for (const zone of this.zones) {
			if (zone.instrument === null) continue;

			for (const instZone of zone.instrument.zones) {
				if (instZone.sampleMode === "no_loop") continue;

				for (
					let key = instZone.keyRange.min;
					key <= instZone.keyRange.max;
					key++
				) {
					noLoopKeys.delete(key);
				}
			}
		}

		return noLoopKeys;
	}
}

export class Instrument {
	constructor(
		readonly name: string,
		readonly zones: InstrumentZone[],
	) {}

	static create(
		pdta: PDTA,
		inst: INST,
		instIndex: number,
		zones: InstrumentZone[],
	): Instrument {
		const zoneIndexFrom = pdta.inst[instIndex]?.bagIndex;
		const zoneIndexTo = pdta.inst[instIndex + 1]?.bagIndex;
		assertNotNullish(zoneIndexFrom);
		assertNotNullish(zoneIndexTo);

		return new Instrument(inst.name, zones.slice(zoneIndexFrom, zoneIndexTo));
	}

	getZones(key: number, velocity: number): InstrumentZone[] {
		const zones: InstrumentZone[] = [];

		for (const zone of this.zones) {
			if (!zone.keyRange.includes(key)) continue;
			if (!zone.velocityRange.includes(velocity)) continue;
			if (zone.sample === null) continue;

			zones.push(zone);
		}

		return zones;
	}
}

export abstract class Zone {
	/**
	 * このゾーンが有効となるMIDIキー範囲
	 */
	keyRange: Range = new Range(0, 127);

	/**
	 * このゾーンに対して指定可能なベロシティ範囲
	 */
	velocityRange: Range = new Range(0, 127);

	// region フィルタ

	/**
	 * ローパスフィルタのカットオフ周波数 [Hz]
	 * nullの場合、フィルタは適用されない
	 */
	initialFilterCutoffFrequency: number | null = null;

	/**
	 * ローパスフィルタのQ値
	 */
	initialFilterQ: number = 0;

	// endregion

	// region モジュレーションエンベロープ

	/**
	 * モジュレーションエンベロープ
	 */
	modulationEnvelope = new Envelope();

	/**
	 * モジュレーションエンベロープのhold時間に対するキー番号の影響度 [倍率]
	 * キー番号60を基準とし、1キー増加するごとにこの倍率をdecay時間に乗算する。
	 */
	keyNumberToModulationEnvelopeHold: number = 1.0;

	/**
	 * モジュレーションエンベロープのdecay時間に対するキー番号の影響度 [倍率]
	 * キー番号60を基準とし、1キー増加するごとにこの倍率をdecay時間に乗算する。
	 */
	keyNumberToModulationEnvelopeDecay: number = 1.0;

	/**
	 * モジュレーションエンベロープのピッチへの影響度 [倍率]
	 * モジュレーションエンベロープが最大値に達したときのピッチ変化量を表す。
	 *
	 * 例
	 * modulationEnvelopeToPitch=100のとき、
	 * モジュレーションエンベロープが最大値に達したときにピッチが100[cent]=1[semitone]=半音上がる
	 */
	modulationEnvelopeToPitch: number = 0;

	/**
	 * モジュレーションエンベロープのフィルタのカットオフ周波数への影響度 [倍率]
	 *
	 * モジュレーションエンベロープが最大値に達したときのフィルタのカットオフ周波数変化を表す。
	 * 例
	 * modulationEnvelopeToFilterCutoffFrequency=1のとき、
	 * モジュレーションエンベロープが最大値に達したときにカットオフ周波数が1オクターブ上がる(2倍になる)
	 */
	modulationEnvelopeToFilterCutoffFrequency: number = 0;

	// endregion

	// region ビブラートLFO

	/**
	 * ビブラートLFOのdelay時間 [sec]
	 */
	delayVibrateLFO: number = 0;

	/**
	 * ビブラートLFOの周波数 [Hz]
	 */
	frequencyVibrationLFO: number = 8.176;

	/**
	 * ビブラートLFOのピッチへの影響度 [倍率]
	 *
	 * ビブラートが最大値に達したときのピッチ変化量を表す。
	 * 例
	 * vibrationLFOToPitch=100のとき、
	 * ビブラートLFOが最大値に達したときにピッチが100[cent]=1[semitone]=半音上がり、
	 * ビブラートLFOが最小値に達したときにピッチが-100[cent]=-1[semitone]=半音下がる
	 */
	vibrationLFOToPitch: number = 0;

	// endregion

	// region モジュレーションLFO

	/**
	 * モジュレーションLFOのピッチへの影響度 [倍率]
	 *
	 * モジュレーションが最大値に達したときのピッチ変化量を表す。
	 * 例
	 * modulationLFOToPitch=1のとき、
	 * モジュレーションLFOが最大値に達したときにピッチが1オクターブ上がり(2倍になり)、
	 * モジュレーションLFOが最小値に達したときにピッチが1オクターブ下がる(1/2倍になる)
	 */
	modulationLFOToPitch: number = 0;

	/**
	 * モジュレーションLFOのボリュームへの影響度 [dB]
	 *
	 * モジュレーションが最大値に達したときのボリューム変化を表す。
	 * 例
	 * modulationLFOToVolume=100のとき、
	 * モジュレーションLFOが最大値に達したときに音量が100[dB]=10[B]増加し
	 * モジュレーションLFOが最小値に達したときに音量が-100[dB]=-10[B]減少する
	 */
	modulationLFOToVolume: number = 0;

	/**
	 * モジュレーションLFOのフィルタのカットオフ周波数への影響度 [倍率]
	 *
	 * モジュレーションが最大値に達したときのフィルタのカットオフ周波数変化を表す。
	 * 例
	 * modulationLFOToFilterCutoffFrequency=1のとき、
	 * モジュレーションLFOが最大値に達したときにカットオフ周波数が1オクターブ上がり(2倍になり)、
	 * モジュレーションLFOが最小値に達したときにカットオフ周波数が1オクターブ下がる(1/2倍になる)
	 */
	modulationLFOToFilterCutoffFrequency: number = 0;

	/**
	 * モジュレーションLFOのdelay時間 [sec]
	 */
	delayModulationLFO: number = 0;

	/**
	 * モジュレーションLFOの周波数 [Hz]
	 */
	frequencyModulationLFO: number = 8.176;

	// endregion

	// region ボリュームエンベロープ

	/**
	 * ボリュームエンベロープ
	 */
	volumeEnvelope = new Envelope();

	/**
	 * ボリュームエンベロープのhold時間に対するキー番号の影響度 [倍率]
	 * キー番号60を基準とし、1キー増加するごとにこの倍率をhold時間に乗算する。
	 */
	keyNumberToVolumeEnvelopeHold: number = 1.0;

	/**
	 * ボリュームエンベロープのdecay時間に対するキー番号の影響度 [倍率]
	 * キー番号60を基準とし、1キー増加するごとにこの倍率をdecay時間に乗算する。
	 */
	keyNumberToVolumeEnvelopeDecay: number = 1.0;

	// endregion

	/**
	 * ピッチのオフセット [semitone]
	 */
	coarseTune: number = 0.0;

	/**
	 * ピッチのオフセット [cent]
	 */
	fineTune: number = 0.0;

	/**
	 * キーごとのピッチの変化量 [倍率]
	 */
	scaleTuning: number = 2 ** (1 / 12);

	/**
	 * コーラスエフェクトへ送る音量(dB)の割合 [倍率]
	 */
	chorusEffectsSend: number = 0;

	/**
	 * リバーブエフェクトへ送る音量(dB)の割合 [倍率]
	 */
	reverbEffectsSend: number = 0;

	/**
	 * 音源の位置 [-0.5(left)〜0(center)〜+0.5(right)]
	 */
	pan: number = 0;

	/**
	 * 初期減衰量 [dB]
	 *
	 * ノートのオン時に適用される減衰量を表す。値が大きいほど音量が小さくなる。
	 */
	initialAttenuation: number = 0;

	/**
	 * ピッチのオフセット [倍率]
	 */
	get tune(): number {
		return 2 ** ((this.coarseTune * 100 + this.fineTune) / 1200);
	}

	applyGenerator(gen: IGEN | PGEN, ..._unused: never[]) {
		switch (gen.generator) {
			case SFGenerator.KEY_RANGE: {
				this.keyRange = new Range(
					gen.amount.getUint8(0),
					gen.amount.getUint8(1),
				);
				break;
			}
			case SFGenerator.VELOCITY_RANGE: {
				this.velocityRange = new Range(
					gen.amount.getUint8(0),
					gen.amount.getUint8(1),
				);
				break;
			}

			// region フィルタ
			case SFGenerator.INITIAL_FILTER_CUTOFF_FREQUENCY: {
				const rawValue = minmax(1500, 13500, gen.amount.getInt16(0, true));
				this.initialFilterCutoffFrequency = 8.176 * 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.INITIAL_FILTER_Q: {
				this.initialFilterQ = minmax(0, 960, gen.amount.getUint16(0, true));
				break;
			}
			// endregion

			// region モジュレーションLFO
			case SFGenerator.DELAY_MODULATION_LFO: {
				const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
				this.delayModulationLFO = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.FREQUENCY_MODULATION_LFO: {
				const rawValue = minmax(-16000, 4500, gen.amount.getInt16(0, true));
				this.frequencyModulationLFO = 8.176 * 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.MODULATION_LFO_TO_PITCH: {
				const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
				this.modulationLFOToPitch = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.MODULATION_LFO_TO_VOLUME: {
				const rawValue = minmax(-960, 960, gen.amount.getInt16(0, true));
				this.modulationLFOToVolume = rawValue / 10;
				break;
			}
			case SFGenerator.MODULATION_LFO_TO_FILTER_CUTOFF: {
				const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
				this.modulationLFOToFilterCutoffFrequency = 2 ** (rawValue / 1200);
				break;
			}
			// endregion

			// region ビブラートLFO
			case SFGenerator.DELAY_VIBRATE_LFO: {
				const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
				this.delayVibrateLFO = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.FREQUENCY_VIBRATE_LFO: {
				const rawValue = minmax(-16000, 4500, gen.amount.getInt16(0, true));
				this.frequencyVibrationLFO = 8.176 * 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.VIBRATE_LFO_TO_PITCH: {
				const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
				this.vibrationLFOToPitch = 2 ** (rawValue / 1200);
				break;
			}
			// endregion

			// region モジュレーションEnvelope
			case SFGenerator.DELAY_MODULATION_ENVELOPE: {
				const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
				this.modulationEnvelope.delay = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.ATTACK_MODULATION_ENVELOPE: {
				const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
				this.modulationEnvelope.attack = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.HOLD_MODULATION_ENVELOPE: {
				const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
				this.modulationEnvelope.hold = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.DECAY_MODULATION_ENVELOPE: {
				const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
				this.modulationEnvelope.decay = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.SUSTAIN_MODULATION_ENVELOPE: {
				const rawValue = minmax(0, 1000, gen.amount.getUint16(0, true));
				this.modulationEnvelope.sustain = 1 - rawValue / 1000;
				break;
			}
			case SFGenerator.RELEASE_MODULATION_ENVELOPE: {
				const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
				this.modulationEnvelope.release = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.KEY_NUMBER_TO_MODULATION_ENVELOPE_HOLD: {
				const rawValue = minmax(-1200, 1200, gen.amount.getInt16(0, true));
				this.keyNumberToModulationEnvelopeHold = 1 / 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.KEY_NUMBER_TO_MODULATION_ENVELOPE_DECAY: {
				const rawValue = minmax(-1200, 1200, gen.amount.getInt16(0, true));
				this.keyNumberToModulationEnvelopeDecay = 1 / 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.MODULATION_ENVELOPE_TO_PITCH: {
				const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
				this.modulationEnvelopeToPitch = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.MODULATION_ENVELOPE_TO_FILTER_CUTOFF: {
				const rawValue = minmax(-12000, 12000, gen.amount.getInt16(0, true));
				this.modulationEnvelopeToFilterCutoffFrequency = 2 ** (rawValue / 1200);
				break;
			}

			// endregion

			// region ボリュームEnvelope
			case SFGenerator.DELAY_VOLUME_ENVELOPE: {
				const rawValue = minmax(-1200, 5000, gen.amount.getInt16(0, true));
				this.volumeEnvelope.delay = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.ATTACK_VOLUME_ENVELOPE: {
				const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
				this.volumeEnvelope.attack = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.HOLD_VOLUME_ENVELOPE: {
				const rawValue = minmax(-12000, 5000, gen.amount.getInt16(0, true));
				this.volumeEnvelope.hold = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.DECAY_VOLUME_ENVELOPE: {
				const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
				this.volumeEnvelope.decay = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.SUSTAIN_VOLUME_ENVELOPE: {
				const rawValue = minmax(0, 1440, gen.amount.getUint16(0, true));
				this.volumeEnvelope.sustain = 1 / 10 ** (rawValue / 100);
				break;
			}
			case SFGenerator.RELEASE_VOLUME_ENVELOPE: {
				const rawValue = minmax(-12000, 8000, gen.amount.getInt16(0, true));
				this.volumeEnvelope.release = 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.KEY_NUMBER_TO_VOLUME_ENVELOPE_HOLD: {
				const rawValue = minmax(-1200, 1200, gen.amount.getInt16(0, true));
				this.keyNumberToVolumeEnvelopeHold = 1 / 2 ** (rawValue / 1200);
				break;
			}
			case SFGenerator.KEY_NUMBER_TO_VOLUME_ENVELOPE_DECAY: {
				const rawValue = minmax(-1200, 1200, gen.amount.getInt16(0, true));
				this.keyNumberToVolumeEnvelopeDecay = 1 / 2 ** (rawValue / 1200);
				break;
			}
			// endregion

			case SFGenerator.COARSE_TUNE: {
				const rawValue = minmax(-120, 120, gen.amount.getInt16(0, true));
				this.coarseTune = rawValue / 12;
				break;
			}
			case SFGenerator.FINE_TUNE: {
				this.fineTune = minmax(-99, 99, gen.amount.getInt16(0, true));
				break;
			}
			case SFGenerator.SCALE_TUNING: {
				const rawValue = minmax(0, 1200, gen.amount.getInt16(0, true));
				this.scaleTuning = 2 ** (rawValue / 1200);
				break;
			}

			// region コーラス
			case SFGenerator.CHORUS_EFFECTS_SEND: {
				const rawValue = minmax(0, 1000, gen.amount.getUint16(0, true));
				this.chorusEffectsSend = rawValue / 1000;
				break;
			}
			// endregion

			// region リバーブ
			case SFGenerator.REVERB_EFFECTS_SEND: {
				const rawValue = minmax(0, 1000, gen.amount.getUint16(0, true));
				this.reverbEffectsSend = rawValue / 1000;
				break;
			}
			// endregion

			case SFGenerator.PAN: {
				const rawValue = minmax(-500, 500, gen.amount.getInt16(0, true));
				this.pan = rawValue / 1000;
				break;
			}
			case SFGenerator.INITIAL_ATTENUATION: {
				const rawValue = minmax(0, 1440, gen.amount.getUint16(0, true));
				this.initialAttenuation = rawValue / 10;
				break;
			}

			case SFGenerator.UNUSED5: {
				break;
			}

			default: {
				console.warn(
					`NIY: ${InverseSFGenerator[gen.generator]}(${gen.generator}) for Zone: ${this.constructor.name}`,
				);
			}
		}
	}
}

export class PresetZone extends Zone {
	instrument: Instrument | null = null;

	static create(
		pdta: PDTA,
		pbagIndex: number,
		instruments: readonly Instrument[],
	) {
		const zone = new PresetZone();

		const generatorIndexFrom = pdta.pbag[pbagIndex]?.generatorIndex;
		const generatorIndexTo = pdta.pbag[pbagIndex + 1]?.generatorIndex;
		assertNotNullish(generatorIndexFrom);
		assertNotNullish(generatorIndexTo);

		for (let i = generatorIndexFrom; i < generatorIndexTo; i++) {
			const igen = pdta.pgen[i];
			assertNotNullish(igen);
			zone.applyGenerator(igen, instruments);
		}

		return zone;
	}

	override applyGenerator(
		gen: IGEN | PGEN,
		instruments: readonly Instrument[],
	) {
		switch (gen.generator) {
			case SFGenerator.INSTRUMENT: {
				const instrument = instruments[gen.amount.getUint16(0, true)];
				assertNotNullish(instrument);
				this.instrument = instrument;
				break;
			}
			default: {
				super.applyGenerator(gen);
			}
		}
	}
}

export class InstrumentZone extends Zone {
	/**
	 * サンプルの開始位置オフセット。サンプルに本来設定されている開始位置に対して加算される。
	 */
	startAddressFineOffset = 0;

	/**
	 * サンプルの終了位置オフセット。サンプルに本来設定されている終了位置に対して加算される。
	 */
	endAddressFineOffset = 0;

	/**
	 * サンプルのループ開始位置オフセット。サンプルに本来設定されているループ開始位置に対して加算される。
	 */
	startLoopAddressFineOffset = 0;

	/**
	 * サンプルのループ終了位置オフセット。サンプルに本来設定されているループ終了位置に対して加算される。
	 * ループ範囲は半開区間であり、ループ終了地点のサンプル点は再生されないことに注意。
	 * 例えば、ループ開始が1000、ループ終了が2000の場合、1000から1999までのサンプル点がループ再生される。
	 * 2000番のサンプル点はループ再生には含まれない。
	 */
	endLoopAddressFineOffset = 0;

	/**
	 * サンプルの開始位置の粗調整オフセット。サンプルに本来設定されている開始位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、startAddressCoarseOffsetが1の場合、32768サンプル分開始位置が後ろにずれる。
	 */
	startAddressCoarseOffset = 0;

	/**
	 * サンプルの終了位置の粗調整オフセット。サンプルに本来設定されている終了位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、endAddressCoarseOffsetが1の場合、32768サンプル分終了位置が後ろにずれる。
	 */
	endAddressCoarseOffset = 0;

	/**
	 * サンプルのループ開始位置の粗調整オフセット。サンプルに本来設定されているループ開始位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、startLoopAddressCoarseOffsetが1の場合、32768サンプル分ループ開始位置が後ろにずれる。
	 */
	startLoopAddressCoarseOffset = 0;

	/**
	 * サンプルのループ終了位置の粗調整オフセット。サンプルに本来設定されているループ終了位置に対して加算される。
	 * 単位はサンプルフレーム数で、32768サンプル単位で調整される。
	 * 例えば、endLoopAddressCoarseOffsetが1の場合、32768サンプル分ループ終了位置が後ろにずれる。
	 */
	endLoopAddressCoarseOffset = 0;

	/**
	 * このゾーンが属する排他グループのクラス番号
	 * 同じ番号を持つゾーンは同時に複数再生できず、新しいゾーンが再生されると既存のゾーンの再生が停止される
	 * 0の場合は排他グループに属さない
	 */
	exclusiveClass = 0;

	/**
	 * このゾーンが参照するサンプル
	 */
	sample: Sample | null = null;

	/**
	 * サンプルの再生モード
	 */
	sampleMode: "no_loop" | "loop" | "loop_until_key_off" = "no_loop";

	/**
	 * ルートキーの上書き [0-127]
	 * nullの場合、{@link Sample#key}が使用される
	 */
	overridingRootKey: number | null = null;

	get startAddressOffset() {
		return (
			this.startLoopAddressCoarseOffset * 32768 + this.startAddressFineOffset
		);
	}

	get endAddressOffset() {
		return this.endLoopAddressCoarseOffset * 32768 + this.endAddressFineOffset;
	}

	get startLoopAddressOffset() {
		return (
			this.startLoopAddressCoarseOffset * 32768 +
			this.startLoopAddressFineOffset
		);
	}

	get endLoopAddressOffset() {
		return (
			this.endLoopAddressCoarseOffset * 32768 + this.endLoopAddressFineOffset
		);
	}

	/**
	 * このゾーンのルートキー(サンプルの基準となるMIDIキー番号)
	 */
	get rootKey(): number {
		return this.overridingRootKey ?? this.sample?.key ?? 60;
	}

	/**
	 * 指定されたMIDIキーに対するピッチ調整倍率を取得する
	 */
	getTuneForKey(key: number): number {
		return this.tune * this.scaleTuning ** (key - this.rootKey);
	}

	static create(pdta: PDTA, ibagIndex: number, samples: readonly Sample[]) {
		const zone = new InstrumentZone();

		const generatorIndexFrom = pdta.ibag[ibagIndex]?.generatorIndex;
		const generatorIndexTo = pdta.ibag[ibagIndex + 1]?.generatorIndex;
		assertNotNullish(generatorIndexFrom);
		assertNotNullish(generatorIndexTo);

		for (let i = generatorIndexFrom; i < generatorIndexTo; i++) {
			const igen = pdta.igen[i];
			assertNotNullish(igen);
			zone.applyGenerator(igen, samples);
		}

		return zone;
	}

	override applyGenerator(gen: IGEN | PGEN, samples: readonly Sample[]) {
		switch (gen.generator) {
			case SFGenerator.START_ADDRESS_OFFSET: {
				this.startAddressFineOffset = minmax(
					0,
					null,
					gen.amount.getInt16(0, true),
				);
				break;
			}
			case SFGenerator.END_ADDRESS_OFFSET: {
				this.endAddressFineOffset = minmax(
					null,
					0,
					gen.amount.getInt16(0, true),
				);
				break;
			}
			case SFGenerator.START_LOOP_ADDRESS_OFFSET: {
				this.startLoopAddressFineOffset = gen.amount.getInt16(0, true);
				break;
			}
			case SFGenerator.END_LOOP_ADDRESS_OFFSET: {
				this.endLoopAddressFineOffset = gen.amount.getInt16(0, true);
				break;
			}
			case SFGenerator.START_ADDRESS_COARSE_OFFSET: {
				this.startAddressCoarseOffset = minmax(
					0,
					null,
					gen.amount.getInt16(0, true),
				);
				break;
			}
			case SFGenerator.END_ADDRESS_COARSE_OFFSET: {
				this.endAddressCoarseOffset = minmax(
					null,
					0,
					gen.amount.getInt16(0, true),
				);
				break;
			}
			case SFGenerator.START_LOOP_ADDRESS_COARSE_OFFSET: {
				this.startLoopAddressCoarseOffset = gen.amount.getInt16(0, true);
				break;
			}
			case SFGenerator.END_LOOP_ADDRESS_COARSE_OFFSET: {
				this.endLoopAddressCoarseOffset = gen.amount.getInt16(0, true);
				break;
			}
			case SFGenerator.SAMPLE_ID: {
				if (!(this instanceof InstrumentZone)) break;
				const sample = samples[gen.amount.getUint16(0, true)];
				assertNotNullish(sample);
				this.sample = sample;
				break;
			}
			case SFGenerator.SAMPLE_MODES: {
				// サンプルの再生モード（ループ設定など）TODO
				const rawValue = gen.amount.getUint8(0);
				switch (rawValue & 0b11) {
					case 0: // no loop
						this.sampleMode = "no_loop";
						break;
					case 1: // continuous loop
						this.sampleMode = "loop";
						break;
					case 2: // unused
						break;
					case 3: // loop until key off
						this.sampleMode = "loop_until_key_off";
						break;
				}
				break;
			}
			case SFGenerator.EXCLUSIVE_CLASS: {
				this.exclusiveClass = gen.amount.getUint16(0, true);
				break;
			}
			case SFGenerator.OVERRIDING_ROOT_KEY: {
				this.overridingRootKey = minmax(0, 127, gen.amount.getUint16(0, true));
				break;
			}
			default: {
				super.applyGenerator(gen);
			}
		}
	}

	private audioBuffer: AudioBuffer | null = null;

	createAudioBufferSourceNode(
		context: AudioContext,
	): AudioBufferSourceNode | null {
		if (this.sample === null) return null;

		if (this.audioBuffer === null) {
			this.audioBuffer = new AudioBuffer({
				length:
					this.sample.sample.length -
					this.startAddressOffset +
					this.endAddressOffset,
				numberOfChannels: 1,
				sampleRate: this.sample.rate,
			});
			this.audioBuffer.copyToChannel(
				this.sample.sample.slice(
					this.startAddressOffset,
					this.startAddressOffset + this.sample.sample.length,
				),
				0,
			);
		}

		switch (this.sampleMode) {
			case "no_loop": {
				return new AudioBufferSourceNode(context, {
					loop: false,
					buffer: this.audioBuffer,
				});
			}
			case "loop": {
				return new AudioBufferSourceNode(context, {
					loop: true,
					loopStart:
						this.sample.loopStartSeconds +
						this.startAddressOffset / this.sample.rate,
					loopEnd:
						this.sample.loopEndSeconds +
						this.endLoopAddressOffset / this.sample.rate,
					buffer: this.audioBuffer,
				});
			}
			case "loop_until_key_off": {
				console.warn("NIY: loop_until_key_off sample mode", this);
				return new AudioBufferSourceNode(context, {
					loop: true,
					loopStart:
						this.sample.loopStartSeconds +
						this.startAddressOffset / this.sample.rate,
					loopEnd:
						this.sample.loopEndSeconds +
						this.endLoopAddressOffset / this.sample.rate,
					buffer: this.audioBuffer,
				});
			}
		}
	}
}

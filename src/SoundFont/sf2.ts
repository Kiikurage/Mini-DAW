import { assertNotNullish } from "../lib.ts";
import { getAsciiString, type RIFF } from "./RIFF.ts";

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

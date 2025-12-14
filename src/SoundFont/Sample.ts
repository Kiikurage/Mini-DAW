import type { SHDR } from "./sf2.ts";

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

import { widthPerTick } from "../Editor/PianoRoll/PianoRollViewRenderer.ts";

export class Note {
	readonly id: number;
	readonly key: number;
	readonly tickFrom: number;
	readonly tickTo: number;

	/**
	 * 音の強さ (0-127)
	 */
	readonly velocity: number;

	constructor(props: {
		id: number;
		key: number;
		tickFrom: number;
		tickTo: number;
		velocity: number;
	}) {
		this.id = props.id;
		this.key = props.key;
		this.tickFrom = Math.max(0, props.tickFrom);
		this.tickTo = Math.max(this.tickFrom, props.tickTo);
		this.velocity = props.velocity;
	}

	get step() {
		return this.tickTo - this.tickFrom;
	}

	getXFrom(zoom: number) {
		return this.tickFrom * widthPerTick(zoom);
	}

	getXTo(zoom: number) {
		return this.tickTo * widthPerTick(zoom);
	}

	serialize(): SerializedNote {
		return {
			id: this.id,
			key: this.key,
			tickFrom: this.tickFrom,
			tickTo: this.tickTo,
			velocity: this.velocity,
		};
	}

	static deserialize(data: SerializedNote): Note {
		return new Note({
			id: data.id,
			key: data.key,
			tickFrom: data.tickFrom,
			tickTo: data.tickTo,
			velocity: data.velocity,
		});
	}
}

export interface SerializedNote {
	readonly id: number;
	readonly key: number;
	readonly tickFrom: number;
	readonly tickTo: number;
	readonly velocity: number;
}

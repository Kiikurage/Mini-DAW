import { Color, type SerializedColor } from "../Color.ts";
import { InstrumentKey, type SerializedInstrumentKey, } from "./InstrumentKey.ts";
import { Note, type SerializedNote } from "./Note.ts";

export class Channel {
	static readonly COLORS = [
		Color.hsl(350, 0.45, 0.5),
		Color.hsl(155, 0.45, 0.5),
		Color.hsl(270, 0.45, 0.5),
		Color.hsl(25, 0.45, 0.5),
		Color.hsl(180, 0.45, 0.5),
		Color.hsl(315, 0.45, 0.5),
		Color.hsl(60, 0.45, 0.5),
		Color.hsl(225, 0.45, 0.5),
	] as const;

	readonly id: number;
	readonly label: string;
	readonly instrumentKey: InstrumentKey;
	readonly notes: ReadonlyMap<number, Note>;
	readonly color: Color;

	constructor(props: {
		readonly id: number;
		readonly label: string;
		readonly instrumentKey: InstrumentKey;
		readonly notes: ReadonlyMap<number, Note>;
		readonly color: Color;
	}) {
		this.id = props.id;
		this.label = props.label;
		this.instrumentKey = props.instrumentKey;
		this.notes = props.notes;
		this.color = props.color;
	}

	/**
	 * 最後のノートの開始位置 [tick]
	 */
	get lastTickFrom(): number {
		return Math.max(
			0,
			...[...this.notes.values()].map((note) => note.tickFrom),
		);
	}

	get tickTo(): number {
		return Math.max(0, ...[...this.notes.values()].map((note) => note.tickTo));
	}

	get labelOrDefault(): string {
		return this.label.trim() === "" ? `Channel ${this.id + 1}` : this.label;
	}

	deleteNotes(ids: Iterable<number>): Channel {
		const newNotes = new Map(this.notes);
		for (const id of ids) {
			newNotes.delete(id);
		}
		if (newNotes.size === this.notes.size) return this;

		return new Channel({ ...this, notes: newNotes });
	}

	setNotes(newNotes: Iterable<Note>): Channel {
		const oldNotesMap = this.notes;
		const newNotesMap = new Map(oldNotesMap);

		let flagMutated = false;
		for (const newNote of newNotes) {
			const oldNote = oldNotesMap.get(newNote.id);
			if (oldNote === newNote) continue;

			newNotesMap.set(newNote.id, newNote);
			flagMutated = true;
		}

		if (!flagMutated) return this;

		return new Channel({ ...this, notes: newNotesMap });
	}

	setLabel(label: string): Channel {
		if (this.label === label) return this;
		return new Channel({ ...this, label });
	}

	setInstrumentKey(instrumentKey: InstrumentKey): Channel {
		if (this.instrumentKey === instrumentKey) return this;
		return new Channel({ ...this, instrumentKey });
	}

	applyPatch(patch: ChannelPatch): Channel {
		let channel: Channel = this;
		if (patch.label !== undefined) {
			channel = channel.setLabel(patch.label);
		}
		if (patch.instrumentKey !== undefined) {
			channel = channel.setInstrumentKey(patch.instrumentKey);
		}
		return channel;
	}

	serialize(): SerializedChannel {
		const serializedNotes: Record<number, SerializedNote> = {};
		for (const [key, note] of this.notes) {
			serializedNotes[key] = note.serialize();
		}

		return {
			id: this.id,
			label: this.label,
			instrumentKey: this.instrumentKey.serialize(),
			notes: serializedNotes,
			color: this.color.serialize(),
		};
	}

	static deserialize(data: SerializedChannel): Channel {
		const notes = new Map<number, Note>();
		for (const [keyStr, noteData] of Object.entries(data.notes)) {
			notes.set(Number(keyStr), Note.deserialize(noteData));
		}

		return new Channel({
			id: data.id,
			label: data.label,
			instrumentKey: InstrumentKey.deserialize(data.instrumentKey),
			notes,
			color: Color.deserialize(data.color),
		});
	}
}

export interface ChannelPatch {
	label?: string;
	instrumentKey?: InstrumentKey;
}

export interface SerializedChannel {
	readonly id: number;
	readonly label: string;
	readonly instrumentKey: SerializedInstrumentKey;
	readonly notes: Record<number, SerializedNote>;
	readonly color: SerializedColor;
}

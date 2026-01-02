import { type Branded, randomId } from "../lib.ts";

export type NoteId = Branded<string, "NoteId">;

export interface Note {
	readonly id: NoteId;
	readonly key: number;
	readonly tickFrom: number;
	readonly tickTo: number;

	/**
	 * 音の強さ (0-127)
	 */
	readonly velocity: number;
}

export interface NotePatch {
	id: NoteId;
	key?: number;
	tickFrom?: number;
	tickTo?: number;
	velocity?: number;
}

export const Note = {
	generateId(): NoteId {
		return randomId(16) as NoteId;
	},
	create(props: {
		id: NoteId;
		key: number;
		tickFrom: number;
		tickTo: number;
		velocity: number;
	}): Note {
		const tickFrom = Math.max(0, props.tickFrom);
		const tickTo = Math.max(tickFrom, props.tickTo);
		return {
			id: props.id,
			key: props.key,
			tickFrom,
			tickTo,
			velocity: props.velocity,
		};
	},

	applyPatch(note: Note, patch: NotePatch) {
		return Note.create({
			...note,
			...patch,
			id: note.id,
		});
	},
};

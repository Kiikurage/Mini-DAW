import { Color, type SerializedColor } from "../Color.ts";
import { type Branded, EmptyMap, randomId, toMutableMap } from "../lib.ts";
import { type CC, type CCId, CCList, type SerializedCCList } from "./CC.ts";
import type { ControlType } from "./ControlType.ts";
import {
	InstrumentKey,
	type SerializedInstrumentKey,
} from "./InstrumentKey.ts";
import type { Note, NoteId } from "./Note.ts";

export type ChannelId = Branded<string, "ChannelId">;

export interface Channel {
	readonly metadata: {
		readonly id: ChannelId;
		readonly label: string;
		readonly instrumentKey: InstrumentKey;
		readonly color: Color;
		readonly noteIds: readonly NoteId[];
	};
	readonly notes: ReadonlyMap<NoteId, Note>;
	readonly ccLists: ReadonlyMap<ControlType, CCList>;
}

export const Channel = {
	COLORS: [
		Color.hsl(350, 0.45, 0.5),
		Color.hsl(155, 0.45, 0.5),
		Color.hsl(270, 0.45, 0.5),
		Color.hsl(25, 0.45, 0.5),
		Color.hsl(180, 0.45, 0.5),
		Color.hsl(315, 0.45, 0.5),
		Color.hsl(60, 0.45, 0.5),
		Color.hsl(225, 0.45, 0.5),
	] as const,
	create(instrumentKey: InstrumentKey): Channel {
		return {
			metadata: {
				id: Channel.generateId(),
				label: "Channel",
				instrumentKey,
				color:
					Channel.COLORS[Math.floor(Math.random() * Channel.COLORS.length)]!,
				noteIds: [],
			},
			notes: EmptyMap,
			ccLists: EmptyMap,
		};
	},
	generateId(): ChannelId {
		return randomId(16) as ChannelId;
	},
	/**
	 * 最後のノートの開始位置 [tick]
	 */
	getLastTickFrom(channel: Channel) {
		return Math.max(
			0,
			...[...channel.notes.values()].map((note) => note.tickFrom),
		);
	},
	getTickTo(channel: Channel): number {
		return Math.max(
			0,
			...[...channel.notes.values()].map((note) => note.tickTo),
		);
	},
	getLabelOrDefault(channelMetadata: Channel["metadata"]): string {
		return channelMetadata.label.trim() === ""
			? "Channel"
			: channelMetadata.label;
	},
	removeNotes(channel: Channel, ids: Iterable<NoteId>): Channel {
		const notes = toMutableMap(channel.notes);
		for (const id of ids) {
			notes.delete(id);
		}
		if (notes.size === channel.notes.size) return channel;

		return {
			...channel,
			metadata: {
				...channel.metadata,
				noteIds: [...notes.keys()],
			},
			notes,
		};
	},
	putNotes(channel: Channel, newNotes: Iterable<Note>): Channel {
		const notes = toMutableMap(channel.notes);

		let isMutated = false;
		let isAdded = false;
		for (const newNote of newNotes) {
			const oldNote = channel.notes.get(newNote.id);
			if (oldNote === newNote) continue;

			notes.set(newNote.id, newNote);
			isMutated ||= true;
			isAdded ||= oldNote === undefined;
		}

		if (!isMutated) return channel;

		let metadata = channel.metadata;
		if (isAdded) {
			metadata = { ...metadata, noteIds: [...notes.keys()] };
		}

		return { ...channel, metadata, notes };
	},
	setLabel(channel: Channel, label: string): Channel {
		if (channel.metadata.label === label) return channel;
		return { ...channel, metadata: { ...channel.metadata, label } };
	},
	setInstrumentKey(channel: Channel, instrumentKey: InstrumentKey): Channel {
		if (channel.metadata.instrumentKey === instrumentKey) return channel;
		return { ...channel, metadata: { ...channel.metadata, instrumentKey } };
	},
	putCCs(
		channel: Channel,
		controlType: ControlType,
		ccs: Iterable<CC>,
	): Channel {
		const oldCCs =
			channel.ccLists.get(controlType) ?? CCList.create(controlType);

		const ccMap = toMutableMap(channel.ccLists);
		ccMap.set(controlType, CCList.put(oldCCs, ccs));

		return { ...channel, ccLists: ccMap };
	},
	removeCCs(
		channel: Channel,
		controlType: ControlType,
		ids: Iterable<CCId>,
	): Channel {
		const oldCCs = channel.ccLists.get(controlType);
		if (oldCCs === undefined) return channel;

		const ccMap = toMutableMap(channel.ccLists);
		ccMap.set(controlType, CCList.delete(oldCCs, ids));

		return { ...channel, ccLists: ccMap };
	},
	applyPatch(channel: Channel, patch: ChannelPatch): Channel {
		if (patch.label !== undefined) {
			channel = Channel.setLabel(channel, patch.label);
		}
		if (patch.instrumentKey !== undefined) {
			channel = Channel.setInstrumentKey(channel, patch.instrumentKey);
		}
		return channel;
	},
	serialize(channel: Channel): SerializedChannel {
		const serializedNotes: Record<NoteId, Note> = {};
		for (const [key, note] of channel.notes) {
			serializedNotes[key] = note;
		}

		return {
			id: channel.metadata.id,
			label: channel.metadata.label,
			instrumentKey: channel.metadata.instrumentKey.serialize(),
			notes: [...channel.notes.values()],
			ccLists: [...channel.ccLists.values()].map((list) =>
				CCList.serialize(list),
			),
			color: channel.metadata.color.serialize(),
		};
	},
	deserialize(data: SerializedChannel): Channel {
		return {
			metadata: {
				id: data.id,
				label: data.label,
				instrumentKey: InstrumentKey.deserialize(data.instrumentKey),
				color: Color.deserialize(data.color),
				noteIds: data.notes.map((note) => note.id),
			},
			notes: new Map(data.notes.map((note) => [note.id, note] as const)),
			ccLists: new Map(
				data.ccLists
					.map((list) => CCList.deserialize(list))
					.map((list) => [list.type, list] as const),
			),
		};
	},
} as const;

export interface ChannelPatch {
	label?: string;
	instrumentKey?: InstrumentKey;
}

export interface SerializedChannel {
	readonly id: ChannelId;
	readonly label: string;
	readonly instrumentKey: SerializedInstrumentKey;
	readonly notes: readonly Note[];
	readonly ccLists: readonly SerializedCCList[];
	readonly color: SerializedColor;
}

import { KEY_PER_OCTAVE, NUM_KEYS, TICK_PER_MEASURE } from "../../constants.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { getSelectedNotes } from "../../getSelectedNotes.ts";
import type { InstrumentStoreState } from "../../InstrumentStore.ts";
import type { Note } from "../../models/Note.ts";
import type { Song } from "../../models/Song.ts";
import type { PlayerState } from "../../Player/Player.ts";
import type { EditorState } from "../Editor.ts";
import { computeSelectionArea } from "./PianoRoll.ts";
import type { PianoRollState } from "./PianoRollState.ts";

export const HEIGHT_PER_KEY = 16;

export function widthPerMeasure(zoom: number) {
	return 180 * zoom;
}

export function widthPerTick(zoom: number) {
	return widthPerMeasure(zoom) / TICK_PER_MEASURE;
}

export function renderCanvas({
	canvas,
	instrumentStoreState,
	pianoRollState,
	song,
	playerState,
	editorState,
}: {
	canvas: HTMLCanvasElement;
	instrumentStoreState: InstrumentStoreState;
	pianoRollState: PianoRollState;
	song: Song;
	playerState: PlayerState;
	editorState: EditorState;
}) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const totalWidth = pianoRollState.width * devicePixelRatio;
	if (canvas.width !== totalWidth) {
		canvas.width = totalWidth;
	}
	const sideBarWidth = SIDEBAR_WIDTH * devicePixelRatio;
	const tickWidth = widthPerTick(editorState.zoom) * devicePixelRatio;
	const mainWidth = totalWidth - sideBarWidth;

	const totalHeight = pianoRollState.height * devicePixelRatio;
	if (canvas.height !== totalHeight) {
		canvas.height = totalHeight;
	}
	const timelineHeight = TIMELINE_HEIGHT * devicePixelRatio;
	const heightPerKey = HEIGHT_PER_KEY * devicePixelRatio;
	const mainHeight = totalHeight - timelineHeight;

	const scrollTop = editorState.scrollTop * devicePixelRatio;
	const scrollLeft = editorState.scrollLeft * devicePixelRatio;

	const keyFrom = NUM_KEYS - Math.ceil((scrollTop + mainHeight) / heightPerKey);
	const keyTo = NUM_KEYS - Math.floor(scrollTop / heightPerKey);
	const tickFrom = Math.floor(scrollLeft / tickWidth);
	const tickTo = Math.ceil((scrollLeft + mainWidth) / tickWidth);

	const activeChannel = getActiveChannel(song, editorState);
	const noLoopKeys = (() => {
		if (activeChannel === null) return new Set<number>();

		const instrument = instrumentStoreState.get(activeChannel.instrumentKey);
		if (instrument?.status !== "fulfilled") return new Set<number>();

		return instrument.value.noLoopKeys;
	})();

	// region 背景
	addRectPath({ ctx, x0: 0, y0: 0, x1: totalWidth, y1: totalHeight });
	ctx.fillStyle = COLOR_KEY_BACKGROUND;
	ctx.fill();
	// endregion

	if (activeChannel === null) return;

	// region 黒鍵キーの背景
	ctx.beginPath();
	for (let key = 0; key < keyTo; key += KEY_PER_OCTAVE) {
		for (const keyOffset of BLACK_KEY_OFFSETS) {
			if (key + keyOffset < keyFrom) continue;

			const x0 = sideBarWidth;
			const x1 = totalWidth;
			const y0 =
				timelineHeight +
				(NUM_KEYS - (key + keyOffset) - 1) * heightPerKey -
				scrollTop;
			const y1 = y0 + heightPerKey;

			addRectPath({ ctx, x0, y0, x1, y1 });
		}
	}
	ctx.fillStyle = COLOR_KEY_BACKGROUND_BLACK;
	ctx.fill();
	// endregion

	// region キーごとの横罫線
	ctx.beginPath();
	for (let key = keyFrom; key < keyTo; key++) {
		const x0 = 0;
		const x1 = totalWidth;
		const y = timelineHeight + (NUM_KEYS - key) * heightPerKey - scrollTop;
		addLinePath({ ctx, x0, y0: y, x1, y1: y });
	}
	ctx.strokeStyle = COLOR_KEY_BORDER;
	ctx.stroke();
	// endregion

	// region オクターブごとの横罫線
	ctx.beginPath();
	for (
		let key = Math.ceil(keyFrom / KEY_PER_OCTAVE) * KEY_PER_OCTAVE;
		key < keyTo;
		key += KEY_PER_OCTAVE
	) {
		const x0 = 0;
		const x1 = totalWidth;
		const y = timelineHeight + (NUM_KEYS - key) * heightPerKey - scrollTop;
		addLinePath({ ctx, x0, y0: y, x1, y1: y });
	}
	ctx.strokeStyle = COLOR_KEY_BORDER_OCTAVE;
	ctx.stroke();
	// endregion

	// region 拍ごとの縦罫線
	ctx.beginPath();
	for (
		let tick =
			Math.ceil(tickFrom / editorState.timelineGridUnitInTick) *
			editorState.timelineGridUnitInTick;
		tick < tickTo;
		tick += editorState.timelineGridUnitInTick
	) {
		const x = sideBarWidth + tick * tickWidth - scrollLeft;
		const y0 = timelineHeight;
		const y1 = totalHeight;
		addLinePath({ ctx, x0: x, y0, x1: x, y1 });
	}
	ctx.strokeStyle = COLOR_TICK_BORDER;
	ctx.setLineDash([devicePixelRatio, 2 * devicePixelRatio]);
	ctx.stroke();
	ctx.setLineDash([]);
	// endregion

	// region 小節ごとの縦罫線
	ctx.beginPath();
	for (
		let tick = Math.ceil(tickFrom / TICK_PER_MEASURE) * TICK_PER_MEASURE;
		tick < tickTo;
		tick += TICK_PER_MEASURE
	) {
		const x = sideBarWidth + tick * tickWidth - scrollLeft;
		const y0 = timelineHeight;
		const y1 = totalHeight;
		addLinePath({ ctx, x0: x, y0, x1: x, y1 });
	}
	ctx.strokeStyle = COLOR_TICK_BORDER_MEASURE;
	ctx.stroke();
	// endregion

	// region プレビューチャンネルのノート
	for (const channelId of pianoRollState.previewChannelIds) {
		const channel = song.getChannel(channelId);
		if (channel === null) {
			console.warn("Dangling channel ID in previewChannelIds:", channelId);
			continue;
		}

		const instrument = instrumentStoreState.get(channel.instrumentKey);
		const noLoopKeys =
			instrument?.status === "fulfilled"
				? instrument.value.noLoopKeys
				: new Set<number>();

		ctx.beginPath();
		addNotePathAll({
			ctx,
			notes: channel.notes.values(),
			tickWidth,
			scrollLeft,
			timelineHeight,
			sideBarWidth,
			heightPerKey,
			scrollTop,
			keyFrom,
			keyTo,
			tickFrom,
			tickTo,
			noLoopKeys,
		});
		ctx.fillStyle = channel.color.setAlpha(0.3).cssString;
		ctx.fill();
		ctx.strokeStyle = "#000";
		ctx.stroke();
	}
	// endregion

	if (activeChannel !== null) {
		// region ノート
		for (const note of activeChannel.notes.values()) {
			if (
				note.key < keyFrom ||
				keyTo <= note.key ||
				note.tickTo < tickFrom ||
				tickTo <= note.tickFrom
			) {
				continue;
			}

			ctx.beginPath();
			addNotePath({
				ctx,
				note,
				tickWidth,
				scrollLeft,
				sideBarWidth,
				timelineHeight,
				heightPerKey,
				scrollTop,
				noLoopKeys,
			});
			ctx.fillStyle = activeChannel.color.setAlpha(
				note.velocity / 127,
			).cssString;
			ctx.fill();
			ctx.strokeStyle = "#000";
			ctx.stroke();
		}
		// endregion

		// region ホバー中のノート
		for (const noteId of pianoRollState.hoveredNoteIds) {
			const note = activeChannel.notes.get(noteId);
			if (note === undefined) continue;

			if (
				note.key < keyFrom ||
				keyTo <= note.key ||
				note.tickTo < tickFrom ||
				tickTo <= note.tickFrom
			) {
				continue;
			}

			ctx.beginPath();
			addNotePath({
				ctx,
				note,
				tickWidth,
				scrollLeft,
				sideBarWidth,
				timelineHeight,
				heightPerKey,
				scrollTop,
				noLoopKeys,
			});
			ctx.fillStyle = activeChannel.color
				.setL(0.7)
				.setAlpha(note.velocity / 127).cssString;
			ctx.fill();
			ctx.strokeStyle = activeChannel.color.setL(0.2).cssString;
			ctx.stroke();
		}
		// endregion

		// region 選択中のノート
		ctx.beginPath();
		addNotePathAll({
			ctx,
			notes: getSelectedNotes(song, editorState),
			tickWidth,
			scrollLeft,
			sideBarWidth,
			timelineHeight,
			heightPerKey,
			scrollTop,
			keyFrom,
			keyTo,
			tickFrom,
			tickTo,
			noLoopKeys,
		});
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 2 * devicePixelRatio;
		ctx.stroke();
		ctx.strokeStyle = "#fff";
		ctx.lineWidth = devicePixelRatio;
		ctx.stroke();
		// endregion
	}

	// region 範囲選択マーキー
	const marqueeArea = pianoRollState.marqueeArea;
	if (marqueeArea !== null) {
		ctx.beginPath();

		const { keyFrom, keyTo, tickFrom, tickTo } = marqueeArea;
		const x0 = sideBarWidth + tickFrom * tickWidth - scrollLeft;
		const x1 = sideBarWidth + tickTo * tickWidth - scrollLeft;
		const y0 = timelineHeight + (NUM_KEYS - keyFrom) * heightPerKey - scrollTop;
		const y1 = timelineHeight + (NUM_KEYS - keyTo) * heightPerKey - scrollTop;

		addRectPath({ ctx, x0, y0, x1, y1 });

		ctx.fillStyle = "rgba(0, 120, 215, 0.3)";
		ctx.fill();

		ctx.setLineDash([devicePixelRatio, 2 * devicePixelRatio]);

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 2 * devicePixelRatio;
		ctx.stroke();

		ctx.strokeStyle = "#fff";
		ctx.lineWidth = devicePixelRatio;
		ctx.stroke();

		ctx.setLineDash([]);
	}
	// endregion

	// region 選択範囲
	const selectionArea = computeSelectionArea(noLoopKeys, song, editorState);
	if (
		selectionArea !== null &&
		selectionArea.tickTo - selectionArea.tickFrom > 1
	) {
		ctx.beginPath();

		const { keyFrom, keyTo, tickFrom, tickTo } = selectionArea;
		const x0 = sideBarWidth + tickFrom * tickWidth - scrollLeft;
		const x1 = sideBarWidth + tickTo * tickWidth - scrollLeft;
		const y0 = timelineHeight + (NUM_KEYS - keyFrom) * heightPerKey - scrollTop;
		const y1 = timelineHeight + (NUM_KEYS - keyTo) * heightPerKey - scrollTop;

		addRectPath({ ctx, x0, y0, x1, y1 });

		ctx.strokeStyle = "#000";
		ctx.lineWidth = 2 * devicePixelRatio;
		ctx.stroke();

		ctx.strokeStyle = "#fff";
		ctx.lineWidth = devicePixelRatio;
		ctx.stroke();
	}
	// endregion

	// region タイムライン背景
	ctx.beginPath();
	addRectPath({ ctx, x0: 0, y0: 0, x1: totalWidth, y1: timelineHeight });
	ctx.fillStyle = COLOR_TIMELINE_BACKGROUND;
	ctx.fill();
	// endregion

	// region タイムライン小節ごとの縦罫線
	ctx.beginPath();
	for (
		let tick = Math.ceil(tickFrom / TICK_PER_MEASURE) * TICK_PER_MEASURE;
		tick < tickTo;
		tick += TICK_PER_MEASURE
	) {
		const x = sideBarWidth + tick * tickWidth - scrollLeft;
		const y0 = 0;
		const y1 = timelineHeight;
		addLinePath({ ctx, x0: x, y0, x1: x, y1 });
	}
	ctx.strokeStyle = COLOR_TICK_BORDER_MEASURE;
	ctx.stroke();
	// endregion

	// region タイムライン小節番号
	ctx.beginPath();
	ctx.fillStyle = COLOR_TIMELINE_FOREGROUND;
	ctx.textBaseline = "middle";
	ctx.font = `${12 * devicePixelRatio}px monospace`;
	for (
		let tick = Math.floor(tickFrom / TICK_PER_MEASURE) * TICK_PER_MEASURE;
		tick < tickTo;
		tick += TICK_PER_MEASURE
	) {
		const text = (tick / TICK_PER_MEASURE + 1).toString();
		const x =
			sideBarWidth + tick * tickWidth - scrollLeft + 8 * devicePixelRatio;
		const y = timelineHeight / 2;
		ctx.fillText(text, x, y);
	}
	ctx.stroke();
	// endregion

	// region タイムライン下罫線
	ctx.beginPath();
	addLinePath({
		ctx,
		x0: 0,
		y0: timelineHeight,
		x1: totalWidth,
		y1: timelineHeight,
	});
	ctx.strokeStyle = COLOR_TIMELINE_BORDER;
	ctx.stroke();
	// endregion

	// region サイドバー背景
	ctx.beginPath();
	addRectPath({ ctx, x0: 0, y0: 0, x1: sideBarWidth, y1: totalHeight });
	ctx.fillStyle = COLOR_SIDEBAR_BACKGROUND;
	ctx.fill();
	// endregion

	// region サイドバー右罫線
	ctx.beginPath();
	addLinePath({
		ctx,
		x0: sideBarWidth,
		y0: 0,
		x1: sideBarWidth,
		y1: totalHeight,
	});
	ctx.strokeStyle = COLOR_SIDEBAR_BORDER;
	ctx.stroke();
	// endregion

	// region サイドバーオクターブごとの横罫線
	ctx.beginPath();
	for (
		let key = Math.ceil(keyFrom / KEY_PER_OCTAVE) * KEY_PER_OCTAVE;
		key < keyTo;
		key += KEY_PER_OCTAVE
	) {
		const x0 = 0;
		const x1 = sideBarWidth;
		const y = timelineHeight + (NUM_KEYS - key) * heightPerKey - scrollTop;
		addLinePath({ ctx, x0, y0: y, x1, y1: y });
	}
	ctx.strokeStyle = COLOR_SIDEBAR_BORDER;
	ctx.stroke();
	// endregion

	// region サイドバーオクターブ番号
	ctx.beginPath();
	ctx.fillStyle = COLOR_SIDEBAR_FOREGROUND;
	ctx.textBaseline = "middle";
	ctx.font = `${12 * devicePixelRatio}px monospace`;
	for (
		let key = Math.floor(keyFrom / KEY_PER_OCTAVE) * KEY_PER_OCTAVE;
		key < keyTo;
		key += KEY_PER_OCTAVE
	) {
		const text = `C${Math.floor((key - 12) / KEY_PER_OCTAVE)}`;
		const metrics = ctx.measureText(text);
		const x = (sideBarWidth - metrics.width) / 2;
		const y =
			timelineHeight +
			(NUM_KEYS - key) * heightPerKey -
			scrollTop -
			heightPerKey / 2;
		ctx.fillText(text, x, y);
	}
	ctx.stroke();
	// endregion

	// region コーナー背景
	ctx.beginPath();
	addRectPath({ ctx, x0: 0, y0: 0, x1: sideBarWidth, y1: timelineHeight });
	ctx.fillStyle = COLOR_SIDEBAR_BACKGROUND;
	ctx.fill();
	// endregion

	// region コーナー罫線
	ctx.beginPath();
	addLinePath({
		ctx,
		x0: sideBarWidth,
		y0: 0,
		x1: sideBarWidth,
		y1: timelineHeight,
	});
	addLinePath({
		ctx,
		x0: 0,
		y0: timelineHeight,
		x1: sideBarWidth,
		y1: timelineHeight,
	});
	ctx.strokeStyle = COLOR_SIDEBAR_BORDER;
	ctx.stroke();
	// endregion

	// region 再生ヘッド
	if (tickFrom <= playerState.currentTick && playerState.currentTick < tickTo) {
		ctx.beginPath();
		const x = sideBarWidth + playerState.currentTick * tickWidth - scrollLeft;
		const y0 = 0;
		const y1 = totalHeight;
		addLinePath({ ctx, x0: x, y0, x1: x, y1 });
		ctx.strokeStyle = COLOR_PLAYHEAD;
		ctx.stroke();

		ctx.beginPath();
		ctx.moveTo(x - 0.5 - 4, y0 - 0.5);
		ctx.lineTo(x - 0.5 + 4, y0 - 0.5);
		ctx.lineTo(x - 0.5, y0 - 0.5 + 8);
		ctx.closePath();
		ctx.fillStyle = COLOR_PLAYHEAD;
		ctx.fill();
	}
	// endregion
}

function addNotePathAll({
	ctx,
	notes,
	tickWidth,
	scrollLeft,
	sideBarWidth,
	timelineHeight,
	heightPerKey,
	scrollTop,
	keyFrom,
	keyTo,
	tickFrom,
	tickTo,
	noLoopKeys,
}: {
	ctx: CanvasRenderingContext2D;
	notes: Iterable<Note>;
	tickWidth: number;
	scrollLeft: number;
	sideBarWidth: number;
	timelineHeight: number;
	heightPerKey: number;
	scrollTop: number;
	keyFrom: number;
	keyTo: number;
	tickFrom: number;
	tickTo: number;
	noLoopKeys: ReadonlySet<number>;
}) {
	for (const note of notes) {
		if (
			note.key < keyFrom ||
			keyTo <= note.key ||
			note.tickTo < tickFrom ||
			tickTo <= note.tickFrom
		) {
			continue;
		}

		addNotePath({
			ctx,
			note,
			tickWidth,
			scrollLeft,
			sideBarWidth,
			timelineHeight,
			heightPerKey,
			scrollTop,
			noLoopKeys,
		});
	}
}

function addNotePath({
	ctx,
	note,
	tickWidth,
	scrollLeft,
	timelineHeight,
	sideBarWidth,
	heightPerKey,
	scrollTop,
	noLoopKeys,
}: {
	ctx: CanvasRenderingContext2D;
	note: Note;
	tickWidth: number;
	scrollLeft: number;
	timelineHeight: number;
	sideBarWidth: number;
	heightPerKey: number;
	scrollTop: number;
	noLoopKeys: ReadonlySet<number>;
}) {
	if (noLoopKeys.has(note.key)) {
		const x = sideBarWidth + note.tickFrom * tickWidth - scrollLeft;
		const y =
			timelineHeight +
			(NUM_KEYS - note.key - 1) * heightPerKey -
			scrollTop +
			heightPerKey / 2;
		const R = heightPerKey / 2;

		ctx.roundRect(x - R, y - R, R * 2, R * 2, R);
	} else {
		const x0 = sideBarWidth + note.tickFrom * tickWidth - scrollLeft;
		const x1 = sideBarWidth + note.tickTo * tickWidth - scrollLeft;
		const y0 =
			timelineHeight + (NUM_KEYS - note.key - 1) * heightPerKey - scrollTop;
		const y1 = y0 + heightPerKey;

		const R = 2;
		ctx.roundRect(x0, y0, x1 - x0, y1 - y0, R);
	}
}

function addRectPath({
	ctx,
	x0,
	y0,
	x1,
	y1,
}: {
	ctx: CanvasRenderingContext2D;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}) {
	ctx.moveTo(x0 - 0.5, y0 - 0.5);
	ctx.lineTo(x1 - 0.5, y0 - 0.5);
	ctx.lineTo(x1 - 0.5, y1 - 0.5);
	ctx.lineTo(x0 - 0.5, y1 - 0.5);
	ctx.closePath();
}

function addLinePath({
	ctx,
	x0,
	y0,
	x1,
	y1,
}: {
	ctx: CanvasRenderingContext2D;
	x0: number;
	y0: number;
	x1: number;
	y1: number;
}) {
	ctx.moveTo(x0 - 0.5, y0 - 0.5);
	ctx.lineTo(x1 - 0.5, y1 - 0.5);
}

const BLACK_KEY_OFFSETS = [1, 3, 6, 8, 10];

export const TIMELINE_HEIGHT = 24;
export const SIDEBAR_WIDTH = 32;

const style = getComputedStyle(document.body);
const COLOR_TICK_BORDER = style.getPropertyValue("--color-tick-border");
const COLOR_TICK_BORDER_MEASURE = style.getPropertyValue(
	"--color-tick-border-measure",
);
const COLOR_KEY_BORDER = style.getPropertyValue("--color-key-border");
const COLOR_KEY_BORDER_OCTAVE = style.getPropertyValue(
	"--color-key-border-octave",
);
const COLOR_KEY_BACKGROUND = style.getPropertyValue("--color-key-background");
const COLOR_KEY_BACKGROUND_BLACK = style.getPropertyValue(
	"--color-key-background-black",
);

const COLOR_TIMELINE_BACKGROUND = style.getPropertyValue(
	"--color-timeline-background",
);
const COLOR_TIMELINE_BORDER = style.getPropertyValue("--color-timeline-border");
const COLOR_TIMELINE_FOREGROUND = style.getPropertyValue(
	"--color-timeline-foreground",
);

const COLOR_SIDEBAR_BACKGROUND = style.getPropertyValue(
	"--color-sidebar-background",
);
const COLOR_SIDEBAR_BORDER = style.getPropertyValue("--color-sidebar-border");
const COLOR_SIDEBAR_FOREGROUND = style.getPropertyValue(
	"--color-sidebar-foreground",
);

const COLOR_PLAYHEAD = "#f00";

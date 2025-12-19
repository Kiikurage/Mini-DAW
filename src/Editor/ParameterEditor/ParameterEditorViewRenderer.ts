import { TICK_PER_MEASURE } from "../../constants.ts";
import { getActiveChannel } from "../../getActiveChannel.ts";
import { getMarqueeArea } from "../../getMarqueeArea.ts";
import type { Song } from "../../models/Song.ts";
import type { PlayerState } from "../../Player/Player.ts";
import { addLinePath, addRectPath } from "../canvasUtil.ts";
import type { EditorState } from "../Editor.ts";
import type { ParameterEditorState } from "./ParameterEditor.ts";
import type {
	ParameterEditorSampleDelegate,
	ParameterSample,
} from "./ParameterEditorSampleDelegate.ts";

export function widthPerMeasure(zoom: number) {
	return 180 * zoom;
}

export function widthPerTick(zoom: number) {
	return widthPerMeasure(zoom) / TICK_PER_MEASURE;
}

export function renderCanvas({
	canvas,
	parameterEditorState,
	song,
	playerState,
	editorState,
	allSamples,
	selectedSamples,
}: {
	canvas: HTMLCanvasElement;
	parameterEditorState: ParameterEditorState;
	song: Song;
	playerState: PlayerState;
	editorState: EditorState;
	allSamples: Iterable<ParameterSample>;
	selectedSamples: Iterable<ParameterSample>;
}) {
	const ctx = canvas.getContext("2d");
	if (!ctx) return;

	const totalWidth = editorState.width * devicePixelRatio;
	if (canvas.width !== totalWidth) {
		canvas.width = totalWidth;
	}
	const sideBarWidth = SIDEBAR_WIDTH * devicePixelRatio;
	const tickWidth = widthPerTick(editorState.zoom) * devicePixelRatio;
	const mainWidth = totalWidth - sideBarWidth;

	const totalHeight = parameterEditorState.height * devicePixelRatio;
	if (canvas.height !== totalHeight) {
		canvas.height = totalHeight;
	}

	const scrollLeft = editorState.scrollLeft * devicePixelRatio;

	const barWidth = BAR_WIDTH_IN_PIXEL * devicePixelRatio;

	const tickFrom = Math.floor(scrollLeft / tickWidth);
	const tickTo = Math.ceil((scrollLeft + mainWidth) / tickWidth);

	const activeChannel = getActiveChannel(song, editorState);

	// region 背景
	addRectPath({ ctx, x0: 0, y0: 0, x1: totalWidth, y1: totalHeight });
	ctx.fillStyle = COLOR_KEY_BACKGROUND;
	ctx.fill();
	// endregion

	if (activeChannel === null) return;

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
		addLinePath({ ctx, x0: x, y0: 0, x1: x, y1: totalHeight });
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
		addLinePath({ ctx, x0: x, y0: 0, x1: x, y1: totalHeight });
	}
	ctx.strokeStyle = COLOR_TICK_BORDER_MEASURE;
	ctx.stroke();
	// endregion

	// region サンプル
	ctx.beginPath();
	addSamplePathAll({
		ctx,
		samples: allSamples,
		tickWidth,
		scrollLeft,
		sideBarWidth,
		totalHeight,
		barWidth,
		tickFrom,
		tickTo,
	});
	ctx.fillStyle = activeChannel.color.cssString;
	ctx.fill();
	ctx.strokeStyle = "#000";
	ctx.stroke();
	// endregion

	// region 選択中のサンプル
	ctx.beginPath();
	addSamplePathAll({
		ctx,
		samples: selectedSamples,
		tickWidth,
		scrollLeft,
		sideBarWidth,
		totalHeight,
		barWidth,
		tickFrom,
		tickTo,
	});
	ctx.strokeStyle = "#000";
	ctx.lineWidth = 2 * devicePixelRatio;
	ctx.stroke();
	ctx.strokeStyle = "#fff";
	ctx.lineWidth = devicePixelRatio;
	ctx.stroke();
	// endregion

	// region 範囲選択マーキー
	const marqueeArea = getMarqueeArea(
		editorState.marqueeAreaFrom,
		editorState.marqueeAreaTo,
	);
	if (marqueeArea !== null) {
		ctx.beginPath();

		const { tickFrom, tickTo } = marqueeArea;
		const x0 = sideBarWidth + tickFrom * tickWidth - scrollLeft;
		const x1 = sideBarWidth + tickTo * tickWidth - scrollLeft;

		addRectPath({ ctx, x0, y0: 0, x1, y1: totalHeight });

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

	// region 再生ヘッド
	if (tickFrom <= playerState.currentTick && playerState.currentTick < tickTo) {
		ctx.beginPath();
		const x = sideBarWidth + playerState.currentTick * tickWidth - scrollLeft;
		const y0 = 0;
		const y1 = totalHeight;
		addLinePath({ ctx, x0: x, y0, x1: x, y1 });
		ctx.strokeStyle = COLOR_PLAYHEAD;
		ctx.stroke();
	}
	// endregion
}

function addSamplePathAll({
	ctx,
	tickWidth,
	scrollLeft,
	sideBarWidth,
	totalHeight,
	barWidth,
	tickFrom,
	tickTo,
	samples,
}: {
	ctx: CanvasRenderingContext2D;
	tickWidth: number;
	scrollLeft: number;
	sideBarWidth: number;
	totalHeight: number;
	barWidth: number;
	tickFrom: number;
	tickTo: number;
	samples: Iterable<ParameterSample>;
}) {
	for (const sample of samples) {
		addSamplePath({
			ctx,
			tickWidth,
			scrollLeft,
			sideBarWidth,
			totalHeight,
			barWidth,
			tickFrom,
			tickTo,
			sample,
		});
	}
}

function addSamplePath({
	ctx,
	tickWidth,
	scrollLeft,
	sideBarWidth,
	totalHeight,
	barWidth,
	tickFrom,
	tickTo,
	sample,
}: {
	ctx: CanvasRenderingContext2D;
	tickWidth: number;
	scrollLeft: number;
	sideBarWidth: number;
	totalHeight: number;
	barWidth: number;
	tickFrom: number;
	tickTo: number;
	sample: ParameterSample;
}) {
	if (sample.tick < tickFrom || tickTo <= sample.tick) return;

	const x = sideBarWidth + sample.tick * tickWidth - scrollLeft;
	const y1 = totalHeight;
	const y0 = totalHeight * (1 - sample.value / 127);

	ctx.moveTo(x, y1);
	ctx.lineTo(x, y0);
	ctx.lineTo(x + barWidth, y0);
	ctx.lineTo(x + barWidth, y1);
	ctx.closePath();
}

export const SIDEBAR_WIDTH = 32;

const style = getComputedStyle(document.body);
const COLOR_TICK_BORDER = style.getPropertyValue("--color-tick-border");
const COLOR_TICK_BORDER_MEASURE = style.getPropertyValue(
	"--color-tick-border-measure",
);

const COLOR_KEY_BACKGROUND = style.getPropertyValue("--color-key-background");

const COLOR_SIDEBAR_BACKGROUND = style.getPropertyValue("--color-background");
const COLOR_SIDEBAR_BORDER = style.getPropertyValue("--color-border");
const COLOR_PLAYHEAD = "#f00";

const BAR_WIDTH_IN_PIXEL = 8;

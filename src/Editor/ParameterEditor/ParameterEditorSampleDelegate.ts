import { getActiveChannel } from "../../getActiveChannel.ts";
import type { PointerEventManagerInteractionHandle } from "../../PointerEventManager/PointerEventManagerInteractionHandle.ts";
import type { PositionSnapshot } from "../../PointerEventManager/PositionSnapshot.ts";
import type { SongStore } from "../../SongStore.ts";
import type { Editor } from "../Editor.ts";
import type { ParameterType } from "../ParameterType.ts";
import { toParameterEditorPosition } from "./features.ts";
import type { ParameterEditor } from "./ParameterEditor.ts";
import { SIDEBAR_WIDTH, widthPerTick } from "./ParameterEditorViewRenderer.ts";

export abstract class ParameterEditorSampleDelegate {
	/**
	 * ノートおよび選択範囲に対する当たり判定のマージン[px]
	 */
	static readonly HIT_TEST_MARGIN_PIXEL = 8;

	protected constructor(
		public readonly parameterType: ParameterType,
		protected readonly editor: Editor,
		protected readonly parameterEditor: ParameterEditor,
		protected readonly songStore: SongStore,
	) {}

	abstract getAllSamples(): Iterable<ParameterSample>;

	abstract getSelectedSamples(): Iterable<ParameterSample>;

	getBackgroundInteractionHandle?(): PointerEventManagerInteractionHandle | null;

	getSelectionInteractionHandle?(): PointerEventManagerInteractionHandle | null;

	getSampleInteractionHandle?(
		sampleId: number,
	): PointerEventManagerInteractionHandle | null;

	resolveHandle(
		canvasPosition: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null {
		if (canvasPosition.x < SIDEBAR_WIDTH) {
			return null;
		}

		const position = toParameterEditorPosition(
			canvasPosition,
			this.editor.state,
			this.parameterEditor.state,
		);

		const samples = [...this.getAllSamples()];
		const selectedSamples = [...this.getSelectedSamples()];
		const selectedSampleIds = new Set<number>(
			selectedSamples.map((sample) => sample.id),
		);

		const activeChannelId = this.editor.state.activeChannelId;
		if (activeChannelId === null) {
			return this.getBackgroundInteractionHandle?.() ?? null;
		}

		const activeChannel = getActiveChannel(
			this.songStore.state,
			this.editor.state,
		);
		if (activeChannel !== null) {
			// 1. 選択中のサンプル
			for (const sample of samples) {
				if (!selectedSampleIds.has(sample.id)) continue;
				const x = sample.tick * widthPerTick(this.editor.state.zoom);

				if (
					x - ParameterEditorSampleDelegate.HIT_TEST_MARGIN_PIXEL <=
						position.x &&
					position.x < x + ParameterEditorSampleDelegate.HIT_TEST_MARGIN_PIXEL
				) {
					return this.getSelectionInteractionHandle?.() ?? null;
				}
			}

			// 2. その他のサンプル
			for (const sample of samples) {
				if (selectedSampleIds.has(sample.id)) continue;
				const x = sample.tick * widthPerTick(this.editor.state.zoom);

				if (
					x - ParameterEditorSampleDelegate.HIT_TEST_MARGIN_PIXEL <=
						position.x &&
					position.x < x + ParameterEditorSampleDelegate.HIT_TEST_MARGIN_PIXEL
				) {
					return this.getSampleInteractionHandle?.(sample.id) ?? null;
				}
			}
		}

		// 2. 背景
		return this.getBackgroundInteractionHandle?.() ?? null;
	}
}

export interface ParameterSample {
	/**
	 * サンプルID
	 */
	id: number;

	/**
	 * ティック位置
	 */
	tick: number;

	/**
	 * 値[0, 127]
	 */
	value: number;
}

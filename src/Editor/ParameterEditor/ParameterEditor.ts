import { EmptySet } from "../../lib.ts";
import type { PointerEventManagerInteractionHandle } from "../../PointerEventManager/PointerEventManagerInteractionHandle.ts";
import type { PointerEventManagerInteractionHandleResolver } from "../../PointerEventManager/PointerEventManagerInteractionHandleResolver.ts";
import type { PositionSnapshot } from "../../PointerEventManager/PositionSnapshot.ts";
import type { SongStore } from "../../SongStore.ts";
import { Stateful } from "../../Stateful/Stateful.ts";
import type { PutControlChange } from "../../usecases/PutControlChange.ts";
import type { RemoveControlChanges } from "../../usecases/RemoveControlChanges.ts";
import type { SetNoteParameter } from "../../usecases/SetNoteParameter.ts";
import type { Editor } from "../Editor.ts";
import { ControlChangeDelegate } from "./ControlChangeDelegate.ts";
import type {
	ParameterEditorSampleDelegate,
	ParameterSample,
} from "./ParameterEditorSampleDelegate.ts";
import { VelocityDelegate } from "./VelocityDelegate.ts";

export interface ParameterEditorState {
	/**
	 * 高さ [px]
	 */
	readonly height: number;

	/**
	 * 現在のカーソル状態
	 */
	readonly cursor: string;
}

export class ParameterEditor
	extends Stateful<ParameterEditorState>
	implements PointerEventManagerInteractionHandleResolver
{
	private delegate: ParameterEditorSampleDelegate | null = null;

	constructor(
		private readonly editor: Editor,
		private readonly songStore: SongStore,
		private readonly setNoteParameter: SetNoteParameter,
		private readonly putControlChange: PutControlChange,
		private readonly removeControlChange: RemoveControlChanges,
	) {
		super({ height: 0, cursor: "default" });

		this.updateDelegate();
		this.editor.addChangeListener(() => this.updateDelegate());
	}

	setHeight(height: number) {
		this.updateState((state) => {
			if (state.height === height) return state;
			return { ...state, height };
		});
	}

	setCursor(cursor: string) {
		this.updateState((state) => {
			if (state.cursor === cursor) return state;
			return { ...state, cursor };
		});
	}

	getAllSamples(): Iterable<ParameterSample> {
		return this.delegate?.getAllSamples() ?? EmptySet;
	}

	getSelectedSamples(): Iterable<ParameterSample> {
		return this.delegate?.getSelectedSamples() ?? EmptySet;
	}

	updateDelegate() {
		if (this.delegate?.parameterType === this.editor.state.parameterType)
			return;

		switch (this.editor.state.parameterType.type) {
			case "velocity": {
				this.delegate = new VelocityDelegate(
					this.songStore,
					this.editor,
					this,
					this.setNoteParameter,
				);
				break;
			}
			case "controlChange": {
				this.delegate = new ControlChangeDelegate(
					this.editor.state.parameterType,
					this.songStore,
					this.editor,
					this,
					this.putControlChange,
					this.removeControlChange,
				);
				break;
			}
		}
	}

	resolveHandle(
		canvasPosition: PositionSnapshot,
	): PointerEventManagerInteractionHandle | null {
		return this.delegate?.resolveHandle?.(canvasPosition) ?? null;
	}
}

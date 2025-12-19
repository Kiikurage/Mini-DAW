import { useEffect, useRef } from "react";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { addListener } from "../../lib.ts";
import { Player } from "../../Player/Player.ts";
import { PointerEventManager } from "../../PointerEventManager/PointerEventManager.ts";
import { ResizeObserverWrapper } from "../../react/useResizeObserver.ts";
import { SongStore } from "../../SongStore.ts";
import {
	type PutControlChange,
	PutControlChangeKey,
} from "../../usecases/PutControlChange.ts";
import {
	type RemoveControlChanges,
	RemoveControlChangesKey,
} from "../../usecases/RemoveControlChanges.ts";
import {
	type SetNoteParameter,
	SetNoteParameterKey,
} from "../../usecases/SetNoteParameter.ts";
import { Editor } from "../Editor.ts";
import { ControlChangeDelegate } from "./ControlChangeDelegate.ts";
import { ParameterEditor } from "./ParameterEditor.ts";
import { renderCanvas } from "./ParameterEditorViewRenderer.ts";
import { VelocityDelegate } from "./VelocityDelegate.ts";

export function ParameterEditorView({
	songStore,
	player,
	editor,
	setNoteParameter,
	putControlChange,
	removeControlChange,
}: {
	songStore?: SongStore;
	player?: Player;
	editor?: Editor;
	setNoteParameter?: SetNoteParameter;
	putControlChange?: PutControlChange;
	removeControlChange?: RemoveControlChanges;
}) {
	songStore = useComponent(SongStore.Key, songStore);
	player = useComponent(Player.Key, player);
	editor = useComponent(Editor.Key, editor);
	setNoteParameter = useComponent(SetNoteParameterKey, setNoteParameter);
	putControlChange = useComponent(PutControlChangeKey, putControlChange);
	removeControlChange = useComponent(
		RemoveControlChangesKey,
		removeControlChange,
	);

	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas === null) return;

		const parameterEditor = new ParameterEditor(
			editor,
			songStore,
			setNoteParameter,
			putControlChange,
			removeControlChange,
		);

		const pointerEventManager = new PointerEventManager(parameterEditor);

		const render = () => {
			renderCanvas({
				canvas,
				parameterEditorState: parameterEditor.state,
				song: songStore.state,
				playerState: player.state,
				editorState: editor.state,
				allSamples: parameterEditor.getAllSamples(),
				selectedSamples: parameterEditor.getSelectedSamples(),
			});
		};

		const disposables = [
			parameterEditor.addChangeListener((state) => {
				canvas.style.cursor = state.cursor;
			}),
			parameterEditor.addChangeListener(render),
			songStore.addChangeListener(render),
			player.addChangeListener(render),
			editor.addChangeListener(render),
			ResizeObserverWrapper.getInstance().observe(canvas, (entry) => {
				parameterEditor.setHeight(entry.contentRect.height);
			}),
			addListener(canvas, "wheel", (ev) => {
				editor.setScrollLeft(editor.state.scrollLeft + ev.deltaX);
			}),
			addListener(canvas, "pointerdown", (ev) => {
				canvas.setPointerCapture(ev.pointerId);
				pointerEventManager.handlePointerDown(ev);
			}),
			addListener(canvas, "pointermove", pointerEventManager.handlePointerMove),
			addListener(canvas, "pointerup", (ev) => {
				canvas.releasePointerCapture(ev.pointerId);
				pointerEventManager.handlePointerUp(ev);
			}),
			addListener(canvas, "pointercancel", (ev) => {
				canvas.releasePointerCapture(ev.pointerId);
				pointerEventManager.handlePointerUp(ev);
			}),
			addListener(canvas, "dblclick", pointerEventManager.handleDoubleClick),
		];

		render();

		return () => {
			for (const disposable of disposables) {
				disposable();
			}
		};
	}, [
		editor,
		player,
		songStore,
		putControlChange,
		removeControlChange,
		setNoteParameter,
	]);

	return (
		<canvas
			ref={canvasRef}
			css={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				background: "var(--color-key-background)",
			}}
		/>
	);
}

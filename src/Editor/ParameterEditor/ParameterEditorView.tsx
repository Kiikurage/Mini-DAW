import { useEffect, useRef } from "react";
import { PointerEventManager } from "../../CanvasUIController/PointerEventManager.ts";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { addListener } from "../../lib.ts";
import { Player } from "../../Player/Player.ts";
import { ResizeObserverWrapper } from "../../react/useResizeObserver.ts";
import { SongStore } from "../../SongStore.ts";
import {
	type SetNoteParameter,
	SetNoteParameterKey,
} from "../../usecases/SetNoteParameter.ts";
import { Editor } from "../Editor.ts";
import { ParameterEditor } from "./ParameterEditor.ts";
import { renderCanvas } from "./ParameterEditorViewRenderer.ts";

export function ParameterEditorView({
	songStore,
	player,
	editor,
	setNoteParameter,
}: {
	songStore?: SongStore;
	player?: Player;
	editor?: Editor;
	setNoteParameter?: SetNoteParameter;
}) {
	songStore = useComponent(SongStore.Key, songStore);
	player = useComponent(Player.Key, player);
	editor = useComponent(Editor.Key, editor);
	setNoteParameter = useComponent(SetNoteParameterKey, setNoteParameter);

	const canvasRef = useRef<HTMLCanvasElement>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas === null) return;

		const parameterEditor = new ParameterEditor(
			setNoteParameter,
			songStore,
			editor,
		);

		const pointerEventManager = new PointerEventManager(parameterEditor);

		const render = () => {
			renderCanvas({
				canvas,
				parameterEditorState: parameterEditor.state,
				song: songStore.state,
				playerState: player.state,
				editorState: editor.state,
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
			addListener(canvas, "pointerdown", pointerEventManager.handlePointerDown),
			addListener(canvas, "pointermove", pointerEventManager.handlePointerMove),
			addListener(canvas, "pointerup", pointerEventManager.handlePointerUp),
			addListener(canvas, "dblclick", pointerEventManager.handleDoubleClick),
		];

		render();

		return () => {
			for (const disposable of disposables) {
				disposable();
			}
		};
	}, [editor, player, songStore, setNoteParameter]);

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

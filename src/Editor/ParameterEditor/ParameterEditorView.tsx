import { useEffect, useRef } from "react";
import { css } from "../../../styled-system/css";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { FileStore } from "../../FileStore.ts";
import { addListener } from "../../lib.ts";
import { Player } from "../../Player/Player.ts";
import { PointerEventManager } from "../../PointerEventManager/PointerEventManager.ts";
import { ResizeObserverWrapper } from "../../react/useResizeObserver.ts";
import {
	type PutControlChange,
	PutControlChangeKey,
} from "../../usecases/PutControlChange.ts";
import {
	type RemoveControlChanges,
	RemoveControlChangesKey,
} from "../../usecases/RemoveControlChanges.ts";
import {
	type UpdateNotes,
	UpdateNotesKey,
} from "../../usecases/UpdateNotes.ts";
import { Editor } from "../Editor.ts";
import { ParameterEditor } from "./ParameterEditor.ts";
import { renderCanvas } from "./ParameterEditorViewRenderer.ts";

export function ParameterEditorView({
	fileStore,
	player,
	editor,
	updateNotes,
	putControlChange,
	removeControlChange,
}: {
	fileStore?: FileStore;
	player?: Player;
	editor?: Editor;
	updateNotes?: UpdateNotes;
	putControlChange?: PutControlChange;
	removeControlChange?: RemoveControlChanges;
}) {
	fileStore = useComponent(FileStore.Key, fileStore);
	player = useComponent(Player.Key, player);
	editor = useComponent(Editor.Key, editor);
	updateNotes = useComponent(UpdateNotesKey, updateNotes);
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
			fileStore,
			updateNotes,
			putControlChange,
			removeControlChange,
		);

		const pointerEventManager = new PointerEventManager();
		pointerEventManager
			.on("mouseMove", (ev) =>
				parameterEditor.resolveHandle(ev.position)?.handlePointerMove?.(ev),
			)
			.on("pointerDown", (ev) =>
				parameterEditor.resolveHandle(ev.position)?.handlePointerDown?.(ev),
			)
			.on("doubleTap", (ev) =>
				parameterEditor.resolveHandle(ev.position)?.handleDoubleClick?.(ev),
			);

		const render = () => {
			renderCanvas({
				canvas,
				parameterEditorState: parameterEditor.state,
				song: fileStore.state.song,
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
			fileStore.addChangeListener(render),
			player.addChangeListener(render),
			editor.addChangeListener(render),
			ResizeObserverWrapper.getInstance().observe(canvas, (entry) => {
				parameterEditor.setHeight(entry.contentRect.height);
			}),
			addListener(canvas, "wheel", (ev) => {
				editor.setScrollLeft(editor.state.scrollLeft + ev.deltaX);
			}),
			pointerEventManager.install(canvas),
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
		fileStore,
		putControlChange,
		removeControlChange,
		updateNotes,
	]);

	return (
		<canvas
			ref={canvasRef}
			className={css({
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				background: "var(--color-key-background)",
			})}
		/>
	);
}

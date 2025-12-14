import { useEffect, useRef } from "react";
import { PointerEventManager } from "../../CanvasUIController/PointerEventManager.ts";
import { NUM_KEYS } from "../../constants.ts";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { InstrumentStore } from "../../InstrumentStore.ts";
import { addListener } from "../../lib.ts";
import { Player } from "../../Player/Player.ts";
import { ResizeObserverWrapper } from "../../react/useResizeObserver.ts";
import { SongStore } from "../../SongStore.ts";
import {
	type DeleteNotes,
	DeleteNotesKey,
} from "../../usecases/DeleteNotes.ts";
import { type SetNotes, SetNotesKey } from "../../usecases/SetNotes.ts";
import { Editor } from "../Editor.ts";
import { PianoRoll } from "./PianoRoll.ts";
import { HEIGHT_PER_KEY, renderCanvas } from "./PianoRollViewRenderer.ts";

export function PianoRollView({
	instrumentStore,
	songStore,
	player,
	editor,
	setNotes,
	deleteNotes,
}: {
	instrumentStore?: InstrumentStore;
	songStore?: SongStore;
	player?: Player;
	editor?: Editor;
	setNotes?: SetNotes;
	deleteNotes?: DeleteNotes;
}) {
	instrumentStore = useComponent(InstrumentStore.Key, instrumentStore);
	songStore = useComponent(SongStore.Key, songStore);
	player = useComponent(Player.Key, player);
	editor = useComponent(Editor.Key, editor);
	setNotes = useComponent(SetNotesKey, setNotes);
	deleteNotes = useComponent(DeleteNotesKey, deleteNotes);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas === null) return;

		const pianoRoll = new PianoRoll(
			instrumentStore,
			songStore,
			setNotes,
			deleteNotes,
			player,
			editor,
		);

		const pointerEventManager = new PointerEventManager(pianoRoll);

		const render = () => {
			renderCanvas({
				canvas,
				pianoRollState: pianoRoll.state,
				instrumentStoreState: instrumentStore.state,
				song: songStore.state,
				playerState: player.state,
				editorState: editor.state,
			});
		};

		const disposables = [
			pianoRoll.addChangeListener((state) => {
				canvas.style.cursor = state.cursor;
			}),
			pianoRoll.addChangeListener(render),
			instrumentStore.addChangeListener(render),
			songStore.addChangeListener(render),
			player.addChangeListener(render),
			editor.addChangeListener(render),
			ResizeObserverWrapper.getInstance().observe(canvas, (entry) => {
				pianoRoll.setHeight(entry.contentRect.height);
			}),
			addListener(canvas, "wheel", (ev) => {
				editor.setScrollLeft(editor.state.scrollLeft + ev.deltaX);
				pianoRoll.setScrollTop(pianoRoll.state.scrollTop + ev.deltaY);
				if (ev.deltaX !== 0) {
					player.setAutoScrollEnabled(false);
				}
			}),
			addListener(canvas, "pointerdown", pointerEventManager.handlePointerDown),
			addListener(canvas, "pointermove", pointerEventManager.handlePointerMove),
			addListener(canvas, "pointerup", pointerEventManager.handlePointerUp),
			addListener(canvas, "dblclick", pointerEventManager.handleDoubleClick),
		];

		// C4(key=60) を中央に表示する
		pianoRoll.setScrollTop(
			(NUM_KEYS - 60) * HEIGHT_PER_KEY - canvas.clientHeight / 2,
		);

		render();

		return () => {
			for (const disposable of disposables) {
				disposable();
			}
		};
	}, [editor, instrumentStore, player, songStore, deleteNotes, setNotes]);

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

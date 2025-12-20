import { useEffect, useRef } from "react";
import { NUM_KEYS } from "../../constants.ts";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { addListener } from "../../lib.ts";
import { Player } from "../../Player/Player.ts";
import { PointerEventManager } from "../../PointerEventManager/PointerEventManager.ts";
import { ResizeObserverWrapper } from "../../react/useResizeObserver.ts";
import { SongStore } from "../../SongStore.ts";
import { SoundFontStore } from "../../SoundFontStore.ts";
import { type Synthesizer, SynthesizerKey } from "../../Synthesizer.ts";
import {
	type RemoveNotes,
	RemoveNotesKey,
} from "../../usecases/RemoveNotes.ts";
import { type SetNotes, SetNotesKey } from "../../usecases/SetNotes.ts";
import { Editor } from "../Editor.ts";
import { PianoRoll } from "./PianoRoll.ts";
import { PianoRollInteractionHandleResolver } from "./PianoRollInteractionHandleResolver.ts";
import { HEIGHT_PER_KEY, renderCanvas } from "./PianoRollViewRenderer.ts";

export function PianoRollView({
	songStore,
	player,
	editor,
	setNotes,
	removeNotes,
	synthesizer,
	soundFontStore,
}: {
	songStore?: SongStore;
	player?: Player;
	editor?: Editor;
	setNotes?: SetNotes;
	removeNotes?: RemoveNotes;
	synthesizer?: Synthesizer;
	soundFontStore?: SoundFontStore;
}) {
	synthesizer = useComponent(SynthesizerKey, synthesizer);
	soundFontStore = useComponent(SoundFontStore.Key, soundFontStore);
	songStore = useComponent(SongStore.Key, songStore);
	player = useComponent(Player.Key, player);
	editor = useComponent(Editor.Key, editor);
	setNotes = useComponent(SetNotesKey, setNotes);
	removeNotes = useComponent(RemoveNotesKey, removeNotes);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas === null) return;

		const pianoRoll = new PianoRoll(soundFontStore, songStore, editor);

		const pointerEventManager = new PointerEventManager();
		const handleResolver = new PianoRollInteractionHandleResolver(
			synthesizer,
			pianoRoll,
			songStore,
			setNotes,
			removeNotes,
			player,
			editor,
		);
		pointerEventManager
			.on("mouseMove", (ev) =>
				handleResolver.resolveHandle(ev.position)?.handlePointerMove?.(ev),
			)
			.on("pointerDown", (ev) =>
				handleResolver.resolveHandle(ev.position)?.handlePointerDown?.(ev),
			)
			.on("doubleTap", (ev) =>
				handleResolver.resolveHandle(ev.position)?.handleDoubleClick?.(ev),
			)
			.on("gestureStart", (ev) => {
				const startScrollLeft = editor.state.scrollLeft;
				const startScrollTop = pianoRoll.state.scrollTop;
				ev.sessionEvents.on("gestureChange", (ev) => {
					editor.setScrollLeft(startScrollLeft - ev.distance.x);
					pianoRoll.setScrollTop(startScrollTop - ev.distance.y);
				});
			});

		const render = () => {
			renderCanvas({
				canvas,
				pianoRollState: pianoRoll.state,
				pianoRollHoverNotesManagerState: pianoRoll.hoverNotesManager.state,
				song: songStore.state,
				playerState: player.state,
				editorState: editor.state,
				soundFontStoreState: soundFontStore.state,
			});
		};

		const disposables = [
			pianoRoll.addChangeListener((state) => {
				canvas.style.cursor = state.cursor;
			}),
			pianoRoll.addChangeListener(render),
			pianoRoll.hoverNotesManager.addChangeListener(render),
			songStore.addChangeListener(render),
			player.addChangeListener(render),
			editor.addChangeListener(render),
			soundFontStore.addChangeListener(render),
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
			pointerEventManager.install(canvas),
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
	}, [
		synthesizer,
		editor,
		player,
		songStore,
		removeNotes,
		setNotes,
		soundFontStore,
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

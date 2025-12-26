import { useEffect, useRef } from "react";
import { MdContentCopy, MdContentCut, MdDelete } from "react-icons/md";
import { ClipboardManager } from "../../ClipboardManager.ts";
import { computeSelectionArea } from "../../computeSelectionArea.tsx";
import { NUM_KEYS } from "../../constants.ts";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { addListener, EmptySet } from "../../lib.ts";
import { Player } from "../../Player/Player.ts";
import { PointerEventManager } from "../../PointerEventManager/PointerEventManager.ts";
import { IconButton } from "../../react/IconButton.ts";
import {
	BoxShadowStyleBase,
	FlexLayout,
	UIControlStyleBase,
} from "../../react/Styles.ts";
import { ResizeObserverWrapper } from "../../react/useResizeObserver.ts";
import { SongStore } from "../../SongStore.ts";
import { SoundFontStore } from "../../SoundFontStore.ts";
import { useStateful } from "../../Stateful/useStateful.tsx";
import { Synthesizer } from "../../Synthesizer.ts";
import {
	type RemoveNotes,
	RemoveNotesKey,
} from "../../usecases/RemoveNotes.ts";
import { type SetNotes, SetNotesKey } from "../../usecases/SetNotes.ts";
import { Editor } from "../Editor.ts";
import { widthPerTick } from "../ParameterEditor/ParameterEditorViewRenderer.ts";
import { PianoRoll } from "./PianoRoll.ts";
import { PianoRollInteractionHandleResolver } from "./PianoRollInteractionHandleResolver.ts";
import {
	HEIGHT_PER_KEY,
	renderCanvas,
	SIDEBAR_WIDTH,
	TIMELINE_HEIGHT,
} from "./PianoRollViewRenderer.ts";

export function PianoRollView({
	songStore,
	player,
	editor,
	setNotes,
	removeNotes,
	synthesizer,
	soundFontStore,
	clipboard,
}: {
	songStore?: SongStore;
	player?: Player;
	editor?: Editor;
	setNotes?: SetNotes;
	removeNotes?: RemoveNotes;
	synthesizer?: Synthesizer;
	soundFontStore?: SoundFontStore;
	clipboard?: ClipboardManager;
}) {
	synthesizer = useComponent(Synthesizer.Key, synthesizer);
	soundFontStore = useComponent(SoundFontStore.Key, soundFontStore);
	songStore = useComponent(SongStore.Key, songStore);
	player = useComponent(Player.Key, player);
	editor = useComponent(Editor.Key, editor);
	setNotes = useComponent(SetNotesKey, setNotes);
	removeNotes = useComponent(RemoveNotesKey, removeNotes);
	clipboard = useComponent(ClipboardManager.Key, clipboard);

	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const pianoRollRef = useRef<PianoRoll>(null);
	if (pianoRollRef.current == null) {
		pianoRollRef.current = new PianoRoll(soundFontStore, songStore, editor);
	}
	const pianoRoll = pianoRollRef.current;

	useEffect(() => {
		const canvas = canvasRef.current;
		if (canvas === null) return;

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

		// C5(key=72) を中央に表示する
		pianoRoll.setScrollTop(
			(NUM_KEYS - 72) * HEIGHT_PER_KEY - canvas.clientHeight / 2,
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
		pianoRoll,
	]);

	return (
		<div
			css={{
				position: "absolute",
				inset: 0,
				width: "100%",
				height: "100%",
				background: "var(--color-key-background)",
			}}
		>
			<canvas
				ref={canvasRef}
				css={{
					position: "absolute",
					inset: 0,
					width: "100%",
					height: "100%",
				}}
			/>
			<PianoRollSelectionActionPopup
				pianoRoll={pianoRoll}
				editor={editor}
				songStore={songStore}
				clipboard={clipboard}
			/>
		</div>
	);
}

function PianoRollSelectionActionPopup({
	editor,
	songStore,
	pianoRoll,
	clipboard,
}: {
	editor: Editor;
	songStore: SongStore;
	pianoRoll: PianoRoll;
	clipboard: ClipboardManager;
}) {
	const editorState = useStateful(editor);
	const song = useStateful(songStore);
	const pianoRollState = useStateful(pianoRoll);

	const selection = editorState.selection;
	if (selection.type !== "note") return null;
	if (selection.noteIds.size <= 1) return null;
	if (editorState.marqueeAreaFrom !== null) return null;

	const selectionArea = computeSelectionArea(EmptySet, song, editorState);
	if (selectionArea == null) return null;

	const selectionBottom =
		pianoRollState.height -
		((NUM_KEYS - selectionArea.keyTo) * HEIGHT_PER_KEY -
			pianoRollState.scrollTop +
			TIMELINE_HEIGHT) +
		8;
	const selectionRight =
		editorState.width -
		(selectionArea.tickTo * widthPerTick(editorState.zoom) -
			editorState.scrollLeft +
			SIDEBAR_WIDTH) -
		16;

	return (
		<div
			css={[
				BoxShadowStyleBase,
				UIControlStyleBase,
				FlexLayout.row.center.center.gap(8),
				{
					position: "absolute",
					bottom: selectionBottom,
					right: selectionRight,
					minHeight: "unset",
					padding: "4px 8px",
				},
			]}
		>
			<IconButton
				variant="normalInline"
				size="sm"
				onClick={() => {
					console.log("切り取り！");
					clipboard.cut();
				}}
			>
				<MdContentCut size={16} />
			</IconButton>
			<IconButton
				variant="normalInline"
				size="sm"
				onClick={() => {
					clipboard.copy();
				}}
			>
				<MdContentCopy size={16} />
			</IconButton>
			<IconButton variant="normalInline" size="sm">
				<MdDelete
					size={16}
					onClick={() => {
						clipboard.cut();
					}}
				/>
			</IconButton>
		</div>
	);
}

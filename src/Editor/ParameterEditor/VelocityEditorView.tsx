import { memo, type ReactNode } from "react";
import { css } from "../../../styled-system/css";
import type { Color } from "../../Color.ts";
import { NUM_KEYS } from "../../constants.ts";
import { useComponent } from "../../Dependency/DIContainerProvider.tsx";
import { FileStore } from "../../FileStore.ts";
import { getActiveChannel, useActiveChannel } from "../../getActiveChannel.ts";
import { getMarqueeArea } from "../../getMarqueeArea.ts";
import { EmptySet, minmax } from "../../lib.ts";
import type { Note, NoteId } from "../../models/Note.ts";
import { useResizeObserver } from "../../react/useResizeObserver.ts";
import { useStateful } from "../../Stateful/useStateful.tsx";
import {
	type UpdateNotes,
	UpdateNotesKey,
} from "../../usecases/UpdateNotes.ts";
import { Editor, getSelectedNoteIds } from "../Editor.ts";
import type { ParameterEditor } from "./ParameterEditor.ts";
import { widthPerTick } from "./ParameterEditorViewRenderer.ts";
import {
	type DragSessionContext,
	type GestureSessionContext,
	type PointerEventsManager,
	usePointerEvents,
} from "./PointerEventsManager.ts";

export function VelocityEditorView({
	parameterEditor,
	editor,
	fileStore,
}: {
	parameterEditor: ParameterEditor;
	editor?: Editor;
	fileStore?: FileStore;
}) {
	const resizeObserverRef = useResizeObserver((entry) => {
		parameterEditor.setWidth(entry.contentRect.width);
		parameterEditor.setHeight(entry.contentRect.height);
	});
	editor = useComponent(Editor.Key, editor);
	fileStore = useComponent(FileStore.Key, fileStore);

	const scrollLeft = useStateful(editor, (state) => state.scrollLeft);
	const width = useStateful(parameterEditor, (state) => state.width);
	const height = useStateful(parameterEditor, (state) => state.height);

	const ref = usePointerEvents<SVGElement>((manager) => {
		manager
			.onGestureStart((ctx) => scrollBySwipe(editor, ctx))
			.onMouseDown((ctx) => selectByMarquee(editor, fileStore, ctx));
	});

	return (
		// biome-ignore lint/a11y/noSvgWithoutTitle: Not needed
		<svg
			viewBox={`0 0 ${width} ${height}`}
			ref={(e) => {
				resizeObserverRef(e);
				ref.current = e;
			}}
			className={css({
				position: "absolute",
				width: "100%",
				height: "100%",
				inset: 0,
			})}
		>
			<g
				style={{
					transform: `translateX(${-scrollLeft}px)`,
				}}
			>
				<NoteListView parameterEditor={parameterEditor} />
				<SelectedNoteListView parameterEditor={parameterEditor} />
				<MarqueeArea />
			</g>
		</svg>
	);
}

const NoteListView = memo(function NoteListView({
	fileStore,
	editor,
	parameterEditor,
}: {
	fileStore?: FileStore;
	editor?: Editor;
	parameterEditor: ParameterEditor;
}) {
	fileStore = useComponent(FileStore.Key, fileStore);
	editor = useComponent(Editor.Key, editor);

	const activeChannel = useActiveChannel(fileStore, editor);
	const zoom = useStateful(editor, (state) => state.zoom);

	const notes = [...(activeChannel?.notes?.values() ?? [])];

	return (
		<g>
			{[...notes].map((note) => (
				<NoteView
					key={note.id}
					note={note}
					color={activeChannel?.metadata?.color ?? null}
					zoom={zoom}
					parameterEditor={parameterEditor}
				/>
			))}
		</g>
	);
});

const SelectedNoteListView = memo(function SelectedNoteListView({
	fileStore,
	editor,
	parameterEditor,
}: {
	fileStore?: FileStore;
	editor?: Editor;
	parameterEditor: ParameterEditor;
}) {
	fileStore = useComponent(FileStore.Key, fileStore);
	editor = useComponent(Editor.Key, editor);

	const zoom = useStateful(editor, (state) => state.zoom);
	const selectedNoteIds = useStateful(editor, (state) =>
		getSelectedNoteIds(state),
	);
	const activeChannel = useActiveChannel(fileStore, editor);

	const selectedNotes = [...(activeChannel?.notes?.values() ?? [])].filter(
		(note) => selectedNoteIds.has(note.id),
	);

	return (
		<g>
			{[...selectedNotes].map((note) => (
				<SelectedNoteView
					key={note.id}
					note={note}
					zoom={zoom}
					parameterEditor={parameterEditor}
				/>
			))}
		</g>
	);
});

const NoteView = memo(function NoteView({
	note,
	color,
	zoom,
	editor,
	parameterEditor,
	updateNotes,
}: {
	note: Note;
	color: Color | null;
	zoom: number;
	editor?: Editor;
	updateNotes?: UpdateNotes;
	parameterEditor: ParameterEditor;
}) {
	editor = useComponent(Editor.Key, editor);
	updateNotes = useComponent(UpdateNotesKey, updateNotes);

	const x0 = Math.round(note.tickFrom * widthPerTick(zoom)) - 0.5;
	const x1 = Math.round(note.tickTo * widthPerTick(zoom)) + 0.5;
	const y = `${(1 - note.velocity / 127) * 100}%`;
	const height = `${(note.velocity / 127) * 100}%`;
	const width = x1 - x0;

	const bodyRef = usePointerEvents<SVGRectElement>((manager) => {
		selectByClick(manager, editor, note.id);
	});

	const handleRef = usePointerEvents<SVGRectElement>((manager) => {
		selectByClick(manager, editor, note.id);
		manager.onMouseDown((ctx) => {
			updateVelocity(editor, parameterEditor, updateNotes, ctx);
		});
	});

	return (
		<g style={{ transform: `translate(${x0}px, ${y})` }}>
			<rect
				x={0}
				y={0}
				width={width}
				height={2}
				fill={color?.cssString ?? "#fff"}
				stroke="none"
			/>
			<rect
				x={0}
				y={0}
				width={width}
				height={height}
				fill={color?.setAlpha(0.1)?.cssString ?? "none"}
				stroke="#000"
				strokeWidth={1}
				ref={bodyRef}
			/>
			<rect
				x={0 - HANDLE_R}
				y={-HANDLE_R}
				width={width + HANDLE_R * 2}
				height={HANDLE_R * 2}
				fill="transparent"
				stroke="none"
				ref={handleRef}
				className={css({
					pointerEvents: "all",
					cursor: "ns-resize",
				})}
			/>
		</g>
	);
});

const SelectedNoteView = memo(function SelectedNoteView({
	note,
	zoom,
	parameterEditor,
	editor,
	updateNotes,
}: {
	note: Note;
	zoom: number;
	parameterEditor: ParameterEditor;
	editor?: Editor;
	updateNotes?: UpdateNotes;
}) {
	editor = useComponent(Editor.Key, editor);
	updateNotes = useComponent(UpdateNotesKey, updateNotes);

	const x0 = Math.round(note.tickFrom * widthPerTick(zoom)) - 0.5;
	const x1 = Math.round(note.tickTo * widthPerTick(zoom)) + 0.5;
	const y = `${(1 - note.velocity / 127) * 100}%`;
	const height = `${(note.velocity / 127) * 100}%`;
	const width = x1 - x0;

	const bodyRef = usePointerEvents<SVGRectElement>((manager) => {
		selectByClick(manager, editor, note.id);
	});

	const handleRef = usePointerEvents<SVGRectElement>((manager) => {
		manager.onMouseDown((ctx) => {
			updateVelocity(editor, parameterEditor, updateNotes, ctx);
		});
	});

	return (
		<g style={{ transform: `translate(${x0}px, ${y})` }}>
			<rect
				x={0}
				y={0}
				width={width}
				height={height}
				fill="none"
				stroke="#fff"
				strokeWidth={1}
				ref={bodyRef}
			/>
			<rect
				x={0 - HANDLE_R}
				y={-HANDLE_R}
				width={width + HANDLE_R * 2}
				height={HANDLE_R * 2}
				fill="transparent"
				stroke="none"
				ref={handleRef}
				cursor="ns-resize"
			/>
		</g>
	);
});

const MarqueeArea = memo(function renderMarqueeArea({
	editor,
}: {
	editor?: Editor;
}): ReactNode {
	editor = useComponent(Editor.Key, editor);

	const marqueeAreaFrom = useStateful(editor, (state) => state.marqueeAreaFrom);
	const marqueeAreaTo = useStateful(editor, (state) => state.marqueeAreaTo);
	const zoom = useStateful(editor, (state) => state.zoom);
	const marqueeArea = getMarqueeArea(marqueeAreaFrom, marqueeAreaTo);

	const x0 = (marqueeArea?.tickFrom ?? 0) * widthPerTick(zoom);
	const x1 = (marqueeArea?.tickTo ?? 0) * widthPerTick(zoom);

	return (
		<rect
			visibility={marqueeArea === null ? "hidden" : "visible"}
			x={x0}
			y={0}
			width={x1 - x0}
			height="100%"
			fill="rgba(0, 120, 215, 0.3)"
			stroke="#fff"
			strokeWidth={1}
			strokeDasharray="1 2"
		/>
	);
});

const HANDLE_R = 8;

function scrollBySwipe(editor: Editor, ctx: GestureSessionContext<SVGElement>) {
	const initialScrollLeft = editor.state.scrollLeft;
	ctx.onGestureMove(() => {
		editor.setScrollLeft(
			initialScrollLeft - (ctx.currentPosition.x - ctx.startPosition.x),
		);
	});
}

function selectByMarquee(
	editor: Editor,
	fileStore: FileStore,
	ctx: DragSessionContext<SVGElement>,
) {
	if (!ctx.metaKey && !ctx.ctrlKey) {
		editor.clearSelection();
	}

	let originalSelectedNoteIds: ReadonlySet<NoteId> = EmptySet;
	ctx
		.onDragStart(() => {
			originalSelectedNoteIds = getSelectedNoteIds(editor.state);
			const bcr = ctx.element.getBoundingClientRect();
			const x = ctx.currentPosition.x - bcr.left + editor.state.scrollLeft;
			const tick = x / widthPerTick(editor.state.zoom);

			editor.startMarqueeSelection({ key: 0, tick });
		})
		.onDragMove(() => {
			const bcr = ctx.element.getBoundingClientRect();
			const x = ctx.currentPosition.x - bcr.left + editor.state.scrollLeft;
			const tick = x / widthPerTick(editor.state.zoom);

			editor.setMarqueeAreaTo({ key: NUM_KEYS, tick });

			const area = getMarqueeArea(
				editor.state.marqueeAreaFrom,
				editor.state.marqueeAreaTo,
			);
			if (area === null) return;

			const activeChannel = getActiveChannel(
				fileStore.state.song,
				editor.state,
			);
			if (activeChannel === null) return;

			editor.setSelectedNotes([
				...originalSelectedNoteIds,
				...activeChannel.notes
					.values()
					.filter(
						(note) =>
							note.tickFrom < area.tickTo && note.tickTo > area.tickFrom,
					)
					.map((note) => note.id),
			]);
		})
		.onDragEnd(() => {
			originalSelectedNoteIds = EmptySet;
			editor.stopMarqueeSelection();
		});
}

function selectByClick(
	manager: PointerEventsManager<SVGRectElement>,
	editor: Editor,
	noteId: NoteId,
) {
	manager.onMouseDown((ctx) => {
		ctx.stopPropagation();
		if (ctx.metaKey || ctx.ctrlKey) {
			if (getSelectedNoteIds(editor.state).has(noteId)) {
				ctx.onTap(() => {
					editor.removeNotesFromSelection([noteId]);
				});
			} else {
				editor.putNotesToSelection([noteId]);
			}
		} else {
			editor.clearSelection();
			editor.putNotesToSelection([noteId]);
		}
	});
}

function updateVelocity(
	editor: Editor,
	parameterEditor: ParameterEditor,
	updateNotes: UpdateNotes,
	ctx: DragSessionContext<SVGElement>,
) {
	const svg = ctx.element.ownerSVGElement;
	if (svg === null) return;

	ctx.stopPropagation();
	ctx.onDragMove(() => {
		const activeChannelId = editor.state.activeChannelId;
		if (activeChannelId === null) return;

		const bcr = svg.getBoundingClientRect();
		const y = ctx.currentPosition.y - bcr.top;

		const height = parameterEditor.state.height;
		const velocity = minmax(0, 127, 127 * (1 - y / height));

		const selectedNoteIds = getSelectedNoteIds(editor.state);
		updateNotes(
			activeChannelId,
			[...selectedNoteIds].map((id) => ({ id, velocity })),
			false,
		);
	});
}

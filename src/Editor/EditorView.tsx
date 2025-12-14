import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { useResizeObserver } from "../react/useResizeObserver.ts";
import { Editor } from "./Editor.ts";
import { ParameterEditorView } from "./ParameterEditor/ParameterEditorView.tsx";
import { PianoRollView } from "./PianoRoll/PianoRollView.tsx";

export function EditorView({ editor }: { editor?: Editor }) {
	editor = useComponent(Editor.Key, editor);

	const resizeObserverRef = useResizeObserver((entry) => {
		editor.setWidth(entry.contentRect.width);
	});

	return (
		<div
			ref={(e) => {
				resizeObserverRef(e);
			}}
			css={{
				position: "absolute",
				inset: 0,
				display: "flex",
				flexDirection: "column",
			}}
		>
			<div
				css={{
					position: "relative",
					flex: "1 1 0",
				}}
			>
				<PianoRollView />
			</div>
			<div
				css={{
					position: "relative",
					background: "var(--color-background)",
					flex: "0 0 12px",
					borderTop: "1px solid var(--color-border)",
					borderBottom: "1px solid var(--color-border)",
				}}
			/>
			<div
				css={{
					position: "relative",
					flex: "0 0 200px",
				}}
			>
				<ParameterEditorView />
			</div>
		</div>
	);
}

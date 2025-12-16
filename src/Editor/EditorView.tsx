import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { Select } from "../react/Select/Select.tsx";
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
					display: "flex",
					flexDirection: "row",
					alignItems: "baseline",
					justifyContent: "flex-start",
					gap: 16,
					padding: "4px 8px",
				}}
			>
				<Select value="velocity">
					<Select.Option value="velocity">velocity</Select.Option>
					<Select.Option value="pitch bend">pitch bend</Select.Option>
					<Select.Option value="modulation">modulation</Select.Option>
					<Select.Option value="vibrate">vibrate</Select.Option>
					<Select.Option value="pan">pan</Select.Option>
				</Select>
			</div>
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

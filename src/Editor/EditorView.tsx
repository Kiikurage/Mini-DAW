import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { InstrumentStore } from "../InstrumentStore.ts";
import { Player } from "../Player/Player.ts";
import { useResizeObserver } from "../react/useResizeObserver.ts";
import { SongStore } from "../SongStore.ts";
import { Editor } from "./Editor.ts";
import { ParameterEditor } from "./ParameterEditor/ParameterEditor.ts";
import { ParameterEditorView } from "./ParameterEditor/ParameterEditorView.tsx";
import { PianoRoll } from "./PianoRoll/PianoRoll.ts";
import { PianoRollView } from "./PianoRoll/PianoRollView.tsx";

export function EditorView({ editor }: { editor: Editor }) {
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
				<PianoRollView
					pianoRoll={useComponent(PianoRoll.Key)}
					instrumentStore={useComponent(InstrumentStore.Key)}
					songStore={useComponent(SongStore.Key)}
					player={useComponent(Player.Key)}
					editor={useComponent(Editor.Key)}
				/>
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
				<ParameterEditorView
					parameterEditor={useComponent(ParameterEditor.Key)}
					player={useComponent(Player.Key)}
					songStore={useComponent(SongStore.Key)}
					editor={useComponent(Editor.Key)}
				/>
			</div>
		</div>
	);
}

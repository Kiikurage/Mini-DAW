import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { ChannelListView } from "../ChannelList/ChannelListView.tsx";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { useResizeObserver } from "../react/useResizeObserver.ts";
import { Splitter } from "../Splitter/Splitter.tsx";
import { StatusBarView } from "../StatusBar/StatusBarView.tsx";
import { ToolBar } from "../ToolBar/ToolBar.tsx";
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
			className={cx(
				flex({ direction: "column", align: "stretch", justify: "stretch" }),
				css({ position: "absolute", inset: 0 }),
			)}
		>
			<ToolBar />

			<div className={css({ position: "relative", flex: "1 1 0" })}>
				<Splitter direction="row">
					<Splitter.Area defaultSize={240}>
						<ChannelListView />
					</Splitter.Area>
					<Splitter.Area flex>
						<div
							ref={resizeObserverRef}
							className={css({
								position: "absolute",
								inset: 0,
							})}
						>
							<Splitter>
								<Splitter.Area flex>
									<PianoRollView />
								</Splitter.Area>
								<Splitter.Area defaultSize={200}>
									<ParameterEditorView />
								</Splitter.Area>
							</Splitter>
						</div>
					</Splitter.Area>
				</Splitter>
			</div>

			<StatusBarView />
		</div>
	);
}

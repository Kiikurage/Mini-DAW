import { useEffect } from "react";
import { ChannelListView } from "../ChannelList/ChannelListView.tsx";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { EditorView } from "../Editor/EditorView.tsx";
import { GlobalMenuBar } from "../GlobalMenuBar.tsx";
import { KeyboardHandler } from "../KeyboardHandler.ts";
import { OverlayPortal } from "../react/OverlayPortal.ts";
import { Splitter } from "../Splitter/Splitter.tsx";
import { StatusBarView } from "../StatusBar/StatusBarView.tsx";
import { ToolBar } from "../ToolBar/ToolBar.tsx";
import {
	type InitializeApp,
	InitializeAppKey,
} from "../usecases/initializeApp.ts";

export function AppView({
	keyboard,
	overlayPortal,
	initializeApp,
}: {
	keyboard?: KeyboardHandler;
	overlayPortal?: OverlayPortal;
	initializeApp?: InitializeApp;
}) {
	keyboard = useComponent(KeyboardHandler.Key, keyboard);
	overlayPortal = useComponent(OverlayPortal.Key, overlayPortal);
	initializeApp = useComponent(InitializeAppKey, initializeApp);

	useEffect(() => {
		initializeApp();
	}, [initializeApp]);

	useEffect(() => {
		const handleKeyDown = (ev: KeyboardEvent) => {
			const handled = keyboard.handleKeyDown(ev);
			if (handled) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		window.addEventListener("keydown", handleKeyDown, { capture: true });
		return () => {
			window.removeEventListener("keydown", handleKeyDown, { capture: true });
		};
	}, [keyboard]);

	return (
		<div
			css={{
				position: "fixed",
				inset: 0,
				display: "grid",
				gridTemplate: `
				"GlobalMenuBar" min-content
				"ToolBar" min-content
				"Main " 1fr
				"StatusBar" min-content / 1fr;
			`.trim(),
			}}
		>
			<div
				css={{
					gridArea: "GlobalMenuBar",
					position: "relative",
				}}
			>
				<GlobalMenuBar />
			</div>

			<div css={{ gridArea: "ToolBar" }}>
				<ToolBar />
			</div>

			<div css={{ gridArea: "Main", position: "relative" }}>
				<Splitter direction="row">
					<Splitter.Area defaultSize={240}>
						<ChannelListView />
					</Splitter.Area>
					<Splitter.Area flex>
						<EditorView />
					</Splitter.Area>
				</Splitter>
			</div>

			<footer css={{ gridArea: "StatusBar" }}>
				<StatusBarView />
			</footer>

			<overlayPortal.Portal />
		</div>
	);
}

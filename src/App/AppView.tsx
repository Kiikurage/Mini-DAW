import { useEffect } from "react";
import { ChannelListView } from "../ChannelList/ChannelListView.tsx";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { EditorView } from "../Editor/EditorView.tsx";
import { GlobalMenuBar } from "../GlobalMenuBar.tsx";
import { KeyboardHandler } from "../KeyboardHandler.ts";
import { OverlayPortal } from "../react/OverlayPortal.ts";
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
				"GlobalMenuBar GlobalMenuBar" min-content
				"ToolBar ToolBar" min-content
				"SidePane Editor " 1fr
				"StatusBar StatusBar" min-content / min-content 1fr min-content;
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

			<div
				css={{
					gridArea: "Editor",
					position: "relative",
					display: "flex",
					flexDirection: "column",
					alignItems: "stretch",
					justifyContent: "stretch",
				}}
			>
				<EditorView />
			</div>

			<div
				css={{
					gridArea: "SidePane",
					backgroundColor: "var(--color-sidepanel-background)",
					borderRight: "1px solid var(--color-sidepanel-border)",
					color: "var(--color-sidepanel-foreground)",
					boxSizing: "border-box",
					width: 240,
					position: "relative",
				}}
			>
				<ChannelListView />
			</div>

			<footer
				css={{
					gridArea: "StatusBar",
				}}
			>
				<StatusBarView />
			</footer>

			<overlayPortal.Portal />
		</div>
	);
}

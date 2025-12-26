import { useEffect } from "react";
import { AutoSaveService } from "../AutoSaveService/AutoSaveService.ts";
import { ChannelListView } from "../ChannelList/ChannelListView.tsx";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { EditorView } from "../Editor/EditorView.tsx";
import { GlobalMenuBar } from "../GlobalMenuBar.tsx";
import { KeyboardHandler } from "../KeyboardHandler.tsx";
import { addListener } from "../lib.ts";
import { OverlayPortal } from "../react/OverlayPortal.ts";
import { loadLastFileLocation } from "../SongStore.ts";
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
	autoSaveService,
}: {
	keyboard?: KeyboardHandler;
	overlayPortal?: OverlayPortal;
	initializeApp?: InitializeApp;
	autoSaveService?: AutoSaveService;
}) {
	keyboard = useComponent(KeyboardHandler.Key, keyboard);
	overlayPortal = useComponent(OverlayPortal.Key, overlayPortal);
	initializeApp = useComponent(InitializeAppKey, initializeApp);
	autoSaveService = useComponent(AutoSaveService.Key, autoSaveService);

	useEffect(() => {
		const location = loadLastFileLocation();
		initializeApp();
		if (location !== null && location.type !== "newFile") {
			if (confirm("前回の編集ファイルを開きますか？")) {
				autoSaveService.open(location);
				return;
			} else {
			}
		}
	}, [initializeApp, autoSaveService]);

	useEffect(() => {
		const handleKeyDownCapture = (ev: KeyboardEvent) => {
			const handled = keyboard.handleKeyDownCapture(ev);
			if (handled) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		};
		const handleKeyDown = (ev: KeyboardEvent) => {
			const handled = keyboard.handleKeyDown(ev);
			if (handled) {
				ev.preventDefault();
				ev.stopPropagation();
			}
		};

		const cleanUps = [
			addListener(window, "keydown", handleKeyDownCapture, { capture: true }),
			addListener(window, "keydown", handleKeyDown, { capture: false }),
		];
		return () => {
			for (const cleanUp of cleanUps) {
				cleanUp();
			}
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

import { useEffect } from "react";
import { AudioContextKey } from "../AudioContextHolder.ts";
import { ChannelListView } from "../ChannelList/ChannelListView.tsx";
import { ContextMenuManager } from "../ContextMenu/ContextMenuManager.tsx";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { Editor } from "../Editor/Editor.ts";
import { EditorView } from "../Editor/EditorView.tsx";
import { PianoRoll } from "../Editor/PianoRoll/PianoRoll.ts";
import { GlobalMenuBar } from "../GlobalMenuBar.tsx";
import { InstrumentStore } from "../InstrumentStore.ts";
import { KeyboardHandler } from "../KeyboardHandler.ts";
import { Player } from "../Player/Player.ts";
import { OverlayPortal } from "../react/OverlayPortal.ts";
import { SongStore } from "../SongStore.ts";
import { SoundFontStore } from "../SoundFontStore.ts";
import { StatusBar } from "../StatusBar/StatusBar.tsx";
import { StatusBarView } from "../StatusBar/StatusBarView.tsx";
import { ToolBar } from "../ToolBar/ToolBar.tsx";
import { AddChannelKey } from "../usecases/AddChannel.ts";
import { DeleteChannelKey } from "../usecases/DeleteChannel.ts";
import { InitializeAppKey } from "../usecases/initializeApp.ts";
import { LoadFileKey } from "../usecases/LoadFile.ts";
import { NewFileKey } from "../usecases/NewFile.ts";
import { SaveFileKey } from "../usecases/SaveFile.ts";
import { UpdateChannelKey } from "../usecases/UpdateChannel.ts";
import { UpdateSongKey } from "../usecases/UpdateSong.ts";

export function AppView() {
	const keyboard = useComponent(KeyboardHandler.Key);
	const overlayPortal = useComponent(OverlayPortal.Key);

	const initializeApp = useComponent(InitializeAppKey);
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
				<GlobalMenuBar
					newFile={useComponent(NewFileKey)}
					saveFile={useComponent(SaveFileKey)}
					loadFile={useComponent(LoadFileKey)}
				/>
			</div>

			<div css={{ gridArea: "ToolBar" }}>
				<ToolBar
					player={useComponent(Player.Key)}
					songStore={useComponent(SongStore.Key)}
					updateSong={useComponent(UpdateSongKey)}
					instrumentStore={useComponent(InstrumentStore.Key)}
					editor={useComponent(Editor.Key)}
					audioContext={useComponent(AudioContextKey)}
					soundFontStore={useComponent(SoundFontStore.Key)}
					updateChannel={useComponent(UpdateChannelKey)}
					overlayPortal={useComponent(OverlayPortal.Key)}
				/>
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
				<EditorView editor={useComponent(Editor.Key)} />
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
				<ChannelListView
					songStore={useComponent(SongStore.Key)}
					pianoRoll={useComponent(PianoRoll.Key)}
					addChannel={useComponent(AddChannelKey)}
					updateChannel={useComponent(UpdateChannelKey)}
					deleteChannel={useComponent(DeleteChannelKey)}
					instrumentStore={useComponent(InstrumentStore.Key)}
					contextMenu={useComponent(ContextMenuManager.Key)}
					overlayPortal={useComponent(OverlayPortal.Key)}
					soundFontStore={useComponent(SoundFontStore.Key)}
					editor={useComponent(Editor.Key)}
					player={useComponent(Player.Key)}
				/>
			</div>

			<footer
				css={{
					gridArea: "StatusBar",
				}}
			>
				<StatusBarView
					pianoRoll={useComponent(PianoRoll.Key)}
					songStore={useComponent(SongStore.Key)}
					statusBar={useComponent(StatusBar.Key)}
					updateSong={useComponent(UpdateSongKey)}
					player={useComponent(Player.Key)}
					editor={useComponent(Editor.Key)}
				/>
			</footer>

			<overlayPortal.Portal />
		</div>
	);
}

import { AudioContextKey } from "./AudioContext.ts";
import { AutoSaveService } from "./AutoSaveService.ts";
import { ClipboardManager } from "./ClipboardManager.ts";
import { ContextMenuManager } from "./ContextMenu/ContextMenuManager.tsx";
import { DIContainer } from "./Dependency/DIContainer.ts";
import { EditHistoryManager } from "./EditHistory/EditHistoryManager.ts";
import { Editor } from "./Editor/Editor.ts";
import { EventBus } from "./EventBus.ts";
import { FileStore } from "./FileStore.ts";
import { GoogleAPIClient } from "./GoogleDriveAPI/GoogleAPIClient.ts";
import { KeyboardHandler } from "./KeyboardHandler.tsx";
import { Player } from "./Player/Player.ts";
import { RecentFileService } from "./RecentFileService.ts";
import { OverlayPortal } from "./react/OverlayPortal.ts";
import { SoundFontStore } from "./SoundFontStore.ts";
import { StatusBar } from "./StatusBar/StatusBar.tsx";
import { Synthesizer } from "./Synthesizer.ts";
import { AddChannel, AddChannelKey } from "./usecases/AddChannel.ts";
import { InitializeApp, InitializeAppKey } from "./usecases/initializeApp.ts";
import { MoveNotes, MoveNotesKey } from "./usecases/MoveNotes.ts";
import { NewFile, NewFileKey } from "./usecases/NewFile.ts";
import { OpenFile, OpenFileKey } from "./usecases/OpenFile.ts";
import { PutCCs, PutCCsKey } from "./usecases/PutCCs.ts";
import { PutFile, PutFileKey } from "./usecases/PutFile.ts";
import { PutNotes, PutNotesKey } from "./usecases/PutNotes.ts";
import { RemoveCCs, RemoveCCsKey } from "./usecases/RemoveCCs.ts";
import { RemoveChannel, RemoveChannelKey } from "./usecases/RemoveChannel.ts";
import { RemoveNotes, RemoveNotesKey } from "./usecases/RemoveNotes.ts";
import { SaveFile, SaveFileKey } from "./usecases/SaveFile.ts";
import { UpdateCCs, UpdateCCsKey } from "./usecases/UpdateCCs.ts";
import { UpdateChannel, UpdateChannelKey } from "./usecases/UpdateChannel.ts";
import { UpdateNotes, UpdateNotesKey } from "./usecases/UpdateNotes.ts";
import { UpdateSong, UpdateSongKey } from "./usecases/UpdateSong.ts";

export function configureDeps() {
	return (
		new DIContainer()
			.set(AudioContextKey, () => {
				return new AudioContext();
			})
			.set(Editor.Key, (deps) => {
				return new Editor(
					deps.get(FileStore.Key),
					deps.get(Player.Key),
					deps.get(EventBus.Key),
					deps.get(RemoveNotesKey),
					deps.get(MoveNotesKey),
					deps.get(RemoveCCsKey),
				);
			})
			.set(EventBus.Key, () => {
				return new EventBus();
			})
			.set(EditHistoryManager.Key, () => {
				return new EditHistoryManager();
			})
			.set(FileStore.Key, (deps) => {
				return new FileStore(deps.get(EventBus.Key));
			})
			.set(SoundFontStore.Key, () => {
				return new SoundFontStore();
			})
			.set(StatusBar.Key, () => {
				return new StatusBar();
			})
			.set(Synthesizer.Key, (deps) => {
				return new Synthesizer(deps.get(AudioContextKey));
			})
			.set(Player.Key, (deps) => {
				return new Player(
					deps.get(AudioContextKey),
					deps.get(FileStore.Key),
					deps.get(Synthesizer.Key),
					deps.get(EventBus.Key),
				);
			})
			.set(OverlayPortal.Key, () => {
				return new OverlayPortal();
			})
			.set(ClipboardManager.Key, (deps) => {
				return new ClipboardManager(
					deps.get(FileStore.Key),
					deps.get(Player.Key),
					deps.get(Editor.Key),
					deps.get(PutNotesKey),
					deps.get(RemoveNotesKey),
				);
			})
			.set(ContextMenuManager.Key, (deps) => {
				return new ContextMenuManager(deps.get(OverlayPortal.Key));
			})
			.set(KeyboardHandler.Key, (deps) => {
				return new KeyboardHandler(
					deps.get(FileStore.Key),
					deps.get(EditHistoryManager.Key),
					deps.get(ClipboardManager.Key),
					deps.get(Player.Key),
					deps.get(Editor.Key),
					deps.get(OverlayPortal.Key),
					deps.get(SaveFileKey),
				);
			})
			.set(GoogleAPIClient.Key, (_deps) => {
				return new GoogleAPIClient();
			})
			.set(RecentFileService.Key, (deps) => {
				return new RecentFileService(deps.get(EventBus.Key));
			})
			.set(AutoSaveService.Key, (deps) => {
				return new AutoSaveService(
					deps.get(FileStore.Key),
					deps.get(SaveFileKey),
					deps.get(EventBus.Key),
				);
			})

			// UseCases - Song
			.set(UpdateSongKey, (deps) => {
				return UpdateSong(deps.get(EventBus.Key));
			})

			// UseCases - Channel
			.set(AddChannelKey, (deps) => {
				return AddChannel({
					history: deps.get(EditHistoryManager.Key),
					bus: deps.get(EventBus.Key),
					editor: deps.get(Editor.Key),
				});
			})
			.set(UpdateChannelKey, (deps) => {
				return UpdateChannel({
					bus: deps.get(EventBus.Key),
					history: deps.get(EditHistoryManager.Key),
					fileStore: deps.get(FileStore.Key),
				});
			})
			.set(RemoveChannelKey, (deps) => {
				return RemoveChannel({
					history: deps.get(EditHistoryManager.Key),
					fileStore: deps.get(FileStore.Key),
					bus: deps.get(EventBus.Key),
				});
			})

			// UseCases - Note
			.set(PutNotesKey, (deps) => {
				return PutNotes({
					fileStore: deps.get(FileStore.Key),
					history: deps.get(EditHistoryManager.Key),
					bus: deps.get(EventBus.Key),
				});
			})
			.set(UpdateNotesKey, (deps) => {
				return UpdateNotes({
					fileStore: deps.get(FileStore.Key),
					putNotes: deps.get(PutNotesKey),
				});
			})
			.set(RemoveNotesKey, (deps) => {
				return RemoveNotes({
					fileStore: deps.get(FileStore.Key),
					history: deps.get(EditHistoryManager.Key),
					bus: deps.get(EventBus.Key),
				});
			})
			.set(MoveNotesKey, (deps) => {
				return MoveNotes({
					fileStore: deps.get(FileStore.Key),
					setNotes: deps.get(PutNotesKey),
				});
			})

			// UseCases - Control
			.set(PutCCsKey, (deps) => {
				return PutCCs({
					bus: deps.get(EventBus.Key),
					history: deps.get(EditHistoryManager.Key),
					fileStore: deps.get(FileStore.Key),
				});
			})
			.set(RemoveCCsKey, (deps) => {
				return RemoveCCs({
					bus: deps.get(EventBus.Key),
					history: deps.get(EditHistoryManager.Key),
					fileStore: deps.get(FileStore.Key),
				});
			})
			.set(UpdateCCsKey, (deps) => {
				return UpdateCCs({
					fileStore: deps.get(FileStore.Key),
					putCCs: deps.get(PutCCsKey),
				});
			})

			// UseCases - File
			.set(NewFileKey, (deps) => {
				return NewFile({
					putFile: deps.get(PutFileKey),
				});
			})
			.set(SaveFileKey, (deps) => {
				return SaveFile({
					fileStore: deps.get(FileStore.Key),
					googleAPIClient: deps.get(GoogleAPIClient.Key),
					recentFileService: deps.get(RecentFileService.Key),
				});
			})
			.set(OpenFileKey, (deps) => {
				return OpenFile({
					googleAPIClient: deps.get(GoogleAPIClient.Key),
				});
			})
			.set(PutFileKey, (deps) => {
				return PutFile({
					bus: deps.get(EventBus.Key),
					editor: deps.get(Editor.Key),
				});
			})

			.set(InitializeAppKey, (deps) => {
				return InitializeApp({
					soundFontStore: deps.get(SoundFontStore.Key),
					synthesizer: deps.get(Synthesizer.Key),
					autoSaveService: deps.get(AutoSaveService.Key),
				});
			})
	);
}

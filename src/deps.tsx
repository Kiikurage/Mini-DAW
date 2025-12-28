import { AudioContextKey } from "./AudioContextHolder.ts";
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
import { LoadFile, LoadFileKey } from "./usecases/LoadFile.ts";
import { MoveNotes, MoveNotesKey } from "./usecases/MoveNotes.ts";
import { NewFile, NewFileKey } from "./usecases/NewFile.ts";
import { OpenFile, OpenFileKey } from "./usecases/OpenFile.ts";
import {
	PutControlChange,
	PutControlChangeKey,
} from "./usecases/PutControlChange.ts";
import { RemoveChannel, RemoveChannelKey } from "./usecases/RemoveChannel.ts";
import {
	RemoveControlChanges,
	RemoveControlChangesKey,
} from "./usecases/RemoveControlChanges.ts";
import { RemoveNotes, RemoveNotesKey } from "./usecases/RemoveNotes.ts";
import { SaveFile, SaveFileKey } from "./usecases/SaveFile.ts";
import {
	SetNoteParameter,
	SetNoteParameterKey,
} from "./usecases/SetNoteParameter.ts";
import { SetNotes, SetNotesKey } from "./usecases/SetNotes.ts";
import { SetSong, SetSongKey } from "./usecases/SetSong.ts";
import { UpdateChannel, UpdateChannelKey } from "./usecases/UpdateChannel.ts";
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
					deps.get(RemoveControlChangesKey),
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
					deps.get(SetNotesKey),
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
			.set(GoogleAPIClient.Key, (deps) => {
				return new GoogleAPIClient();
			})
			.set(RecentFileService.Key, (deps) => {
				return new RecentFileService();
			})
			.set(AutoSaveService.Key, (deps) => {
				return new AutoSaveService(
					deps.get(FileStore.Key),
					deps.get(SaveFileKey),
					deps.get(EventBus.Key),
				);
			})

			// UseCases - Song
			.set(SetSongKey, (deps) => {
				return SetSong({ bus: deps.get(EventBus.Key) });
			})
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
			.set(SetNotesKey, (deps) => {
				return SetNotes({
					fileStore: deps.get(FileStore.Key),
					history: deps.get(EditHistoryManager.Key),
					bus: deps.get(EventBus.Key),
				});
			})
			.set(MoveNotesKey, (deps) => {
				return MoveNotes({
					fileStore: deps.get(FileStore.Key),
					setNotes: deps.get(SetNotesKey),
				});
			})
			.set(RemoveNotesKey, (deps) => {
				return RemoveNotes({
					fileStore: deps.get(FileStore.Key),
					history: deps.get(EditHistoryManager.Key),
					bus: deps.get(EventBus.Key),
				});
			})
			.set(SetNoteParameterKey, (deps) => {
				return SetNoteParameter({
					fileStore: deps.get(FileStore.Key),
					setNotes: deps.get(SetNotesKey),
				});
			})

			// UseCases - Control
			.set(PutControlChangeKey, (deps) => {
				return PutControlChange({
					bus: deps.get(EventBus.Key),
				});
			})
			.set(RemoveControlChangesKey, (deps) => {
				return RemoveControlChanges({
					bus: deps.get(EventBus.Key),
					history: deps.get(EditHistoryManager.Key),
					fileStore: deps.get(FileStore.Key),
				});
			})

			// UseCases - File
			.set(NewFileKey, (deps) => {
				return NewFile({
					bus: deps.get(EventBus.Key),
					fileStore: deps.get(FileStore.Key),
				});
			})
			.set(SaveFileKey, (deps) => {
				return SaveFile({
					fileStore: deps.get(FileStore.Key),
					googleAPIClient: deps.get(GoogleAPIClient.Key),
					recentFileService: deps.get(RecentFileService.Key),
				});
			})
			.set(LoadFileKey, (deps) => {
				return LoadFile({
					statusBar: deps.get(StatusBar.Key),
					setSong: deps.get(SetSongKey),
				});
			})
			.set(OpenFileKey, (deps) => {
				return OpenFile({
					bus: deps.get(EventBus.Key),
					editor: deps.get(Editor.Key),
					fileStore: deps.get(FileStore.Key),
					googleAPIClient: deps.get(GoogleAPIClient.Key),
					recentFileService: deps.get(RecentFileService.Key),
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

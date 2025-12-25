import { AudioContextKey } from "./AudioContextHolder.ts";
import { ClipboardManager } from "./ClipboardManager.ts";
import { ContextMenuManager } from "./ContextMenu/ContextMenuManager.tsx";
import { DIContainer } from "./Dependency/DIContainer.ts";
import { EditHistoryManager } from "./EditHistory/EditHistoryManager.ts";
import { Editor } from "./Editor/Editor.ts";
import { EventBus } from "./EventBus.ts";
import { GoogleAPIClient } from "./GoogleDriveAPI/GoogleAPIClient.ts";
import { KeyboardHandler } from "./KeyboardHandler.ts";
import { Player } from "./Player/Player.ts";
import { OverlayPortal } from "./react/OverlayPortal.ts";
import { SongStore } from "./SongStore.ts";
import { SoundFontStore } from "./SoundFontStore.ts";
import { StatusBar } from "./StatusBar/StatusBar.tsx";
import { Synthesizer } from "./Synthesizer.ts";
import { AddChannel, AddChannelKey } from "./usecases/AddChannel.ts";
import { InitializeApp, InitializeAppKey } from "./usecases/initializeApp.ts";
import { LoadFile, LoadFileKey } from "./usecases/LoadFile.ts";
import { MoveNotes, MoveNotesKey } from "./usecases/MoveNotes.ts";
import { NewFile, NewFileKey } from "./usecases/NewFile.ts";
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
					deps.get(SongStore.Key),
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
			.set(SongStore.Key, (deps) => {
				return new SongStore(deps.get(EventBus.Key));
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
					deps.get(SongStore.Key),
					deps.get(Synthesizer.Key),
					deps.get(EventBus.Key),
				);
			})
			.set(OverlayPortal.Key, () => {
				return new OverlayPortal();
			})
			.set(ClipboardManager.Key, (deps) => {
				return new ClipboardManager(
					deps.get(SongStore.Key),
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
					deps.get(EditHistoryManager.Key),
					deps.get(ClipboardManager.Key),
					deps.get(Player.Key),
					deps.get(Editor.Key),
					deps.get(SaveFileKey),
					deps.get(LoadFileKey),
				);
			})
			.set(GoogleAPIClient.Key, (deps) => {
				return new GoogleAPIClient();
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
					songStore: deps.get(SongStore.Key),
				});
			})
			.set(RemoveChannelKey, (deps) => {
				return RemoveChannel({
					history: deps.get(EditHistoryManager.Key),
					songStore: deps.get(SongStore.Key),
					bus: deps.get(EventBus.Key),
				});
			})

			// UseCases - Note
			.set(SetNotesKey, (deps) => {
				return SetNotes({
					songStore: deps.get(SongStore.Key),
					history: deps.get(EditHistoryManager.Key),
					bus: deps.get(EventBus.Key),
				});
			})
			.set(MoveNotesKey, (deps) => {
				return MoveNotes({
					songStore: deps.get(SongStore.Key),
					setNotes: deps.get(SetNotesKey),
				});
			})
			.set(RemoveNotesKey, (deps) => {
				return RemoveNotes({
					songStore: deps.get(SongStore.Key),
					history: deps.get(EditHistoryManager.Key),
					bus: deps.get(EventBus.Key),
				});
			})
			.set(SetNoteParameterKey, (deps) => {
				return SetNoteParameter({
					songStore: deps.get(SongStore.Key),
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
					songStore: deps.get(SongStore.Key),
				});
			})

			// UseCases - File
			.set(NewFileKey, (deps) => {
				return NewFile({
					bus: deps.get(EventBus.Key),
				});
			})
			.set(SaveFileKey, (deps) => {
				return SaveFile({
					songStore: deps.get(SongStore.Key),
				});
			})
			.set(LoadFileKey, (deps) => {
				return LoadFile({
					statusBar: deps.get(StatusBar.Key),
					setSong: deps.get(SetSongKey),
				});
			})

			.set(InitializeAppKey, (deps) => {
				return InitializeApp({
					newFile: deps.get(NewFileKey),
					songStore: deps.get(SongStore.Key),
					editor: deps.get(Editor.Key),
					soundFontStore: deps.get(SoundFontStore.Key),
					synthesizer: deps.get(Synthesizer.Key),
				});
			})
	);
}

import { MdMoreVert, MdPause, MdPlayArrow } from "react-icons/md";
import { TICK_PER_BEAT, TICK_PER_MEASURE } from "../constants.ts";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { Editor } from "../Editor/Editor.ts";
import { getActiveChannel } from "../getActiveChannel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Player } from "../Player/Player.ts";
import { PromiseState } from "../PromiseState.ts";
import { Form } from "../react/Form.tsx";
import { IconButton } from "../react/IconButton.ts";
import { OverlayPortal } from "../react/OverlayPortal.ts";
import { SongStore } from "../SongStore.ts";
import { SoundFontDialog } from "../SoundFontDialog/SoundFontDialog.tsx";
import { SoundFontStore } from "../SoundFontStore.ts";
import { useStateful } from "../Stateful/useStateful.tsx";
import { Synthesizer } from "../Synthesizer.ts";
import {
	type UpdateChannel,
	UpdateChannelKey,
} from "../usecases/UpdateChannel.ts";
import { type UpdateSong, UpdateSongKey } from "../usecases/UpdateSong.ts";
import { BankSelect } from "./BankSelect.tsx";
import { PresetSelect } from "./PresetSelect.tsx";

export function ToolBar({
	player,
	songStore,
	updateSong,
	soundFontStore,
	editor,
	updateChannel,
	overlayPortal,
	synthesizer,
}: {
	player?: Player;
	songStore?: SongStore;
	updateSong?: UpdateSong;
	soundFontStore?: SoundFontStore;
	editor?: Editor;
	updateChannel?: UpdateChannel;
	overlayPortal?: OverlayPortal;
	synthesizer?: Synthesizer;
}) {
	player = useComponent(Player.Key, player);
	songStore = useComponent(SongStore.Key, songStore);
	updateSong = useComponent(UpdateSongKey, updateSong);
	soundFontStore = useComponent(SoundFontStore.Key, soundFontStore);
	editor = useComponent(Editor.Key, editor);
	updateChannel = useComponent(UpdateChannelKey, updateChannel);
	overlayPortal = useComponent(OverlayPortal.Key, overlayPortal);
	synthesizer = useComponent(Synthesizer.Key, synthesizer);

	const playHeadTick = useStateful(player, (state) => state.currentTick);
	const isPlaying = useStateful(player, (state) => state.isPlaying);
	const songTitle = useStateful(songStore, (state) => state.title);

	const song = useStateful(songStore);
	const editorState = useStateful(editor);
	const activeChannel = getActiveChannel(song, editorState);

	const soundFontStoreState = useStateful(soundFontStore);

	const soundFont = (() => {
		if (activeChannel === null) return null;
		const instrumentKey = activeChannel.instrumentKey;
		const soundFont = soundFontStoreState.get(instrumentKey.url);
		if (!PromiseState.isFulfilled(soundFont?.state)) return null;
		return soundFont.state;
	})();

	return (
		<div
			css={{
				background: "var(--color-toolbar-background)",
				color: "var(--color-toolbar-foreground)",
				borderBottom: "1px solid var(--color-toolbar-border)",
				height: 64,
				display: "flex",
				alignItems: "flex-end",
				justifyContent: "center",
				padding: "8px 8px",
				boxSizing: "border-box",
			}}
		>
			<div
				css={{
					flex: "1 1 0",
					display: "flex",
					flexDirection: "row",
					gap: 8,
					alignItems: "flex-end",
					justifyContent: "flex-start",
				}}
			>
				{activeChannel !== null && soundFont !== null && (
					<>
						<Form.Field label="プリセット">
							<PresetSelect
								soundFont={soundFont}
								value={activeChannel.instrumentKey.presetNumber}
								onChange={(presetNumber) => {
									const instrumentKey = new InstrumentKey(
										activeChannel.instrumentKey.name,
										presetNumber,
										0,
									);
									updateChannel(activeChannel.id, { instrumentKey });
								}}
							/>
						</Form.Field>
						<Form.Field label="バンク">
							<BankSelect
								presetNumber={activeChannel.instrumentKey.presetNumber}
								soundFont={soundFont}
								onChange={(bankNumber) => {
									const instrumentKey = new InstrumentKey(
										activeChannel.instrumentKey.name,
										activeChannel.instrumentKey.presetNumber,
										bankNumber,
									);
									updateChannel(activeChannel.id, { instrumentKey });
								}}
							/>
						</Form.Field>
						<IconButton
							size="sm"
							onClick={() => {
								new SoundFontDialog(
									overlayPortal,
									synthesizer,
									soundFontStore,
									updateChannel,
									activeChannel,
								).open();
							}}
						>
							<MdMoreVert />
						</IconButton>
					</>
				)}
			</div>
			<div
				css={{
					flex: "0 0 auto",
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					gap: 8,
				}}
			>
				<IconButton variant="normalInline" onClick={() => player.togglePlay()}>
					{isPlaying ? <MdPause /> : <MdPlayArrow />}
				</IconButton>
				<div
					css={{
						position: "relative",
						width: 200,
						height: 48,
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						borderRadius: 4,
						background: "var(--color-gray-200)",
						color: "var(--color-foreground-weak)",
						padding: "4px 12px",
						boxSizing: "border-box",
						userSelect: "none",
						border: "1px solid var(--color-border)",
					}}
				>
					{/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
					{/** biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
					<span
						css={{
							fontSize: "10px",
							fontWeight: "normal",
							margin: 0,
							padding: 0,
							whiteSpace: "nowrap",
						}}
						onClick={() => {
							const newTitle = prompt(
								"曲のタイトルを入力してください",
								songTitle,
							);
							if (newTitle !== null) {
								updateSong({
									title: newTitle,
								});
							}
						}}
					>
						{songTitle}
					</span>
					<span css={{ fontFamily: "monospace" }}>
						{Math.floor(playHeadTick / TICK_PER_MEASURE) + 1}.
						{Math.floor((playHeadTick % TICK_PER_MEASURE) / TICK_PER_BEAT) + 1}.
						{(playHeadTick % TICK_PER_BEAT).toString().padStart(3, "0")}
					</span>
				</div>
			</div>
		</div>
	);
}

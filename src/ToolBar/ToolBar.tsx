import { MdMoreVert, MdPause, MdPlayArrow } from "react-icons/md";
import { TICK_PER_BEAT, TICK_PER_MEASURE } from "../constants.ts";
import type { Editor } from "../Editor/Editor.ts";
import { getActiveChannel } from "../getActiveChannel.ts";
import { SoundFontDialog } from "../InstrumentDialog/SoundFontDialog.tsx";
import type { InstrumentStore } from "../InstrumentStore.ts";
import type { Player } from "../Player/Player.ts";
import { Form } from "../react/Form.tsx";
import { IconButton } from "../react/IconButton.ts";
import type { OverlayPortal } from "../react/OverlayPortal.ts";
import type { SongStore } from "../SongStore.ts";
import { SoundFontInstrumentKey } from "../SoundFontInstrument.ts";
import type { SoundFontStore } from "../SoundFontStore.ts";
import { useStateful } from "../Stateful/useStateful.tsx";
import type { UpdateChannel } from "../usecases/UpdateChannel.ts";
import type { UpdateSong } from "../usecases/UpdateSong.ts";
import { BankSelect } from "./BankSelect.tsx";
import { PresetSelect } from "./PresetSelect.tsx";

export function ToolBar({
	player,
	songStore,
	updateSong,
	instrumentStore,
	soundFontStore,
	editor,
	audioContext,
	updateChannel,
	overlayPortal,
}: {
	player: Player;
	songStore: SongStore;
	updateSong: UpdateSong;
	instrumentStore: InstrumentStore;
	soundFontStore: SoundFontStore;
	editor: Editor;
	audioContext: AudioContext;
	updateChannel: UpdateChannel;
	overlayPortal: OverlayPortal;
}) {
	const playHeadTick = useStateful(player, (state) => state.currentTick);
	const isPlaying = useStateful(player, (state) => state.isPlaying);
	const songTitle = useStateful(songStore, (state) => state.title);

	const song = useStateful(songStore);
	const editorState = useStateful(editor);
	const activeChannel = getActiveChannel(song, editorState);

	const soundFontStoreState = useStateful(soundFontStore);

	const soundFont = (() => {
		if (activeChannel === null) return null;
		const instrumentKey = activeChannel.instrumentKey as SoundFontInstrumentKey;
		const soundFont = soundFontStoreState.get(instrumentKey.url);
		if (soundFont?.state.status !== "fulfilled") return null;
		return soundFont.state.value;
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
								value={
									(activeChannel.instrumentKey as SoundFontInstrumentKey)
										.presetNumber
								}
								onChange={(presetNumber) => {
									const instrumentKey = new SoundFontInstrumentKey(
										(activeChannel.instrumentKey as SoundFontInstrumentKey).url,
										presetNumber,
										0,
									);
									updateChannel(activeChannel.id, { instrumentKey });
									instrumentStore.getOrLoad(instrumentKey);
								}}
							/>
						</Form.Field>
						<Form.Field label="バンク">
							<BankSelect
								presetNumber={
									(activeChannel.instrumentKey as SoundFontInstrumentKey)
										.presetNumber
								}
								soundFont={soundFont}
								onChange={(bankNumber) => {
									const instrumentKey = new SoundFontInstrumentKey(
										(activeChannel.instrumentKey as SoundFontInstrumentKey).url,
										(activeChannel.instrumentKey as SoundFontInstrumentKey)
											.presetNumber,
										bankNumber,
									);
									updateChannel(activeChannel.id, { instrumentKey });
									instrumentStore.getOrLoad(instrumentKey);
								}}
							/>
						</Form.Field>
						<IconButton
							size="sm"
							onClick={() => {
								new SoundFontDialog(
									overlayPortal,
									instrumentStore,
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

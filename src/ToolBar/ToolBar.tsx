import { MdMoreVert, MdPause, MdPlayArrow } from "react-icons/md";
import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { TICK_PER_BEAT, TICK_PER_MEASURE } from "../constants.ts";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { Editor } from "../Editor/Editor.ts";
import { FileStore } from "../FileStore.ts";
import { useActiveChannelMetadata } from "../getActiveChannel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Player } from "../Player/Player.ts";
import { PromiseState } from "../PromiseState.ts";
import { Field } from "../react/Field.tsx";
import { IconButton } from "../react/IconButton.tsx";
import { OverlayPortal } from "../react/OverlayPortal.ts";
import { SliderField } from "../react/Slider.tsx";
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
	fileStore,
	updateSong,
	soundFontStore,
	editor,
	updateChannel,
	overlayPortal,
	synthesizer,
}: {
	player?: Player;
	fileStore?: FileStore;
	updateSong?: UpdateSong;
	soundFontStore?: SoundFontStore;
	editor?: Editor;
	updateChannel?: UpdateChannel;
	overlayPortal?: OverlayPortal;
	synthesizer?: Synthesizer;
}) {
	player = useComponent(Player.Key, player);
	fileStore = useComponent(FileStore.Key, fileStore);
	updateSong = useComponent(UpdateSongKey, updateSong);
	soundFontStore = useComponent(SoundFontStore.Key, soundFontStore);
	editor = useComponent(Editor.Key, editor);
	updateChannel = useComponent(UpdateChannelKey, updateChannel);
	overlayPortal = useComponent(OverlayPortal.Key, overlayPortal);
	synthesizer = useComponent(Synthesizer.Key, synthesizer);

	const playHeadTick = useStateful(player, (state) => state.currentTick);
	const isPlaying = useStateful(player, (state) => state.isPlaying);
	const songTitle = useStateful(
		fileStore,
		(state) => state.song.metadata.title,
	);

	const activeChannelMetadata = useActiveChannelMetadata(fileStore, editor);

	const soundFontStoreState = useStateful(soundFontStore);

	const soundFont = (() => {
		if (activeChannelMetadata === null) return null;
		const instrumentKey = activeChannelMetadata.instrumentKey;
		const soundFont = soundFontStoreState.get(instrumentKey.url);
		if (soundFont === undefined) return null;
		if (!PromiseState.isFulfilled(soundFont.state)) return null;
		return soundFont.state;
	})();

	return (
		<div
			className={cx(
				flex({ direction: "row", align: "center", justify: "space-between" }),
				css({
					background: "var(--color-toolbar-background)",
					color: "var(--color-toolbar-foreground)",
					borderBottom: "1px solid var(--color-toolbar-border)",
					height: 64,
					padding: "8px 8px",
					boxSizing: "border-box",
				}),
			)}
		>
			<div
				className={cx(
					flex({ direction: "row", align: "end", justify: "start", gap: 8 }),
					css({
						flex: "1 1 0",
					}),
				)}
			>
				{activeChannelMetadata !== null && soundFont !== null && (
					<>
						<div>
							<Field label="プリセット">
								<PresetSelect
									soundFont={soundFont}
									value={activeChannelMetadata.instrumentKey.presetNumber}
									onChange={(presetNumber) => {
										const instrumentKey = new InstrumentKey(
											activeChannelMetadata.instrumentKey.name,
											presetNumber,
											0,
										);
										updateChannel(activeChannelMetadata.id, { instrumentKey });
									}}
								/>
							</Field>
						</div>
						<div>
							<Field label="バンク">
								<BankSelect
									presetNumber={
										activeChannelMetadata.instrumentKey.presetNumber
									}
									soundFont={soundFont}
									onChange={(bankNumber) => {
										const instrumentKey = new InstrumentKey(
											activeChannelMetadata.instrumentKey.name,
											activeChannelMetadata.instrumentKey.presetNumber,
											bankNumber,
										);
										updateChannel(activeChannelMetadata.id, { instrumentKey });
									}}
								/>
							</Field>
						</div>
						<IconButton
							size="sm"
							onClick={() => {
								new SoundFontDialog(
									overlayPortal,
									synthesizer,
									soundFontStore,
									updateChannel,
									activeChannelMetadata,
								).open();
							}}
						>
							<MdMoreVert />
						</IconButton>
					</>
				)}
			</div>
			<div
				className={cx(
					flex({
						direction: "row",
						align: "stretch",
						justify: "center",
						gap: 8,
					}),
					css({
						flex: "0 0 auto",
					}),
				)}
			>
				<div>
					<SliderField
						label="マスターボリューム"
						sliderProps={{
							min: 0,
							max: 1,
							step: 0.01,
							defaultValue: synthesizer.volume,
							onChange: (ev) => {
								const value = Number.parseFloat(ev.target.value);
								if (Number.isNaN(value)) return;
								synthesizer.setVolume(value);
							},
						}}
					/>
				</div>
				<IconButton variant="normalInline" onClick={() => player.togglePlay()}>
					{isPlaying ? <MdPause /> : <MdPlayArrow />}
				</IconButton>
				<div
					className={cx(
						flex({ direction: "column", align: "center", justify: "center" }),
						css({
							position: "relative",
							width: 200,
							height: 48,
							borderRadius: 4,
							background: "var(--color-gray-200)",
							color: "var(--color-foreground-weak)",
							padding: "4px 12px",
							boxSizing: "border-box",
							userSelect: "none",
							border: "1px solid var(--color-border)",
						}),
					)}
				>
					{/** biome-ignore lint/a11y/noStaticElementInteractions: <explanation> */}
					{/** biome-ignore lint/a11y/useKeyWithClickEvents: <explanation> */}
					<span
						className={css({
							fontSize: "10px",
							fontWeight: "normal",
							margin: 0,
							padding: 0,
							whiteSpace: "nowrap",
						})}
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
					<span className={css({ fontFamily: "monospace" })}>
						{Math.floor(playHeadTick / TICK_PER_MEASURE) + 1}.
						{Math.floor((playHeadTick % TICK_PER_MEASURE) / TICK_PER_BEAT) + 1}.
						{(playHeadTick % TICK_PER_BEAT).toString().padStart(3, "0")}
					</span>
				</div>
			</div>
		</div>
	);
}

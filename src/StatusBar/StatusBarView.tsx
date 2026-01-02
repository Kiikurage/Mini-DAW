import { MdSearch } from "react-icons/md";
import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { TICK_PER_BEAT, TICK_PER_MEASURE } from "../constants.ts";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { Editor } from "../Editor/Editor.ts";
import { FileStore } from "../FileStore.ts";
import { formatDuration } from "../lib.ts";
import { Player } from "../Player/Player.ts";
import { Button } from "../react/Button.tsx";
import { useStateful } from "../Stateful/useStateful.tsx";
import { type UpdateSong, UpdateSongKey } from "../usecases/UpdateSong.ts";
import { StatusBar } from "./StatusBar.tsx";

const statusBarButtonClass = css({
	borderRadius: 0,
	fontSize: "0.9em",
	height: "100%",
	minHeight: "100%",
	lineHeight: "1",
	gap: 0,
});

export function StatusBarView({
	statusBar,
	fileStore,
	updateSong,
	player,
	editor,
}: {
	statusBar?: StatusBar;
	fileStore?: FileStore;
	updateSong?: UpdateSong;
	player?: Player;
	editor?: Editor;
}) {
	statusBar = useComponent(StatusBar.Key, statusBar);
	fileStore = useComponent(FileStore.Key, fileStore);
	updateSong = useComponent(UpdateSongKey, updateSong);
	player = useComponent(Player.Key, player);
	editor = useComponent(Editor.Key, editor);

	const statusMessage = useStateful(statusBar, (state) => state.message);
	const zoom = useStateful(editor, (state) => state.zoom);
	const bpm = useStateful(fileStore, (state) => state.song.metadata.bpm);
	const newNoteDuration = useStateful(
		editor,
		(state) => state.newNoteDurationInTick,
	);
	const quantizeUnit = useStateful(editor, (state) => state.quantizeUnitInTick);
	const isAutoScrollEnabled = useStateful(
		player,
		(state) => state.isAutoScrollEnabled,
	);
	const timelineGridUnit = useStateful(
		editor,
		(state) => state.timelineGridUnitInTick,
	);

	return (
		<div
			className={cx(
				flex({
					direction: "row",
					align: "stretch",
					justify: "space-between",
					gap: 16,
				}),
				css({
					height: 24,
					borderTop: "1px solid var(--color-StatusBar-border)",
					background: "var(--color-StatusBar-background)",
					color: "var(--color-StatusBar-foreground)",
					fontSize: "0.9em",
					padding: "0 12px",
				}),
			)}
		>
			<div className={flex({ direction: "row", align: "center" })}>
				{statusMessage}
			</div>
			<div className={flex({ direction: "row", align: "center" })}>
				<Button
					className={statusBarButtonClass}
					variant="normalInline"
					onClick={() => {
						player.setAutoScrollEnabled(!isAutoScrollEnabled);
					}}
					tabIndex={-1}
				>
					<span>自動スクロール: {isAutoScrollEnabled ? "ON" : "OFF"}</span>
				</Button>
				<Button
					className={statusBarButtonClass}
					variant="normalInline"
					onClick={() => {
						const newTimelineGridUnit =
							timelineGridUnit <= TICK_PER_MEASURE / 64
								? TICK_PER_BEAT
								: timelineGridUnit / 2;
						editor.setTimelineGridUnit(newTimelineGridUnit);
					}}
					tabIndex={-1}
				>
					<span>グリッド単位:{formatDuration(timelineGridUnit)}</span>
				</Button>
				<Button
					className={statusBarButtonClass}
					variant="normalInline"
					onClick={() => {
						const newQuantizeUnit =
							quantizeUnit <= TICK_PER_MEASURE / 64
								? TICK_PER_BEAT
								: quantizeUnit / 2;
						editor.setQuantizeUnit(newQuantizeUnit);
					}}
					tabIndex={-1}
				>
					<span>操作単位:{formatDuration(quantizeUnit)}</span>
				</Button>
				<Button
					className={statusBarButtonClass}
					variant="normalInline"
					onClick={() => {
						const newBPM = Number.parseInt(prompt("BPMを入力") ?? "NaN", 10);
						if (!Number.isNaN(newBPM) && newBPM > 0) {
							updateSong({ bpm: newBPM });
						}
					}}
					tabIndex={-1}
				>
					<span>BPM:{bpm}</span>
				</Button>
				<Button
					className={statusBarButtonClass}
					variant="normalInline"
					tabIndex={-1}
				>
					<span>入力サイズ:{formatDuration(newNoteDuration)}</span>
				</Button>
				<Button
					className={statusBarButtonClass}
					variant="normalInline"
					onClick={() => {
						const newZoom = zoom >= 16 ? 0.125 : zoom * 2;
						editor.setZoom(newZoom);
					}}
					tabIndex={-1}
				>
					<MdSearch />
					<span>{(zoom * 100).toFixed(0)}%</span>
				</Button>
			</div>
		</div>
	);
}

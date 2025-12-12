import styled from "@emotion/styled";
import { MdSearch } from "react-icons/md";
import { TICK_PER_BEAT, TICK_PER_MEASURE } from "../constants.ts";
import type { Editor } from "../Editor/Editor.ts";
import type { PianoRoll } from "../Editor/PianoRoll/PianoRoll.ts";
import { formatDuration } from "../lib.ts";
import type { Player } from "../Player/Player.ts";
import { Button } from "../react/Button.ts";
import type { SongStore } from "../SongStore.ts";
import { useStateful } from "../Stateful/useStateful.tsx";
import type { UpdateSong } from "../usecases/UpdateSong.ts";
import type { StatusBar } from "./StatusBar.tsx";

const StatusBarButton = styled(Button)({
	borderRadius: 0,
	fontSize: "0.9em",
	height: "100%",
	minHeight: "100%",
	lineHeight: "1",
	gap: 0,
});

export function StatusBarView({
	statusBar,
	songStore,
	pianoRoll,
	updateSong,
	player,
	editor,
}: {
	statusBar: StatusBar;
	songStore: SongStore;
	pianoRoll: PianoRoll;
	updateSong: UpdateSong;
	player: Player;
	editor: Editor;
}) {
	const statusMessage = useStateful(statusBar, (state) => state.message);
	const zoom = useStateful(editor, (state) => state.zoom);
	const bpm = useStateful(songStore, (state) => state.bpm);
	const newNoteDuration = useStateful(
		pianoRoll,
		(state) => state.newNoteDurationInTick,
	);
	const quantizeUnit = useStateful(
		pianoRoll,
		(state) => state.quantizeUnitInTick,
	);
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
			css={{
				height: 24,
				borderTop: "1px solid var(--color-StatusBar-border)",
				background: "var(--color-StatusBar-background)",
				color: "var(--color-StatusBar-foreground)",
				fontSize: "0.9em",
				display: "flex",
				flexDirection: "row",
				alignItems: "stretch",
				justifyContent: "space-between",
				padding: "0 12px",
				gap: 16,
			}}
		>
			<div
				css={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
				}}
			>
				{statusMessage}
			</div>
			<div
				css={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
				}}
			>
				<StatusBarButton
					variant="normalInline"
					onClick={() => {
						player.setAutoScrollEnabled(!isAutoScrollEnabled);
					}}
					tabIndex={-1}
				>
					<span>自動スクロール: {isAutoScrollEnabled ? "ON" : "OFF"}</span>
				</StatusBarButton>
				<StatusBarButton
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
				</StatusBarButton>
				<StatusBarButton
					variant="normalInline"
					onClick={() => {
						const newQuantizeUnit =
							quantizeUnit <= TICK_PER_MEASURE / 64
								? TICK_PER_BEAT
								: quantizeUnit / 2;
						pianoRoll.setQuantizeUnit(newQuantizeUnit);
					}}
					tabIndex={-1}
				>
					<span>操作単位:{formatDuration(quantizeUnit)}</span>
				</StatusBarButton>
				<StatusBarButton
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
				</StatusBarButton>
				<StatusBarButton variant="normalInline" tabIndex={-1}>
					<span>入力サイズ:{formatDuration(newNoteDuration)}</span>
				</StatusBarButton>
				<StatusBarButton
					variant="normalInline"
					onClick={() => {
						const newZoom = zoom >= 16 ? 0.125 : zoom * 2;
						editor.setZoom(newZoom);
					}}
					tabIndex={-1}
				>
					<MdSearch />
					<span>{(zoom * 100).toFixed(0)}%</span>
				</StatusBarButton>
			</div>
		</div>
	);
}

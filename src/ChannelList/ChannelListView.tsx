import { useState } from "react";
import { IoMdEye } from "react-icons/io";
import { IoVolumeMute } from "react-icons/io5";
import { MdAdd, MdDelete } from "react-icons/md";
import type { ContextMenuManager } from "../ContextMenu/ContextMenuManager.tsx";
import type { Editor } from "../Editor/Editor.ts";
import type { PianoRoll } from "../Editor/PianoRoll/PianoRoll.ts";
import { SoundFontDialog } from "../InstrumentDialog/SoundFontDialog.tsx";
import type { InstrumentStore } from "../InstrumentStore.ts";
import { Channel } from "../models/Channel.ts";
import type { Player } from "../Player/Player.ts";
import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";
import { EditableLabel } from "../react/EditableLabel.tsx";
import { IconButton } from "../react/IconButton.ts";
import type { OverlayPortal } from "../react/OverlayPortal.ts";
import type { SongStore } from "../SongStore.ts";
import { SoundFontInstrumentKey } from "../SoundFontInstrument.ts";
import type { SoundFontStore } from "../SoundFontStore.ts";
import { useStateful } from "../Stateful/useStateful.tsx";
import type { AddChannel } from "../usecases/AddChannel.ts";
import type { DeleteChannel } from "../usecases/DeleteChannel.ts";
import type { UpdateChannel } from "../usecases/UpdateChannel.ts";

export function ChannelListView({
	songStore,
	pianoRoll,
	addChannel,
	deleteChannel,
	updateChannel,
	instrumentStore,
	contextMenu,
	overlayPortal,
	soundFontStore,
	editor,
	player,
}: {
	songStore: SongStore;
	pianoRoll: PianoRoll;
	addChannel: AddChannel;
	updateChannel: UpdateChannel;
	deleteChannel: DeleteChannel;
	instrumentStore: InstrumentStore;
	contextMenu: ContextMenuManager;
	overlayPortal: OverlayPortal;
	soundFontStore: SoundFontStore;
	editor: Editor;
	player: Player;
}) {
	const channels = useStateful(songStore, (state) => state.channels);
	const activeChannelId = useStateful(editor, (state) => state.activeChannelId);

	return (
		<div
			css={{
				position: "absolute",
				inset: 0,
				display: "flex",
				flexDirection: "column",
				alignItems: "stretch",
				justifyContent: "stretch",
			}}
		>
			<header
				css={{
					flex: "0 0 auto",
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "space-between",
					padding: "2px 12px",
					borderBottom: "1px solid var(--color-channelList-border)",
				}}
			>
				<span
					css={{
						fontSize: "0.875em",
						color: "var(--color-channelList-foreground)",
					}}
				>
					Channels
				</span>
				<div
					css={{
						display: "flex",
						flexDirection: "row",
						alignItems: "center",
						gap: 4,
					}}
				>
					<IconButton
						variant="normalInline"
						title="チャンネルを追加"
						size="sm"
						onClick={() => {
							const instrumentKey = new SoundFontInstrumentKey(
								PreInstalledSouindFonts[0]!.soundFontUrl,
								0,
								0,
							);

							const id =
								Math.max(-1, ...songStore.state.channels.map((ch) => ch.id)) +
								1;
							const channel = new Channel({
								id,
								label: `Channel ${id + 1}`,
								instrumentKey,
								notes: new Map(),
								color: Channel.COLORS[id % Channel.COLORS.length]!,
							});
							addChannel(channel);
						}}
					>
						<MdAdd />
					</IconButton>
				</div>
			</header>
			<ul
				css={{
					listStyle: "none",
					margin: 0,
					padding: 0,
					overflowY: "auto",
					flex: "1 1 0",
				}}
			>
				{channels.map((channel) => (
					<ChannelListItem
						key={channel.id}
						channel={channel}
						pianoRoll={pianoRoll}
						active={channel.id === activeChannelId}
						updateChannel={updateChannel}
						deleteChannel={deleteChannel}
						instrumentStore={instrumentStore}
						contextMenu={contextMenu}
						overlayPortal={overlayPortal}
						soundFontStore={soundFontStore}
						editor={editor}
						player={player}
					/>
				))}
			</ul>
		</div>
	);
}

function ChannelListItem({
	channel,
	active,
	pianoRoll,
	instrumentStore,
	contextMenu,
	deleteChannel,
	updateChannel,
	overlayPortal,
	soundFontStore,
	editor,
	player,
}: {
	channel: Channel;
	active?: boolean;
	pianoRoll: PianoRoll;
	instrumentStore: InstrumentStore;
	contextMenu: ContextMenuManager;
	deleteChannel: DeleteChannel;
	updateChannel: UpdateChannel;
	overlayPortal: OverlayPortal;
	soundFontStore: SoundFontStore;
	editor: Editor;
	player: Player;
}) {
	const mutedChannelIds = useStateful(player, (state) => state.mutedChannelIds);
	const previewChannelIds = useStateful(
		pianoRoll,
		(state) => state.previewChannelIds,
	);

	const instrumentStoreState = useStateful(instrumentStore);

	const instrumentName = (() => {
		const instrumentPS = instrumentStoreState.get(channel.instrumentKey);
		if (instrumentPS === undefined) return "#N/A";

		switch (instrumentPS.status) {
			case "fulfilled":
				return instrumentPS.value.name;
			case "pending":
				return "(Loading...)";
			case "rejected":
				return "(Error)";
		}
	})();

	const [edit, setEdit] = useState(false);

	return (
		// biome-ignore lint/a11y/useAriaPropsSupportedByRole: <explanation>
		<li
			aria-selected={active}
			onClick={() => editor.setActiveChannel(channel.id)}
			onKeyDown={(ev) => {
				if (ev.key === " ") {
					ev.preventDefault();
					ev.stopPropagation();
					editor.setActiveChannel(channel.id);
				}
			}}
			onContextMenu={(ev) => {
				ev.preventDefault();
				ev.stopPropagation();

				contextMenu.open({
					items: [
						{
							type: "action",
							label: "楽器を変更",
							onClick: () => {
								new SoundFontDialog(
									overlayPortal,
									instrumentStore,
									soundFontStore,
									updateChannel,
									channel,
								).open();
							},
						},
						{ type: "separator" },
						{
							type: "action",
							label: "削除",
							iconBefore: <MdDelete />,
							onClick: () => deleteChannel(channel.id),
						},
					],
					clientTop: ev.clientY,
					clientLeft: ev.clientX,
				});
			}}
			css={{
				padding: "0 12px",
				gap: 12,
				display: "flex",
				flexDirection: "row",
				alignItems: "center",
				justifyContent: "stretch",
				width: "100%",
				boxSizing: "border-box",
				border: "none",
				borderBottom: "1px solid var(--color-channelList-border)",
				background: "var(--color-channelList-background)",
				height: "48px",
				font: "inherit",
				color: "var(--color-channelList-foreground)",
				cursor: "pointer",
				userSelect: "none",
				"&:hover": {
					backgroundColor: "var(--color-channelList-background-hover)",
				},
				"&[aria-selected='true']": {
					backgroundColor: "var(--color-channelList-background-active)",
				},
			}}
		>
			<div
				css={{
					display: "flex",
					flexDirection: "row",
					alignItems: "center",
					justifyContent: "center",
				}}
			>
				<i
					style={{
						background: channel.color.cssString,
						width: 8,
						height: 8,
						borderRadius: "50%",
					}}
				/>
			</div>
			<div
				css={{
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-start",
					flex: "1 1 0",
					minWidth: "0",
				}}
			>
				<EditableLabel
					value={channel.labelOrDefault}
					edit={edit}
					onStartEdit={() => setEdit(true)}
					onSubmit={(newValue) => {
						updateChannel(channel.id, { label: newValue });
						setEdit(false);
					}}
				/>
				<div
					css={{
						whiteSpace: "nowrap",
						fontSize: "0.875em",
						color: "var(--color-foreground-weak)",
						overflow: "clip",
						textOverflow: "ellipsis",
						width: "100%",
						textAlign: "left",
					}}
				>
					<span>{instrumentName}</span>
				</div>
			</div>
			<div
				css={{
					display: "flex",
					flexDirection: "row",
					alignItems: "flex-start",
					flex: "0 0 auto",
					gap: 4,
				}}
			>
				<IconButton
					title="ミュート"
					size="sm"
					onClick={(ev) => {
						ev.stopPropagation();
						ev.preventDefault();
						player.toggleMuteChannel(channel.id);
					}}
					aria-pressed={mutedChannelIds.has(channel.id)}
					variant="errorInline"
				>
					<IoVolumeMute />
				</IconButton>
				<IconButton
					title="半透明プレビュー表示"
					size="sm"
					onClick={(ev) => {
						ev.stopPropagation();
						ev.preventDefault();
						pianoRoll.togglePreviewChannel(channel.id);
					}}
					aria-pressed={previewChannelIds.has(channel.id)}
					variant="primaryInline"
				>
					<IoMdEye />
				</IconButton>
			</div>
		</li>
	);
}

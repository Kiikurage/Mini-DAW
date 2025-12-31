import { useState } from "react";
import { IoMdEye } from "react-icons/io";
import { IoVolumeMute } from "react-icons/io5";
import { MdAdd, MdDelete } from "react-icons/md";
import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { ContextMenuManager } from "../ContextMenu/ContextMenuManager.tsx";
import { useComponent } from "../Dependency/DIContainerProvider.tsx";
import { Editor } from "../Editor/Editor.ts";
import { FileStore } from "../FileStore.ts";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { Player } from "../Player/Player.ts";
import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";
import { PromiseState } from "../PromiseState.ts";
import { EditableLabel } from "../react/EditableLabel.tsx";
import { IconButton } from "../react/IconButton.tsx";
import { OverlayPortal } from "../react/OverlayPortal.ts";
import { SoundFontDialog } from "../SoundFontDialog/SoundFontDialog.tsx";
import { SoundFontStore } from "../SoundFontStore.ts";
import { useStateful } from "../Stateful/useStateful.tsx";
import { Synthesizer } from "../Synthesizer.ts";
import { type AddChannel, AddChannelKey } from "../usecases/AddChannel.ts";
import {
	type RemoveChannel,
	RemoveChannelKey,
} from "../usecases/RemoveChannel.ts";
import {
	type UpdateChannel,
	UpdateChannelKey,
} from "../usecases/UpdateChannel.ts";

export function ChannelListView({
	fileStore,
	addChannel,
	removeChannel,
	updateChannel,
	contextMenu,
	overlayPortal,
	soundFontStore,
	synthesizer,
	editor,
	player,
}: {
	fileStore?: FileStore;
	addChannel?: AddChannel;
	updateChannel?: UpdateChannel;
	removeChannel?: RemoveChannel;
	contextMenu?: ContextMenuManager;
	overlayPortal?: OverlayPortal;
	soundFontStore?: SoundFontStore;
	synthesizer?: Synthesizer;
	editor?: Editor;
	player?: Player;
}) {
	fileStore = useComponent(FileStore.Key, fileStore);
	addChannel = useComponent(AddChannelKey, addChannel);
	updateChannel = useComponent(UpdateChannelKey, updateChannel);
	removeChannel = useComponent(RemoveChannelKey, removeChannel);
	contextMenu = useComponent(ContextMenuManager.Key, contextMenu);
	overlayPortal = useComponent(OverlayPortal.Key, overlayPortal);
	soundFontStore = useComponent(SoundFontStore.Key, soundFontStore);
	synthesizer = useComponent(Synthesizer.Key, synthesizer);
	editor = useComponent(Editor.Key, editor);
	player = useComponent(Player.Key, player);

	const channels = useStateful(fileStore, (state) => state.song.channels);
	const activeChannelId = useStateful(editor, (state) => state.activeChannelId);

	return (
		<div
			className={cx(
				flex({
					direction: "column",
					alignItems: "stretch",
					justifyContent: "stretch",
				}),
				css({
					position: "absolute",
					inset: 0,
					backgroundColor: "var(--color-sidepanel-background)",
					borderRight: "1px solid var(--color-sidepanel-border)",
					color: "var(--color-sidepanel-foreground)",
					boxSizing: "border-box",
				}),
			)}
		>
			<header
				className={cx(
					flex({
						direction: "row",
						alignItems: "center",
						justifyContent: "space-between",
					}),
					css({
						flex: "0 0 auto",
						padding: "2px 12px",
						borderBottom: "1px solid var(--color-channelList-border)",
					}),
				)}
			>
				<span
					className={css({
						fontSize: "0.875em",
						color: "var(--color-channelList-foreground)",
					})}
				>
					Channels
				</span>
				<div
					className={flex({
						direction: "row",
						alignItems: "center",
						justifyContent: "center",
						gap: "4px",
					})}
				>
					<IconButton
						variant="normalInline"
						title="チャンネルを追加"
						size="sm"
						onClick={() => {
							const instrumentKey = new InstrumentKey(
								PreInstalledSouindFonts[0]!.name,
								0,
								0,
							);

							const id =
								Math.max(
									-1,
									...fileStore.state.song.channels.map((ch) => ch.id),
								) + 1;
							const channel = new Channel({
								id,
								label: `Channel ${id + 1}`,
								instrumentKey,
								notes: new Map(),
								controlChanges: new Map(),
								color: Channel.COLORS[id % Channel.COLORS.length]!,
							});
							addChannel(channel);
						}}
					>
						<MdAdd />
					</IconButton>
					<IconButton
						size="sm"
						variant="normalInline"
						title="全てのチャンネルのミュート状態を切り替え"
						onClick={() => {
							player.toggleMuteAllChannels();
						}}
					>
						<IoVolumeMute />
					</IconButton>
					<IconButton
						size="sm"
						variant="normalInline"
						title="全てのチャンネルのプレビュー状態を切り替え"
						onClick={() => {
							editor.togglePreviewAllChannels();
						}}
					>
						<IoMdEye />
					</IconButton>
				</div>
			</header>
			<ul
				className={css({
					listStyle: "none",
					margin: 0,
					padding: 0,
					overflowY: "auto",
					flex: "1 1 0",
				})}
			>
				{channels.map((channel) => (
					<ChannelListItem
						key={channel.id}
						channel={channel}
						active={channel.id === activeChannelId}
						updateChannel={updateChannel}
						removeChannel={removeChannel}
						contextMenu={contextMenu}
						overlayPortal={overlayPortal}
						soundFontStore={soundFontStore}
						synthesizer={synthesizer}
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
	contextMenu,
	removeChannel,
	updateChannel,
	overlayPortal,
	soundFontStore,
	synthesizer,
	editor,
	player,
}: {
	channel: Channel;
	active?: boolean;
	contextMenu: ContextMenuManager;
	removeChannel: RemoveChannel;
	updateChannel: UpdateChannel;
	overlayPortal: OverlayPortal;
	soundFontStore: SoundFontStore;
	synthesizer: Synthesizer;
	editor: Editor;
	player: Player;
}) {
	const mutedChannelIds = useStateful(player, (state) => state.mutedChannelIds);
	const previewChannelIds = useStateful(
		editor,
		(state) => state.previewChannelIds,
	);

	const soundFontStoreState = useStateful(soundFontStore);

	const instrumentName = (() => {
		const soundFontPromise = soundFontStoreState.get(channel.instrumentKey.url);
		if (soundFontPromise === undefined) return "#N/A";
		if (!PromiseState.isFulfilled(soundFontPromise.state)) return "#N/A";

		const sf = soundFontPromise.state;
		const preset = sf.getPreset(
			channel.instrumentKey.presetNumber,
			channel.instrumentKey.bankNumber,
		);
		if (preset === null) return "#N/A";

		return preset.name;
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
									synthesizer,
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
							onClick: () => removeChannel(channel.id),
						},
					],
					clientTop: ev.clientY,
					clientLeft: ev.clientX,
				});
			}}
			className={cx(
				flex({
					direction: "row",
					alignItems: "center",
					justifyContent: "stretch",
					gap: 12,
				}),
				css({
					padding: "0 12px",
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
				}),
			)}
		>
			<div
				className={flex({
					direction: "row",
					alignItems: "center",
					justifyContent: "center",
				})}
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
				className={cx(
					flex({
						direction: "column",
						alignItems: "start",
						justifyContent: "start",
					}),
					css({
						flex: "1 1 0",
						minWidth: "0",
					}),
				)}
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
					className={css({
						whiteSpace: "nowrap",
						fontSize: "0.875em",
						color: "var(--color-foreground-weak)",
						overflow: "clip",
						textOverflow: "ellipsis",
						width: "100%",
						textAlign: "left",
					})}
				>
					<span>{instrumentName}</span>
				</div>
			</div>
			<div
				className={cx(
					flex({
						direction: "row",
						alignItems: "center",
						justifyContent: "start",
						gap: 4,
					}),
					css({
						flex: "0 0 auto",
					}),
				)}
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
						editor.togglePreviewChannel(channel.id);
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

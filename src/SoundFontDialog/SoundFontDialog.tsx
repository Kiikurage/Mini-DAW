import { useEffect, useState } from "react";
import { MdOpenInNew } from "react-icons/md";
import type { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";
import { Button } from "../react/Button.ts";
import { Dialog } from "../react/Dialog.tsx";
import { Form } from "../react/Form.tsx";
import { Keyboard } from "../react/Keyboard.tsx";
import { Link } from "../react/Link.ts";
import { ListBox } from "../react/ListBox/ListBox.tsx";
import type { OverlayPortal } from "../react/OverlayPortal.ts";
import { Select } from "../react/Select/Select.tsx";
import type { SoundFontStore } from "../SoundFontStore.ts";
import { useStateful } from "../Stateful/useStateful.tsx";
import type { Synthesizer } from "../Synthesizer.ts";
import type { UpdateChannel } from "../usecases/UpdateChannel.ts";

export class SoundFontDialog {
	private closeHandle: (() => void) | null = null;

	constructor(
		private readonly overlayPortal: OverlayPortal,
		private readonly synthesizer: Synthesizer,
		private readonly soundFontStore: SoundFontStore,
		private readonly updateChannel: UpdateChannel,
		readonly channel: Channel,
	) {}

	open() {
		this.close();
		this.closeHandle = this.overlayPortal.show(() => (
			<SoundFontDialogView
				controller={this}
				onClose={() => this.close()}
				soundFontStore={this.soundFontStore}
				synthesizer={this.synthesizer}
				updateChannel={this.updateChannel}
			/>
		));
	}

	close() {
		this.closeHandle?.();
		this.closeHandle = null;
	}
}

const PREVIEW_CHANNEL_NUMBER = 999;

function SoundFontDialogView({
	synthesizer,
	controller,
	onClose,
	soundFontStore,
	updateChannel,
}: {
	synthesizer: Synthesizer;
	controller: SoundFontDialog;
	onClose: () => void;
	soundFontStore: SoundFontStore;
	updateChannel: UpdateChannel;
}) {
	const [instrumentKey, _setInstrumentKey] = useState(
		controller.channel.instrumentKey,
	);
	const setInstrumentKey = (key: InstrumentKey) => {
		_setInstrumentKey(key);
		synthesizer.setBank({
			channel: PREVIEW_CHANNEL_NUMBER,
			bankNumber: key.bankNumber,
		});
		synthesizer.setPreset({
			channel: PREVIEW_CHANNEL_NUMBER,
			programNumber: key.presetNumber,
		});
	};

	const soundFont = useStateful(soundFontStore, () =>
		soundFontStore.getOrLoad(instrumentKey.url),
	);
	const selectedPreinstalledSoundFont = PreInstalledSouindFonts.find(
		(sf) => sf.soundFontUrl === instrumentKey.url,
	);

	const handleKeyboardPointerDown = (key: number) => {
		synthesizer.noteOn({ channel: PREVIEW_CHANNEL_NUMBER, key, velocity: 100 });
	};

	const handleKeyboardPointerUp = (key: number) => {
		synthesizer.noteOff({ channel: PREVIEW_CHANNEL_NUMBER, key });
	};

	const onSubmit = () => {
		updateChannel(controller.channel.id, {
			instrumentKey,
		});

		onClose();
	};

	useEffect(() => {
		synthesizer.reset(PREVIEW_CHANNEL_NUMBER);
	}, [synthesizer]);

	return (
		<Dialog open modal onClose={onClose}>
			<Dialog.Header>
				楽器を変更: {controller.channel.labelOrDefault}
			</Dialog.Header>
			<Dialog.Body>
				<Form>
					<Form.Row>
						<Form.Field label="サウンドフォント" flex>
							<Select
								value={instrumentKey.url}
								onChange={(soundFontName) => {
									const soundFont = PreInstalledSouindFonts.find(
										(sf) => sf.name === soundFontName,
									);
									if (soundFont === undefined) return;

									setInstrumentKey(new InstrumentKey(soundFont.name, 0, 0));
								}}
							>
								{PreInstalledSouindFonts.map((soundFont) => (
									<Select.Option
										value={soundFont.soundFontUrl}
										key={soundFont.soundFontUrl}
									>
										{soundFont.name}
									</Select.Option>
								))}
							</Select>
							<footer
								css={{
									margin: "4px 0 0",
									display: "flex",
									flexDirection: "row",
									justifyContent: "flex-end",
									alignItems: "baseline",
									gap: 8,
								}}
							>
								{selectedPreinstalledSoundFont === undefined ? null : (
									<>
										<Link
											href={selectedPreinstalledSoundFont.licenseUrl}
											target="_blank"
										>
											<MdOpenInNew />
											ライセンス
										</Link>
										<Link
											href={selectedPreinstalledSoundFont.creatorUrl}
											target="_blank"
										>
											<MdOpenInNew />
											配布元
										</Link>
									</>
								)}
							</footer>
						</Form.Field>
					</Form.Row>
					<Form.Row
						css={{
							maxHeight: 400,
							flexDirection: "row",
							alignItems: "stretcn",
						}}
					>
						<div
							css={{
								display: "flex",
								flexDirection: "row",
								gap: 16,
								width: "100%",
								maxHeight: "400px",
							}}
						>
							<div css={{ width: 200 }}>
								<Form.Field label="プリセット">
									{soundFont?.status === "fulfilled" ? (
										<ListBox
											value={instrumentKey.presetNumber}
											onChange={(presetNumber) => {
												setInstrumentKey(
													new InstrumentKey(
														instrumentKey.name,
														presetNumber as number,
														0,
													),
												);
											}}
										>
											<ListBox.OptionList>
												{soundFont.value.getPresetNames().map((preset) => (
													<ListBox.Option
														key={preset.number}
														value={preset.number}
													>
														{preset.number}: {preset.name}
													</ListBox.Option>
												))}
											</ListBox.OptionList>
										</ListBox>
									) : soundFont?.status === "pending" ? (
										<span>ロード中...</span>
									) : soundFont?.status === "rejected" ? (
										<span>サウンドフォントの読み込みに失敗しました</span>
									) : null}
								</Form.Field>
							</div>
							<div css={{ width: 200 }}>
								<Form.Field label="バンク">
									{soundFont?.status === "fulfilled" ? (
										<ListBox
											value={instrumentKey.presetNumber}
											onChange={(bankNumber) => {
												setInstrumentKey(
													new InstrumentKey(
														instrumentKey.name,
														instrumentKey.presetNumber,
														bankNumber as number,
													),
												);
											}}
										>
											<ListBox.OptionList>
												{soundFont.value
													.getPresetsByPresetNumber(instrumentKey.presetNumber)
													.map((preset) => (
														<ListBox.Option
															key={preset.bankNumber}
															value={preset.bankNumber}
														>
															{preset.bankNumber}: {preset.name}
														</ListBox.Option>
													))}
											</ListBox.OptionList>
										</ListBox>
									) : soundFont?.status === "pending" ? (
										<span>ロード中...</span>
									) : soundFont?.status === "rejected" ? (
										<span>サウンドフォントの読み込みに失敗しました</span>
									) : null}
								</Form.Field>
							</div>
							<Form.Field flex label="プレビュー">
								<div
									css={{
										flex: "1 1 0",
										overflowX: "scroll",
										maxWidth: "800px",
									}}
								>
									<Keyboard
										onPointerDown={handleKeyboardPointerDown}
										onPointerUp={handleKeyboardPointerUp}
									/>
								</div>
							</Form.Field>
						</div>
					</Form.Row>
				</Form>
			</Dialog.Body>
			<Dialog.Footer>
				<Button onClick={onClose}>キャンセル</Button>
				<Button variant="primary" onClick={onSubmit}>
					決定
				</Button>
			</Dialog.Footer>
		</Dialog>
	);
}

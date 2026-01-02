import { useEffect, useState } from "react";
import { MdOpenInNew } from "react-icons/md";
import { css, cx } from "../../styled-system/css";
import { flex } from "../../styled-system/patterns";
import { Channel } from "../models/Channel.ts";
import { InstrumentKey } from "../models/InstrumentKey.ts";
import { PreInstalledSouindFonts } from "../PreInstalledSouindFonts.ts";
import { PromiseState } from "../PromiseState.ts";
import { Button } from "../react/Button.tsx";
import { Dialog } from "../react/Dialog.tsx";
import { Field } from "../react/Field.tsx";
import { Keyboard } from "../react/Keyboard.tsx";
import { Link } from "../react/Link.tsx";
import { ListBox } from "../react/ListBox/ListBox.tsx";
import type { OverlayPortal } from "../react/OverlayPortal.ts";
import { SelectField } from "../react/Select/Select.tsx";
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
		readonly channelMetadata: Channel["metadata"],
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

const PREVIEW_CHANNEL_ID = Channel.generateId();

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
		controller.channelMetadata.instrumentKey,
	);
	const setInstrumentKey = (key: InstrumentKey) => {
		_setInstrumentKey(key);
		synthesizer.setBank({
			channel: PREVIEW_CHANNEL_ID,
			bankNumber: key.bankNumber,
		});
		synthesizer.setPreset({
			channel: PREVIEW_CHANNEL_ID,
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
		synthesizer.noteOn({ channel: PREVIEW_CHANNEL_ID, key, velocity: 100 });
	};

	const handleKeyboardPointerUp = (key: number) => {
		synthesizer.noteOff({ channel: PREVIEW_CHANNEL_ID, key });
	};

	const onSubmit = () => {
		updateChannel(controller.channelMetadata.id, {
			instrumentKey,
		});

		onClose();
	};

	useEffect(() => {
		synthesizer.reset(PREVIEW_CHANNEL_ID);
	}, [synthesizer]);

	return (
		<Dialog open modal onClose={onClose}>
			<Dialog.Header>
				楽器を変更: {Channel.getLabelOrDefault(controller.channelMetadata)}
			</Dialog.Header>
			<Dialog.Body>
				<div
					className={css({
						position: "relative",
						display: "flex",
						flexDirection: "column",
						alignItems: "stretch",
						gap: 8,
						flex: "1 1 auto",
						minHeight: 0,
					})}
				>
					<SelectField
						label="サウンドフォント"
						selectProps={{
							value: instrumentKey.url,
							onChange: (option) => {
								const soundFont = PreInstalledSouindFonts.find(
									(sf) => sf.name === option.id,
								);
								if (soundFont === undefined) return;

								setInstrumentKey(new InstrumentKey(soundFont.name, 0, 0));
							},
							options: PreInstalledSouindFonts.map((soundFont) => ({
								label: soundFont.name,
								id: soundFont.name,
							})),
						}}
					/>
					<footer
						className={cx(
							flex({
								direction: "row",
								alignItems: "baseline",
								justifyContent: "end",
								gap: 8,
							}),
							css({ margin: "4px 0 0" }),
						)}
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
					<div
						className={cx(
							flex({
								flex: "1 1 auto",
								minHeight: 0,
								direction: "row",
								alignItems: "stretch",
								justifyContent: "stretch",
								gap: 16,
							}),
						)}
					>
						<div
							className={cx(
								flex({
									direction: "row",
									alignItems: "stretch",
									justifyContent: "stretch",
								}),
							)}
						>
							<Field label="プリセット">
								{PromiseState.isFulfilled(soundFont) ? (
									<ListBox
										options={[
											...soundFont.getPresetNames().map((preset) => ({
												label: `${preset.presetNumber}: ${preset.name}`,
												id: preset.presetNumber.toString(),
											})),
										]}
										onChange={(presetNumber) => {
											if (presetNumber === null) return;
											setInstrumentKey(
												new InstrumentKey(
													instrumentKey.name,
													Number.parseInt(presetNumber),
													0,
												),
											);
										}}
									/>
								) : PromiseState.isPending(soundFont) ? (
									<span>ロード中...</span>
								) : PromiseState.isRejected(soundFont) ? (
									<span>サウンドフォントの読み込みに失敗しました</span>
								) : null}
							</Field>
						</div>
						<div
							className={cx(
								flex({
									direction: "row",
									alignItems: "stretch",
									justifyContent: "stretch",
								}),
							)}
						>
							<Field label="バンク">
								{PromiseState.isFulfilled(soundFont) ? (
									<ListBox
										value={instrumentKey.presetNumber.toString()}
										onChange={(bankNumber) => {
											if (bankNumber === null) return;
											setInstrumentKey(
												new InstrumentKey(
													instrumentKey.name,
													instrumentKey.presetNumber,
													Number.parseInt(bankNumber),
												),
											);
										}}
										options={[
											...soundFont
												.getPresetsByPresetNumber(instrumentKey.presetNumber)
												.map((preset) => ({
													label: `${preset.bankNumber}: ${preset.name}`,
													id: preset.bankNumber.toString(),
												})),
										]}
									/>
								) : PromiseState.isPending(soundFont) ? (
									<span>ロード中...</span>
								) : PromiseState.isRejected(soundFont) ? (
									<span>サウンドフォントの読み込みに失敗しました</span>
								) : null}
							</Field>
						</div>
						<div
							className={cx(
								flex({
									direction: "row",
									alignItems: "stretch",
									justifyContent: "stretch",
								}),
								css({
									flex: "1 1 auto",
									minWidth: 0,
								}),
							)}
						>
							<Field label="プレビュー">
								<Keyboard
									onPointerDown={handleKeyboardPointerDown}
									onPointerUp={handleKeyboardPointerUp}
								/>
							</Field>
						</div>
					</div>
				</div>
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

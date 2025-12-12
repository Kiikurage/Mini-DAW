import { ComponentKey, type DIContainer } from "./Dependency/DIContainer.ts";
import type { EventBus } from "./EventBus.ts";
import type { Hash } from "./Hashable.ts";
import { assertNotNullish } from "./lib.ts";
import type { Instrument } from "./models/Instrument.ts";
import type { InstrumentKey } from "./models/InstrumentKey.ts";
import { PromiseState } from "./PromiseState.ts";
import { Stateful } from "./Stateful/Stateful.ts";

export class InstrumentStoreState {
	private readonly instruments: Map<Hash, PromiseState<Instrument>>;

	constructor(
		props: {
			instruments: Map<Hash, PromiseState<Instrument>>;
		} = {
			instruments: new Map(),
		},
	) {
		this.instruments = props.instruments;
	}

	get(key: InstrumentKey): PromiseState<Instrument> | undefined {
		return this.instruments.get(key.hash());
	}

	set(key: InstrumentKey, value: PromiseState<Instrument>) {
		const newInstruments = new Map(this.instruments);
		newInstruments.set(key.hash(), value);

		return new InstrumentStoreState({ instruments: newInstruments });
	}
}

/**
 * 楽器を読み込み管理するクラス
 */
export class InstrumentStore extends Stateful<InstrumentStoreState> {
	static readonly Key = ComponentKey.of(InstrumentStore);

	constructor(
		bus: EventBus,
		private readonly deps: DIContainer,
	) {
		super(new InstrumentStoreState());

		bus
			.on("song.set.after", (song) => {
				for (const channel of song.channels) {
					this.getOrLoad(channel.instrumentKey);
				}
			})
			.on("channel.add.after", (channel) => {
				this.getOrLoad(channel.instrumentKey);
			})
			.on("channel.update.after", (channelId, patch) => {
				if (patch.instrumentKey !== undefined) {
					this.getOrLoad(patch.instrumentKey);
				}
			});
	}

	getOrLoad(key: InstrumentKey): PromiseState<Instrument> {
		{
			const promiseState = this.state.get(key);
			if (promiseState !== undefined) return promiseState;
		}

		void this.load(key);
		const promiseState = this.state.get(key);
		assertNotNullish(promiseState);

		return promiseState;
	}

	private async load(key: InstrumentKey): Promise<Instrument> {
		this.updateState((state) => state.set(key, PromiseState.pending()));

		try {
			const instrument = await key.load(this.deps);
			this.updateState((state) =>
				state.set(key, PromiseState.fulfilled(instrument)),
			);
			return instrument;
		} catch (error) {
			this.updateState((state) => state.set(key, PromiseState.rejected(error)));
			throw error;
		}
	}
}

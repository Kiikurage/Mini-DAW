import { ComponentKey } from "./Dependency/DIContainer.ts";
import { assertNotNullish } from "./lib.ts";
import { PromiseState } from "./PromiseState.ts";
import { SoundFont } from "./SoundFont/SoundFont.ts";
import { Stateful } from "./Stateful/Stateful.ts";

interface SoundFontStateAndPromise {
	state: PromiseState<SoundFont>;
	promise: Promise<SoundFont>;
}

export class SoundFontStoreState {
	private readonly entries: ReadonlyMap<string, SoundFontStateAndPromise>;

	constructor(
		props: {
			entries: ReadonlyMap<string, SoundFontStateAndPromise>;
		} = {
			entries: new Map(),
		},
	) {
		this.entries = props.entries;
	}

	get(url: string): SoundFontStateAndPromise | undefined {
		return this.entries.get(url);
	}

	set(url: string, value: SoundFontStateAndPromise) {
		const newEntries = new Map(this.entries);
		newEntries.set(url, value);

		return new SoundFontStoreState({ entries: newEntries });
	}
}

/**
 * サウンドフォントを読み込み管理するクラス
 */
export class SoundFontStore extends Stateful<SoundFontStoreState> {
	static readonly Key = ComponentKey.of(SoundFontStore);

	constructor() {
		super(new SoundFontStoreState());
	}

	getOrLoad(url: string): PromiseState<SoundFont> {
		{
			const existingEntry = this.state.get(url);
			if (existingEntry !== undefined) return existingEntry.state;
		}

		void this.load(url);
		const entry = this.state.get(url);
		assertNotNullish(entry);

		return entry.state;
	}

	async load(url: string): Promise<SoundFont> {
		const existingEntry = this.state.get(url);
		if (existingEntry !== undefined) {
			return existingEntry.promise;
		}
		const promise = SoundFont.load(url);
		this.updateState((state) =>
			state.set(url, { state: PromiseState.pending(), promise }),
		);

		try {
			const entry = await promise;
			this.updateState((state) =>
				state.set(url, {
					state: PromiseState.fulfilled(entry),
					promise: Promise.resolve(entry),
				}),
			);
			return entry;
		} catch (error) {
			this.updateState((state) => {
				state.set(url, {
					state: PromiseState.rejected(error),
					promise: Promise.reject(error),
				});
				return state;
			});
			throw error;
		}
	}
}

const BRAND_TYPE_KEY = Symbol("DIContainer.InstanceKey.BRAND_TYPE");

export type ComponentKey<T> = {
	label: string;
	[BRAND_TYPE_KEY]: T;
};

export const ComponentKey = Object.assign(
	function InstanceKey<T>(label: string): ComponentKey<T> {
		return { label } as ComponentKey<T>;
	},
	{
		of<T>(cls: { new (...args: never): T; name: string }): ComponentKey<T> {
			return ComponentKey<T>(cls.name);
		},
	},
);

export function singleton<T>(fn: () => T): () => T {
	let instance: T | undefined;
	return () => {
		if (instance === undefined) {
			instance = fn();
		}
		return instance;
	};
}

export class DIContainer {
	private readonly components = new Map<ComponentKey<unknown>, () => unknown>();

	set<T>(key: ComponentKey<T>, fn: (container: DIContainer) => T): this {
		if (this.components.has(key)) {
			throw new Error(
				`Component with key "${key.label}" is already registered.`,
			);
		}
		this.components.set(
			key,
			singleton(() => fn(this)),
		);
		return this;
	}

	get<T>(key: ComponentKey<T>): T {
		const fn = this.components.get(key);
		if (!fn) {
			throw new Error(`Component with key "${key.label}" is not registered.`);
		}
		return fn() as T;
	}
}

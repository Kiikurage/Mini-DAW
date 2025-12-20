export class EventEmitter<
	E extends Record<keyof E, unknown[]> = Record<string, any>,
> {
	private readonly callbackMap = new Map<
		string,
		Set<(...args: unknown[]) => void>
	>();

	on<K extends keyof E>(eventName: K, callback: (...args: E[K]) => void): this {
		let callbacks = this.callbackMap.get(eventName as string);
		if (callbacks === undefined) {
			callbacks = new Set();
			this.callbackMap.set(eventName as string, callbacks);
		}
		callbacks.add(callback as (...args: unknown[]) => void);

		return this;
	}

	off<K extends keyof E>(
		eventName: K,
		callback: (...args: E[K]) => void,
	): this {
		const callbacks = this.callbackMap.get(eventName as string);
		if (callbacks !== undefined) {
			callbacks.delete(callback as (...args: unknown[]) => void);
			if (callbacks.size === 0) {
				this.callbackMap.delete(eventName as string);
			}
		}
		return this;
	}

	emit<K extends keyof E>(eventName: K, ...args: E[K]): void {
		const callbacks = this.callbackMap.get(eventName as string);
		if (callbacks === undefined) return;
		for (const callback of callbacks) {
			callback(...args);
		}
	}
}

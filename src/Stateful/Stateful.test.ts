import { describe, expect, it, mock } from "bun:test";
import { Stateful } from "./Stateful.ts";

describe("Stateful", () => {
	it("State must be initialized with the specified value", () => {
		const stateful = new Stateful<number>(42);
		expect(stateful.state).toBe(42);
	});

	it("setState should update the state", () => {
		const stateful = new (class extends Stateful<number> {
			public setStatePublic(newState: number) {
				this.setState(newState);
			}
		})(0);

		stateful.setStatePublic(10);
		expect(stateful.state).toBe(10);
	});

	it("setState should notify listeners", () => {
		const stateful = new (class extends Stateful<number> {
			public setStatePublic(newState: number) {
				this.setState(newState);
			}
		})(0);

		const onUpdate = mock(() => {});
		stateful.addChangeListener(onUpdate);

		stateful.setStatePublic(20);
		expect(onUpdate).toBeCalledWith(20);
	});

	it("setState should not notify listeners when state is unchanged", () => {
		const stateful = new (class extends Stateful<number> {
			public setStatePublic(newState: number) {
				this.setState(newState);
			}
		})(20);

		const onUpdate = mock(() => {});
		stateful.addChangeListener(onUpdate);

		stateful.setStatePublic(20);
		expect(onUpdate).not.toBeCalled();
	});

	it("updateState should update the state based on the previous state", () => {
		const stateful = new (class extends Stateful<number> {
			public updateStatePublic(updater: (prevState: number) => number) {
				this.updateState(updater);
			}
		})(1);

		stateful.updateStatePublic((prev) => prev + 5);
		expect(stateful.state).toBe(6);
	});

	it("updateState should notify listeners", () => {
		const stateful = new (class extends Stateful<number> {
			public updateStatePublic(updater: (prevState: number) => number) {
				this.updateState(updater);
			}
		})(1);

		const onUpdate = mock(() => {});
		stateful.addChangeListener(onUpdate);

		stateful.updateStatePublic((prev) => prev + 5);
		expect(onUpdate).toBeCalledWith(6);
	});

	it("updateState should not notify listeners when state is unchanged", () => {
		const stateful = new (class extends Stateful<number> {
			public updateStatePublic(updater: (prevState: number) => number) {
				this.updateState(updater);
			}
		})(1);

		const onUpdate = mock(() => {});
		stateful.addChangeListener(onUpdate);

		stateful.updateStatePublic((prev) => prev);
		expect(onUpdate).not.toBeCalledWith();
	});

	it("addChangeListener should return the clean up function", () => {
		const stateful = new (class extends Stateful<number> {
			public setStatePublic(newState: number) {
				this.setState(newState);
			}
		})(0);

		const onUpdate = mock(() => {});
		const removeListener = stateful.addChangeListener(onUpdate);

		stateful.setStatePublic(10);
		expect(onUpdate).toBeCalledWith(10);

		removeListener();
		stateful.setStatePublic(20);
		expect(onUpdate).toBeCalledTimes(1); // Should not be called again
	});
});

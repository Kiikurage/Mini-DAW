import { describe, expect, it, mock } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { Stateful } from "./Stateful.ts";
import { useStateful } from "./useStateful.tsx";

describe("useStateful", () => {
	it("should return the current state value", () => {
		const stateful = new Stateful(42);

		const { result } = renderHook(() => useStateful(stateful));
		expect(result.current).toBe(42);
	});

	it("should receive the updated state value", () => {
		const stateful = new (class extends Stateful<number> {
			setStatePublic(value: number) {
				this.setState(value);
			}
		})(42);
		const onRender = mock(() => {});

		const { result } = renderHook(() => {
			onRender();
			return useStateful(stateful);
		});

		act(() => {
			stateful.setStatePublic(100);
		});

		expect(result.current).toBe(100);
		expect(onRender).toBeCalledTimes(2);
	});

	it("should not trigger rendering if value is not changed", () => {
		const stateful = new (class extends Stateful<number> {
			setStatePublic(value: number) {
				this.setState(value);
			}
		})(42);
		const onRender = mock(() => {});

		const { result } = renderHook(() => {
			onRender();
			return useStateful(stateful);
		});

		act(() => {
			stateful.setStatePublic(42);
		});

		expect(result.current).toBe(42);
		expect(onRender).toBeCalledTimes(1);
	});

	it("should return only the mapped value", () => {
		const stateful = new Stateful({ x: 4, y: 2 });
		const onRender = mock(() => {});

		const { result } = renderHook(() => {
			onRender();
			return useStateful(stateful, (state) => state.x * state.y);
		});

		expect(result.current).toBe(8);
		expect(onRender).toBeCalledTimes(1);
	});

	it("should not trigger rendering if mapped value is not changed", () => {
		const stateful = new (class extends Stateful<{
			x: number;
			y: number;
		}> {
			setStatePublic(value: { x: number; y: number }) {
				this.setState(value);
			}
		})({ x: 4, y: 2 });
		const onRender = mock(() => {});

		const { result } = renderHook(() => {
			onRender();
			return useStateful(stateful, (state) => state.x * state.y);
		});

		act(() => {
			stateful.setStatePublic({ x: 2, y: 4 });
		});

		expect(result.current).toBe(8);
		expect(onRender).toBeCalledTimes(1);
	});
});

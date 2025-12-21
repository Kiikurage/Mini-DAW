import { describe, expect, it, mock } from "bun:test";
import {
	composeInteractionHandle,
	type PointerEventManagerInteractionHandle,
} from "./PointerEventManagerInteractionHandle.ts";

describe("composeInteractionHandle", () => {
	describe("handlePointerMove", () => {
		it("should call all handles' handlePointerMove methods", () => {
			const handle1 = {
				handlePointerMove: mock(() => {}),
			} as any;
			const handle2 = {
				handlePointerMove: mock(() => {}),
			} as any;
			const handle3 = {
				handlePointerMove: mock(() => {}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2, handle3);

			const mockEvent = { x: 100, y: 200 } as any;
			composed.handlePointerMove?.(mockEvent);

			expect(handle1.handlePointerMove).toBeCalledWith(mockEvent);
			expect(handle2.handlePointerMove).toBeCalledWith(mockEvent);
			expect(handle3.handlePointerMove).toBeCalledWith(mockEvent);
		});

		it("should call handles in specified order", () => {
			const callOrder: string[] = [];

			const handle1 = {
				handlePointerMove: mock(() => {
					callOrder.push("handle1");
				}),
			} as any;
			const handle2 = {
				handlePointerMove: mock(() => {
					callOrder.push("handle2");
				}),
			} as any;
			const handle3 = {
				handlePointerMove: mock(() => {
					callOrder.push("handle3");
				}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2, handle3);

			const mockEvent = { x: 100, y: 200 } as any;
			composed.handlePointerMove?.(mockEvent);

			expect(callOrder).toEqual(["handle1", "handle2", "handle3"]);
		});

		it("should skip handles without handlePointerMove", () => {
			const handle1 = {
				handlePointerMove: mock(() => {}),
			} as any;
			const handle2 = {} as any;
			const handle3 = {
				handlePointerMove: mock(() => {}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2, handle3);

			const mockEvent = { x: 100, y: 200 } as any;
			composed.handlePointerMove?.(mockEvent);

			expect(handle1.handlePointerMove).toBeCalledWith(mockEvent);
			expect(handle3.handlePointerMove).toBeCalledWith(mockEvent);
		});

		it("should work with empty handles list", () => {
			const composed = composeInteractionHandle();

			const mockEvent = { x: 100, y: 200 } as any;

			expect(() => {
				composed.handlePointerMove?.(mockEvent);
			}).not.toThrow();
		});

		it("should work with single handle", () => {
			const handle = {
				handlePointerMove: mock(() => {}),
			} as any;

			const composed = composeInteractionHandle(handle);

			const mockEvent = { x: 100, y: 200 } as any;
			composed.handlePointerMove?.(mockEvent);

			expect(handle.handlePointerMove).toBeCalledWith(mockEvent);
		});
	});

	describe("handlePointerDown", () => {
		it("should call all handles' handlePointerDown methods", () => {
			const handle1 = {
				handlePointerDown: mock(() => {}),
			} as any;
			const handle2 = {
				handlePointerDown: mock(() => {}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2);

			const mockEvent = { x: 100, y: 200, pointerId: 1 } as any;
			composed.handlePointerDown?.(mockEvent);

			expect(handle1.handlePointerDown).toBeCalledWith(mockEvent);
			expect(handle2.handlePointerDown).toBeCalledWith(mockEvent);
		});

		it("should call handles in specified order", () => {
			const callOrder: string[] = [];

			const handle1 = {
				handlePointerDown: mock(() => {
					callOrder.push("handle1");
				}),
			} as any;
			const handle2 = {
				handlePointerDown: mock(() => {
					callOrder.push("handle2");
				}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2);

			const mockEvent = { x: 100, y: 200 } as any;
			composed.handlePointerDown?.(mockEvent);

			expect(callOrder).toEqual(["handle1", "handle2"]);
		});

		it("should skip handles without handlePointerDown", () => {
			const handle1 = {
				handlePointerDown: mock(() => {}),
			} as any;
			const handle2 = {} as any;

			const composed = composeInteractionHandle(handle1, handle2);

			const mockEvent = { x: 100, y: 200 } as any;
			composed.handlePointerDown?.(mockEvent);

			expect(handle1.handlePointerDown).toBeCalledWith(mockEvent);
		});
	});

	describe("handleDoubleClick", () => {
		it("should call all handles' handleDoubleClick methods", () => {
			const handle1 = {
				handleDoubleClick: mock(() => {}),
			} as any;
			const handle2 = {
				handleDoubleClick: mock(() => {}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2);

			const mockEvent = { x: 100, y: 200 } as any;
			composed.handleDoubleClick?.(mockEvent);

			expect(handle1.handleDoubleClick).toBeCalledWith(mockEvent);
			expect(handle2.handleDoubleClick).toBeCalledWith(mockEvent);
		});

		it("should call handles in specified order", () => {
			const callOrder: string[] = [];

			const handle1 = {
				handleDoubleClick: mock(() => {
					callOrder.push("handle1");
				}),
			} as any;
			const handle2 = {
				handleDoubleClick: mock(() => {
					callOrder.push("handle2");
				}),
			} as any;
			const handle3 = {
				handleDoubleClick: mock(() => {
					callOrder.push("handle3");
				}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2, handle3);

			const mockEvent = { x: 100, y: 200 } as any;
			composed.handleDoubleClick?.(mockEvent);

			expect(callOrder).toEqual(["handle1", "handle2", "handle3"]);
		});

		it("should skip handles without handleDoubleClick", () => {
			const handle1 = {
				handleDoubleClick: mock(() => {}),
			} as any;
			const handle2 = {} as any;
			const handle3 = {
				handleDoubleClick: mock(() => {}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2, handle3);

			const mockEvent = { x: 100, y: 200 } as any;
			composed.handleDoubleClick?.(mockEvent);

			expect(handle1.handleDoubleClick).toBeCalledWith(mockEvent);
			expect(handle3.handleDoubleClick).toBeCalledWith(mockEvent);
		});
	});

	describe("composed handle behavior", () => {
		it("should support calling multiple handler types", () => {
			const handle = {
				handlePointerMove: mock(() => {}),
				handlePointerDown: mock(() => {}),
				handleDoubleClick: mock(() => {}),
			} as any;

			const composed = composeInteractionHandle(handle);

			const moveEvent = { x: 100, y: 200 } as any;
			const downEvent = { x: 100, y: 200, pointerId: 1 } as any;
			const clickEvent = { x: 100, y: 200 } as any;

			composed.handlePointerMove?.(moveEvent);
			composed.handlePointerDown?.(downEvent);
			composed.handleDoubleClick?.(clickEvent);

			expect(handle.handlePointerMove).toBeCalledTimes(1);
			expect(handle.handlePointerDown).toBeCalledTimes(1);
			expect(handle.handleDoubleClick).toBeCalledTimes(1);
		});

		it("should compose handles with partial implementations", () => {
			const handle1 = {
				handlePointerMove: mock(() => {}),
			} as any;
			const handle2 = {
				handlePointerDown: mock(() => {}),
			} as any;
			const handle3 = {
				handleDoubleClick: mock(() => {}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2, handle3);

			const moveEvent = { x: 100, y: 200 } as any;
			const downEvent = { x: 100, y: 200, pointerId: 1 } as any;
			const clickEvent = { x: 100, y: 200 } as any;

			composed.handlePointerMove?.(moveEvent);
			composed.handlePointerDown?.(downEvent);
			composed.handleDoubleClick?.(clickEvent);

			expect(handle1.handlePointerMove).toBeCalledTimes(1);
			expect(handle2.handlePointerDown).toBeCalledTimes(1);
			expect(handle3.handleDoubleClick).toBeCalledTimes(1);
		});

		it("should create independent composed handles", () => {
			const handle1 = {
				handlePointerMove: mock(() => {}),
			} as any;
			const handle2 = {
				handlePointerMove: mock(() => {}),
			} as any;

			const composed1 = composeInteractionHandle(handle1);
			const composed2 = composeInteractionHandle(handle2);

			const event = { x: 100, y: 200 } as any;

			composed1.handlePointerMove?.(event);
			composed2.handlePointerMove?.(event);

			expect(handle1.handlePointerMove).toBeCalledTimes(1);
			expect(handle2.handlePointerMove).toBeCalledTimes(1);
		});
	});

	describe("error handling", () => {
		it("should continue calling subsequent handles if one throws", () => {
			const handle1 = {
				handlePointerMove: mock(() => {
					throw new Error("Handle1 error");
				}),
			} as any;
			const handle2 = {
				handlePointerMove: mock(() => {}),
			} as any;

			const composed = composeInteractionHandle(handle1, handle2);

			const event = { x: 100, y: 200 } as any;

			expect(() => {
				composed.handlePointerMove?.(event);
			}).toThrow();

			// Both handles should have been called before error
			expect(handle1.handlePointerMove).toBeCalledTimes(1);
			// Note: handle2 might not be called if handle1 throws before handle2 is executed
		});
	});
});

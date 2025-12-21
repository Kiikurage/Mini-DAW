import { describe, expect, it, mock } from "bun:test";
import { EventEmitter } from "./EventEmitter.ts";

describe("EventEmitter", () => {
	describe("on", () => {
		it("should register a listener", () => {
			const emitter = new EventEmitter<{ test: [string] }>();
			const callback = mock(() => {});

			emitter.on("test", callback);
			emitter.emit("test", "value");

			expect(callback).toBeCalledWith("value");
		});

		it("should return the emitter for chaining", () => {
			const emitter = new EventEmitter<{ test: [] }>();
			const callback = mock(() => {});

			const result = emitter.on("test", callback);

			expect(result).toBe(emitter);
		});

		it("should allow multiple listeners for the same event", () => {
			const emitter = new EventEmitter<{ test: [number] }>();
			const callback1 = mock(() => {});
			const callback2 = mock(() => {});

			emitter.on("test", callback1);
			emitter.on("test", callback2);
			emitter.emit("test", 42);

			expect(callback1).toBeCalledWith(42);
			expect(callback2).toBeCalledWith(42);
		});

		it("should handle events with multiple arguments", () => {
			const emitter = new EventEmitter<{ test: [string, number] }>();
			const callback = mock(() => {});

			emitter.on("test", callback);
			emitter.emit("test", "hello", 123);

			expect(callback).toBeCalledWith("hello", 123);
		});
	});

	describe("off", () => {
		it("should remove a listener", () => {
			const emitter = new EventEmitter<{ test: [string] }>();
			const callback = mock(() => {});

			emitter.on("test", callback);
			emitter.off("test", callback);
			emitter.emit("test", "value");

			expect(callback).not.toBeCalled();
		});

		it("should return the emitter for chaining", () => {
			const emitter = new EventEmitter<{ test: [] }>();
			const callback = mock(() => {});

			emitter.on("test", callback);
			const result = emitter.off("test", callback);

			expect(result).toBe(emitter);
		});

		it("should not throw when removing non-existent listener", () => {
			const emitter = new EventEmitter<{ test: [] }>();
			const callback = mock(() => {});

			expect(() => emitter.off("test", callback)).not.toThrow();
		});

		it("should remove only the specified listener", () => {
			const emitter = new EventEmitter<{ test: [number] }>();
			const callback1 = mock(() => {});
			const callback2 = mock(() => {});

			emitter.on("test", callback1);
			emitter.on("test", callback2);
			emitter.off("test", callback1);
			emitter.emit("test", 42);

			expect(callback1).not.toBeCalled();
			expect(callback2).toBeCalledWith(42);
		});
	});

	describe("emit", () => {
		it("should call all listeners for an event", () => {
			const emitter = new EventEmitter<{ test: [string] }>();
			const callback1 = mock(() => {});
			const callback2 = mock(() => {});

			emitter.on("test", callback1);
			emitter.on("test", callback2);
			emitter.emit("test", "value");

			expect(callback1).toBeCalledWith("value");
			expect(callback2).toBeCalledWith("value");
		});

		it("should not throw when emitting event with no listeners", () => {
			const emitter = new EventEmitter<{ test: [] }>();

			expect(() => emitter.emit("test")).not.toThrow();
		});

		it("should pass correct arguments to listeners", () => {
			const emitter = new EventEmitter<{
				event1: [string];
				event2: [number, boolean];
			}>();
			const callback1 = mock(() => {});
			const callback2 = mock(() => {});

			emitter.on("event1", callback1);
			emitter.on("event2", callback2);
			emitter.emit("event1", "hello");
			emitter.emit("event2", 42, true);

			expect(callback1).toBeCalledWith("hello");
			expect(callback2).toBeCalledWith(42, true);
		});

		it("should not trigger listeners of other events", () => {
			const emitter = new EventEmitter<{ test: []; other: [] }>();
			const callback = mock(() => {});

			emitter.on("test", callback);
			emitter.emit("other");

			expect(callback).not.toBeCalled();
		});
	});

	describe("chaining", () => {
		it("should support chaining on, off, and emit", () => {
			const emitter = new EventEmitter<{ test: [number] }>();
			const callback = mock(() => {});

			const result = emitter.on("test", callback).emit("test", 42);

			expect(callback).toBeCalledWith(42);
		});
	});

	describe("edge cases", () => {
		it("should handle listener that modifies the event map during emit", () => {
			const emitter = new EventEmitter<{ test: [] }>();
			const callback1 = mock(() => {});
			const callback2 = mock(() => {});

			emitter.on("test", callback1);
			emitter.on("test", callback2);

			expect(() => emitter.emit("test")).not.toThrow();
			expect(callback1).toBeCalled();
			expect(callback2).toBeCalled();
		});

		it("should handle multiple calls to on with same callback", () => {
			const emitter = new EventEmitter<{ test: [number] }>();
			const callback = mock(() => {});

			emitter.on("test", callback);
			emitter.on("test", callback);
			emitter.emit("test", 42);

			// Set-based storage means duplicate callbacks are deduplicated
			expect(callback).toBeCalledTimes(1);
		});

		it("should remove all listeners when last one is removed", () => {
			const emitter = new EventEmitter<{ test: [] }>();
			const callback = mock(() => {});

			emitter.on("test", callback);
			emitter.off("test", callback);

			// Emit should not throw and no callbacks should be called
			expect(() => emitter.emit("test")).not.toThrow();
		});
	});
});

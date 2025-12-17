import { describe, expect, it } from "bun:test";
import { ControlChangeList } from "./ControlChangeList.ts";

describe("ControlChangeList", () => {
	describe("constructor", () => {
		it("should create an empty list", () => {
			const list = ControlChangeList.create();
			expect(list.messages).toEqual([]);
		});
	});

	describe("put", () => {
		it("should add a message to an empty list", () => {
			const list = ControlChangeList.create().put([0], 64);

			expect(list.messages).toEqual([{ tick: 0, value: 64 }]);
		});

		it("should return a new instance", () => {
			const list1 = ControlChangeList.create();
			const list2 = list1.put([0], 64);

			expect(list1.messages).toEqual([]);
			expect(list2.messages).toEqual([{ tick: 0, value: 64 }]);
			expect(list2).not.toBe(list1);
		});

		it("should maintain sorted order when adding messages", () => {
			const list = ControlChangeList.create()
				.put([100], 100)
				.put([50], 50)
				.put([150], 150);

			expect(list.messages).toEqual([
				{ tick: 50, value: 50 },
				{ tick: 100, value: 100 },
				{ tick: 150, value: 150 },
			]);
		});

		it("should replace a message with the same tick", () => {
			const list = ControlChangeList.create()
				.put([0], 64)
				.put([100], 100)
				.put([0], 127); // Replace message at tick 0

			expect(list.messages).toEqual([
				{ tick: 0, value: 127 },
				{ tick: 100, value: 100 },
			]);
		});
	});

	describe("remove", () => {
		it("should remove a message by tick", () => {
			const list = ControlChangeList.create()
				.put([0], 0)
				.put([100], 100)
				.put([200], 200)
				.remove(100);

			expect(list.messages).toEqual([
				{ tick: 0, value: 0 },
				{ tick: 200, value: 200 },
			]);
		});

		it("should return a new instance", () => {
			const list1 = ControlChangeList.create().put([0], 64);
			const list2 = list1.remove(0);

			expect(list1).not.toBe(list2);
		});

		it("should not modify the list if message does not exist", () => {
			const list1 = ControlChangeList.create().put([0], 64);
			const list2 = list1.remove(100);

			expect(list1).toBe(list2);
			expect(list1.messages).toEqual([{ tick: 0, value: 64 }]);
		});

		it("should maintain sorted order after removing", () => {
			const list = ControlChangeList.create()
				.put([0], 0)
				.put([100], 100)
				.put([200], 200)
				.remove(100);

			expect(list.messages).toEqual([
				{ tick: 0, value: 0 },
				{ tick: 200, value: 200 },
			]);
		});

		it("should be able to remove the first message", () => {
			const list = ControlChangeList.create()
				.put([0], 0)
				.put([100], 100)
				.put([200], 200)
				.remove(0);

			expect(list.messages).toEqual([
				{ tick: 100, value: 100 },
				{ tick: 200, value: 200 },
			]);
		});

		it("should be able to remove the last message", () => {
			const list = ControlChangeList.create()
				.put([0], 0)
				.put([100], 100)
				.put([200], 200)
				.remove(200);

			expect(list.messages).toEqual([
				{ tick: 0, value: 0 },
				{ tick: 100, value: 100 },
			]);
		});

		it("should be able to remove the message resulting to be empty", () => {
			const list = ControlChangeList.create().put([0], 0).remove(0);

			expect(list.messages).toEqual([]);
		});
	});
});

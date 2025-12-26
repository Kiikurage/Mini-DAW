import { describe, expect, it } from "bun:test";
import { PromiseState } from "./PromiseState.ts";

describe("PromiseState", () => {
	describe("pending", () => {
		it("should create a pending state", () => {
			const state = PromiseState.pending();

			expect(PromiseState.isPending(state)).toBe(true);
			expect(PromiseState.isFulfilled(state)).toBe(false);
			expect(PromiseState.isRejected(state)).toBe(false);
		});

		it("should return the same instance", () => {
			const state1 = PromiseState.pending();
			const state2 = PromiseState.pending();

			expect(state1).toBe(state2);
		});
	});

	describe("rejected", () => {
		it("should create a rejected state with reason", () => {
			const reason = new Error("test error");
			const state = PromiseState.rejected(reason);

			expect(PromiseState.isRejected(state)).toBe(true);
			expect(PromiseState.isPending(state)).toBe(false);
			expect(PromiseState.isFulfilled(state)).toBe(false);
		});

		it("should store the rejection reason", () => {
			const reason = "error reason";
			const state = PromiseState.rejected(reason);

			expect(PromiseState.isRejected(state)).toBe(true);
		});

		it("should handle any rejection type", () => {
			const objectReason = { error: "test" };
			const state = PromiseState.rejected(objectReason);

			expect(PromiseState.isRejected(state)).toBe(true);
		});
	});

	describe("isFulfilled", () => {
		it("should return true for fulfilled state", () => {
			const fulfilled = { data: "value" };

			expect(PromiseState.isFulfilled(fulfilled)).toBe(true);
			expect(PromiseState.isPending(fulfilled)).toBe(false);
			expect(PromiseState.isRejected(fulfilled)).toBe(false);
		});

		it("should return false for pending state", () => {
			const state = PromiseState.pending();

			expect(PromiseState.isFulfilled(state)).toBe(false);
		});

		it("should return false for rejected state", () => {
			const state = PromiseState.rejected("error");

			expect(PromiseState.isFulfilled(state)).toBe(false);
		});
	});

	describe("isPending", () => {
		it("should return true for pending state", () => {
			const state = PromiseState.pending();

			expect(PromiseState.isPending(state)).toBe(true);
		});

		it("should return false for fulfilled state", () => {
			const fulfilled = { data: "value" };

			expect(PromiseState.isPending(fulfilled)).toBe(false);
		});

		it("should return false for rejected state", () => {
			const state = PromiseState.rejected("error");

			expect(PromiseState.isPending(state)).toBe(false);
		});
	});

	describe("isRejected", () => {
		it("should return true for rejected state", () => {
			const state = PromiseState.rejected("error");

			expect(PromiseState.isRejected(state)).toBe(true);
		});

		it("should return false for pending state", () => {
			const state = PromiseState.pending();

			expect(PromiseState.isRejected(state)).toBe(false);
		});

		it("should return false for fulfilled state", () => {
			const fulfilled = { data: "value" };

			expect(PromiseState.isRejected(fulfilled)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(PromiseState.isRejected(undefined)).toBe(false);
		});
	});

	describe("state transitions", () => {
		it("pending and fulfilled are mutually exclusive", () => {
			const pending = PromiseState.pending();
			const fulfilled = { data: "value" };

			expect(
				PromiseState.isPending(pending) && PromiseState.isFulfilled(pending),
			).toBe(false);
			expect(
				PromiseState.isPending(fulfilled) &&
					PromiseState.isFulfilled(fulfilled),
			).toBe(false);
		});

		it("pending and rejected are mutually exclusive", () => {
			const pending = PromiseState.pending();
			const rejected = PromiseState.rejected("error");

			expect(
				PromiseState.isPending(pending) && PromiseState.isRejected(pending),
			).toBe(false);
			expect(
				PromiseState.isPending(rejected) && PromiseState.isRejected(rejected),
			).toBe(false);
		});

		it("fulfilled and rejected are mutually exclusive", () => {
			const fulfilled = { data: "value" };
			const rejected = PromiseState.rejected("error");

			expect(
				PromiseState.isFulfilled(fulfilled) &&
					PromiseState.isRejected(fulfilled),
			).toBe(false);
			expect(
				PromiseState.isFulfilled(rejected) && PromiseState.isRejected(rejected),
			).toBe(false);
		});
	});
});

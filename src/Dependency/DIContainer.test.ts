import { describe, expect, it } from "bun:test";
import { ComponentKey, DIContainer, singleton } from "./DIContainer.ts";

describe("DIContainer", () => {
	describe("ComponentKey", () => {
		it("should create a unique key for a class", () => {
			class TestComponent {}
			const key = ComponentKey.of(TestComponent);

			expect(key.label).toBe("TestComponent");
		});

		it("should create unique keys for different classes", () => {
			class Component1 {}
			class Component2 {}

			const key1 = ComponentKey.of(Component1);
			const key2 = ComponentKey.of(Component2);

			expect(key1.label).not.toBe(key2.label);
		});

		it("should create generic keys with ComponentKey function", () => {
			const key = ComponentKey<string>("MyKey");

			expect(key.label).toBe("MyKey");
		});
	});

	describe("singleton", () => {
		it("should return the same instance on multiple calls", () => {
			let callCount = 0;
			const factory = singleton(() => {
				callCount++;
				return { value: callCount };
			});

			const instance1 = factory();
			const instance2 = factory();

			expect(instance1).toBe(instance2);
			expect(instance1.value).toBe(1);
			expect(callCount).toBe(1);
		});

		it("should handle different factory functions", () => {
			const factory1 = singleton(() => "value1");
			const factory2 = singleton(() => "value2");

			expect(factory1()).toBe("value1");
			expect(factory2()).toBe("value2");
		});
	});

	describe("set", () => {
		it("should register a component", () => {
			const container = new DIContainer();
			const key = ComponentKey.of(String);

			container.set(key, () => "test");

			expect(container.get(key)).toBe("test");
		});

		it("should throw when registering duplicate key", () => {
			const container = new DIContainer();
			const key = ComponentKey.of(String);

			container.set(key, () => "test");

			expect(() => container.set(key, () => "test2")).toThrow();
		});

		it("should support chaining", () => {
			const container = new DIContainer();
			const key1 = ComponentKey<string>("key1");
			const key2 = ComponentKey<number>("key2");

			const result = container.set(key1, () => "value1").set(key2, () => 42);

			expect(result).toBe(container);
			expect(container.get(key1)).toBe("value1");
			expect(container.get(key2)).toBe(42);
		});

		it("should automatically wrap components with singleton", () => {
			const container = new DIContainer();
			const key = ComponentKey<{ id: number }>("counter");
			let count = 0;

			container.set(key, () => {
				count++;
				return { id: count };
			});

			const instance1 = container.get(key);
			const instance2 = container.get(key);

			expect(instance1).toBe(instance2);
			expect(instance1.id).toBe(1);
		});

		it("should pass container to factory function", () => {
			const container = new DIContainer();
			const key1 = ComponentKey<string>("dependency");
			const key2 = ComponentKey<string>("dependent");

			container.set(key1, () => "dependency-value");
			container.set(key2, (c) => c.get(key1) + "-extended");

			expect(container.get(key2)).toBe("dependency-value-extended");
		});
	});

	describe("get", () => {
		it("should retrieve a registered component", () => {
			const container = new DIContainer();
			const key = ComponentKey<string>("test");

			container.set(key, () => "test-value");

			expect(container.get(key)).toBe("test-value");
		});

		it("should throw when component not found", () => {
			const container = new DIContainer();
			const key = ComponentKey<string>("nonexistent");

			expect(() => container.get(key)).toThrow();
		});

		it("should throw with descriptive message", () => {
			const container = new DIContainer();
			const key = ComponentKey<string>("missing");

			expect(() => container.get(key)).toThrow("missing");
		});

		it("should return singleton instance", () => {
			const container = new DIContainer();
			const key = ComponentKey<object>("singleton");

			container.set(key, () => ({}));

			const instance1 = container.get(key);
			const instance2 = container.get(key);

			expect(instance1).toBe(instance2);
		});
	});

	describe("integration", () => {
		it("should handle complex dependency graphs", () => {
			const container = new DIContainer();
			const keyA = ComponentKey<string>("A");
			const keyB = ComponentKey<string>("B");
			const keyC = ComponentKey<string>("C");

			container.set(keyA, () => "value-a");
			container.set(keyB, (c) => c.get(keyA) + "-b");
			container.set(keyC, (c) => c.get(keyB) + "-c");

			expect(container.get(keyC)).toBe("value-a-b-c");
		});

		it("should handle multiple container instances independently", () => {
			const container1 = new DIContainer();
			const container2 = new DIContainer();
			const key = ComponentKey<number>("value");

			container1.set(key, () => 1);
			container2.set(key, () => 2);

			expect(container1.get(key)).toBe(1);
			expect(container2.get(key)).toBe(2);
		});
	});
});

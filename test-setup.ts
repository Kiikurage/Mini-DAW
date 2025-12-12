import { GlobalRegistrator } from "@happy-dom/global-registrator";
import "@testing-library/jest-dom";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

GlobalRegistrator.register();

declare module "bun:test" {
	interface Matchers<T>
		extends TestingLibraryMatchers<typeof expect.stringContaining, T> {}
}

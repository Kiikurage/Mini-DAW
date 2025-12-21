import "@testing-library/jest-dom";
import { afterEach } from 'bun:test';
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";
import { cleanup } from "@testing-library/react";

declare module "bun:test" {
    interface Matchers<T>
        extends TestingLibraryMatchers<typeof expect.stringContaining, T> {
    }
}

afterEach(() => {
    cleanup();
});

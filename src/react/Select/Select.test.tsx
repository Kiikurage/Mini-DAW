import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Select } from "./Select.tsx";

describe("Select", () => {
	describe("rendering", () => {
		it("should render with default value", () => {
			render(
				<Select defaultValue="option1">
					<Select.Option value="option1">Option 1</Select.Option>
					<Select.Option value="option2">Option 2</Select.Option>
				</Select>,
			);

			expect(screen.getByText("option1")).toBeInTheDocument();
		});

		it("should render combobox role", () => {
			render(
				<Select defaultValue="option1">
					<Select.Option value="option1">Option 1</Select.Option>
				</Select>,
			);

			const combobox = screen.getByRole("combobox");
			expect(combobox).toBeInTheDocument();
			expect(combobox).toHaveAttribute("aria-expanded", "false");
		});

		it("should render arrow icon", () => {
			const { container } = render(
				<Select defaultValue="option1">
					<Select.Option value="option1">Option 1</Select.Option>
				</Select>,
			);

			const svg = container.querySelector("svg");
			expect(svg).toBeInTheDocument();
		});
	});

	describe("interaction", () => {
		it("should accept focus", () => {
			render(
				<Select defaultValue="option1">
					<Select.Option value="option1">Option 1</Select.Option>
					<Select.Option value="option2">Option 2</Select.Option>
				</Select>,
			);

			const combobox = screen.getByRole("combobox");
			combobox.focus();

			expect(combobox).toHaveFocus();
		});
	});

	describe("keyboard navigation", () => {
		it("should be focusable", () => {
			render(
				<Select defaultValue="option1">
					<Select.Option value="option1">Option 1</Select.Option>
					<Select.Option value="option2">Option 2</Select.Option>
					<Select.Option value="option3">Option 3</Select.Option>
				</Select>,
			);

			const combobox = screen.getByRole("combobox");
			expect(combobox).toHaveAttribute("tabindex", "0");
		});
	});

	describe("custom renderValue", () => {
		it("should use custom render function", () => {
			render(
				<Select
					defaultValue="a"
					renderValue={(value) => <>Selected: {value}</>}
				>
					<Select.Option value="a">Option A</Select.Option>
					<Select.Option value="b">Option B</Select.Option>
				</Select>,
			);

			expect(screen.getByText("Selected: a")).toBeInTheDocument();
		});
	});

	describe("controlled component", () => {
		it("should accept controlled value prop", () => {
			render(
				<Select value="option1">
					<Select.Option value="option1">Option 1</Select.Option>
					<Select.Option value="option2">Option 2</Select.Option>
				</Select>,
			);

			const combobox = screen.getByRole("combobox");
			expect(combobox).toBeInTheDocument();
		});
	});
});

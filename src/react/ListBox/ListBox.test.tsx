import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ListBox } from "./ListBox.tsx";

describe("ListBox", () => {
	it("should render all options", () => {
		render(
			<ListBox>
				<ListBox.OptionList>
					<ListBox.Option value={1}>Item 1</ListBox.Option>
					<ListBox.Option value={1}>Item 2</ListBox.Option>
					<ListBox.Option value={1}>Item 3</ListBox.Option>
				</ListBox.OptionList>
			</ListBox>,
		);

		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 2")).toBeInTheDocument();
		expect(screen.getByText("Item 3")).toBeInTheDocument();
	});

	it("should focus the first option by down key", async () => {
		render(
			<ListBox>
				<ListBox.OptionList>
					<ListBox.Option value={1}>Item 1</ListBox.Option>
					<ListBox.Option value={2}>Item 2</ListBox.Option>
					<ListBox.Option value={3}>Item 3</ListBox.Option>
				</ListBox.OptionList>
			</ListBox>,
		);

		const listbox = screen.getByRole("listbox");
		const option1 = screen.getByText("Item 1");

		listbox.focus();
		expect(listbox).toHaveFocus();

		const user = userEvent.setup();
		await user.keyboard("{ArrowDown}");

		expect(listbox).toHaveFocus();
		expect(listbox).toHaveAttribute("aria-activedescendant", option1.id);
	});
});

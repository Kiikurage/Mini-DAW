import { describe, expect, it } from "bun:test";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { havingFocus } from "../../testLib.ts";
import { ListBox } from "./ListBox.tsx";

describe("ListBox", () => {
	it("should render all options", () => {
		render(
			<ListBox
				options={[
					{ label: "Item 1", id: "1" },
					{ label: "Item 2", id: "2" },
					{ label: "Item 3", id: "3" },
				]}
			/>,
		);

		expect(screen.getByText("Item 1")).toBeInTheDocument();
		expect(screen.getByText("Item 2")).toBeInTheDocument();
		expect(screen.getByText("Item 3")).toBeInTheDocument();
	});

	it("should focus the first option by down key", async () => {
		render(
			<ListBox
				options={[
					{ label: "Item 1", id: "1" },
					{ label: "Item 2", id: "2" },
					{ label: "Item 3", id: "3" },
				]}
			/>,
		);

		const listbox = screen.getByRole("listbox");
		const option1 = screen.getByText("Item 1");

		expect(option1).toBeInTheDocument();

		listbox.focus();
		expect(havingFocus(listbox)).toBeTrue();

		const user = userEvent.setup();
		await user.keyboard("{ArrowDown}");

		expect(havingFocus(listbox)).not.toBeTrue();
		expect(havingFocus(option1)).toBeTrue();
		expect(listbox).toHaveAttribute("aria-activedescendant", option1.id);
	});
});

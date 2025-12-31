import type { PropertyConfig } from "@pandacss/dev";
import type { Property } from "../../styled-system/types/csstype";

const FlexDirection = ["row", "column"] as const;
type FlexDirection = (typeof FlexDirection)[number];

const AlignItems = ["stretch", "center", "start", "end", "baseline"] as const;
type AlignItems = (typeof AlignItems)[number];

const JustifyContent = [
	"start",
	"end",
	"center",
	"stretch",
	"spaceBetween",
	"spaceAround",
] as const;
type JustifyContent = (typeof JustifyContent)[number];

type Value = `${FlexDirection} ${AlignItems} ${JustifyContent}`;
const values: Value[] = [];
const styles = new Map<
	Value,
	{
		flexDirection: Property.FlexDirection;
		alignItems: Property.AlignItems;
		justifyContent: Property.JustifyContent;
	}
>();

for (const direction of FlexDirection) {
	for (const alignItems of AlignItems) {
		for (const justifyContent of JustifyContent) {
			const value: Value = `${direction} ${alignItems} ${justifyContent}`;
			values.push(value);
			styles.set(value, {
				flexDirection: direction,
				alignItems:
					alignItems === "start"
						? "flex-start"
						: alignItems === "end"
							? "flex-end"
							: alignItems,
				justifyContent:
					justifyContent === "start"
						? "flex-start"
						: justifyContent === "end"
							? "flex-end"
							: justifyContent === "spaceBetween"
								? "space-between"
								: justifyContent === "spaceAround"
									? "space-around"
									: justifyContent,
			});
		}
	}
}

export const flexLayoutUtility: PropertyConfig = {
	values,
	transform(value: Value) {
		return {
			display: "flex",
			flexWrap: "wrap",
			...styles.get(value),
		};
	},
};

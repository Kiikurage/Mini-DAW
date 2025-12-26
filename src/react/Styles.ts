import type { CSSInterpolation } from "@emotion/serialize";
import type { CSSObject } from "@emotion/styled";

namespace flex {
	const Gap = {
		gap(value: CSSObject["gap"]): CSSObject {
			return { ...this, gap: value };
		},
	};
	type Gap = CSSObject & typeof Gap;

	const JustifyContent = {
		get start(): Gap {
			return Object.assign(Object.create(Gap), {
				...this,
				justifyContent: "flex-start",
			});
		},
		get center(): Gap {
			return Object.assign(Object.create(Gap), {
				...this,
				justifyContent: "center",
			});
		},
		get end(): Gap {
			return Object.assign(Object.create(Gap), {
				...this,
				justifyContent: "flex-end",
			});
		},
		get stretch(): Gap {
			return Object.assign(Object.create(Gap), {
				...this,
				justifyContent: "stretch",
			});
		},
		get baseline(): Gap {
			return Object.assign(Object.create(Gap), {
				...this,
				justifyContent: "baseline",
			});
		},
		get spaceBetween(): Gap {
			return Object.assign(Object.create(Gap), {
				...this,
				justifyContent: "space-between",
			});
		},
		get spaceAround(): Gap {
			return Object.assign(Object.create(Gap), {
				...this,
				justifyContent: "space-around",
			});
		},
		get default(): Gap {
			return Object.create(Gap);
		},
	};
	type JustifyContent = typeof JustifyContent;

	const AlignItems = {
		get start(): JustifyContent {
			return Object.assign(Object.create(JustifyContent), {
				...this,
				alignItems: "flex-start",
			});
		},
		get center(): JustifyContent {
			return Object.assign(Object.create(JustifyContent), {
				...this,
				alignItems: "center",
			});
		},
		get end(): JustifyContent {
			return Object.assign(Object.create(JustifyContent), {
				...this,
				alignItems: "flex-end",
			});
		},
		get stretch(): JustifyContent {
			return Object.assign(Object.create(JustifyContent), {
				...this,
				alignItems: "stretch",
			});
		},
		get baseline(): JustifyContent {
			return Object.assign(Object.create(JustifyContent), {
				...this,
				alignItems: "baseline",
			});
		},
		get default(): JustifyContent {
			return Object.create(JustifyContent);
		},
	};
	type AlignItems = typeof AlignItems;

	export const Direction = {
		get row(): AlignItems {
			return Object.assign(Object.create(AlignItems), {
				display: "flex",
				flexDirection: "row",
			});
		},
		get column(): AlignItems {
			return Object.assign(Object.create(AlignItems), {
				display: "flex",
				flexDirection: "column",
			});
		},
		get default(): AlignItems {
			return Object.assign(Object.create(AlignItems), {
				display: "flex",
			});
		},
	};
}
export const FlexLayout = flex.Direction;

export const BoxShadowStyleBase: CSSInterpolation = {
	boxShadow:
		"rgba(0, 0, 0, 0.25) 0px 54px 55px, rgba(0, 0, 0, 0.12) 0px -12px 30px, rgba(0, 0, 0, 0.12) 0px 4px 6px, rgba(0, 0, 0, 0.17) 0px 12px 13px, rgba(0, 0, 0, 0.09) 0px -3px 5px",
};

export const ListBoxItemStyleBase: CSSInterpolation = [
	FlexLayout.row.center.start.gap(8),
	{
		color: "var(--color-foreground)",
		position: "relative",
		padding: "8px 16px",
		borderRadius: 4,
		outline: "2px solid transparent",
		outlineOffset: -2,
		cursor: "pointer",
		whiteSpace: "nowrap",
		overflow: "clip",
		textOverflow: "ellipsis",
		userSelect: "none",
		minHeight: 30,
		width: "100%",
		boxSizing: "border-box",
		border: "none",
		textAlign: "left",

		"&:hover": {
			background: "var(--color-background-hover-weak)",
		},

		"&:focus": {
			outline: "2px solid var(--color-primary-500)",
		},

		"&[aria-selected='true']": {
			background: "var(--color-primary-200)",
		},
	},
];

export const UIControlStyleBase: CSSInterpolation = {
	color: "var(--color-foreground)",
	border: "1px solid var(--color-gray-600)",
	background: "var(--color-background-weak)",
	borderRadius: 4,
	margin: 0,
	minHeight: "32px",
	padding: "8px 8px",
	boxSizing: "border-box",

	"&:focus": {
		outline: "2px solid var(--color-primary-500)",
		outlineOffset: -2,
	},
};

export const ListBoxStyleBase: CSSInterpolation = {
	position: "relative",
	minWidth: 120,
	maxHeight: "100%",
	overflow: "auto",
	boxSizing: "border-box",
	flex: "1 1 auto",
};

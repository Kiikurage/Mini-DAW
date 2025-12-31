import { FaSpinner } from "react-icons/fa";
import { css } from "../../styled-system/css";

export function Spinner() {
	return (
		<FaSpinner
			className={css({
				animationName: "spin",
				animationDuration: "1s",
				animationTimingFunction: "linear",
				animationIterationCount: "infinite",
			})}
		/>
	);
}

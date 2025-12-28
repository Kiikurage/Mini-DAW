import { FaSpinner } from "react-icons/fa";

export function Spinner() {
	return (
		<FaSpinner
			css={{
				animation: "spin 1s linear infinite",
				"@keyframes spin": {
					from: { transform: "rotate(0deg)" },
					to: { transform: "rotate(360deg)" },
				},
			}}
		/>
	);
}

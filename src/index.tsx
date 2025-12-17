import { createRoot } from "react-dom/client";
import { AppView } from "./App/AppView.tsx";
import { DIContainerProvider } from "./Dependency/DIContainerProvider.tsx";
import { configureDeps } from "./deps.tsx";

document.addEventListener("DOMContentLoaded", async () => {
	const deps = configureDeps();

	const root = document.createElement("div");
	document.body.appendChild(root);

	createRoot(root).render(
		<DIContainerProvider container={deps}>
			<AppView />
		</DIContainerProvider>,
	);
});

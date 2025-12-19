import { createRoot } from "react-dom/client";
import { AppView } from "./App/AppView.tsx";
import { DIContainerProvider } from "./Dependency/DIContainerProvider.tsx";
import { configureDeps } from "./deps.tsx";
import { processOAuthResultRedirect } from "./GoogleDriveAPI/GoogleAPIClient.ts";

document.addEventListener("DOMContentLoaded", async () => {
	const deps = configureDeps();

	if (processOAuthResultRedirect()) return;

	const root = document.createElement("div");
	document.body.appendChild(root);

	createRoot(root).render(
		<DIContainerProvider container={deps}>
			<AppView />
		</DIContainerProvider>,
	);
});

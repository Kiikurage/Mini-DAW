import { ComponentKey } from "../Dependency/DIContainer.ts";
import { isNullish } from "../lib.ts";

const CLIENT_ID =
	"806762570052-46o001lu5vl5kbqrgpg1knqr781hocnl.apps.googleusercontent.com";

const GoogleAPIScope = {
	DRIVE_METADATA_READONLY:
		"https://www.googleapis.com/auth/drive.metadata.readonly",
	DRIVE_METADATA: "https://www.googleapis.com/auth/drive.metadata",
	DRIVE_FILE: "https://www.googleapis.com/auth/drive.file",
};
type GoogleAPIScope = (typeof GoogleAPIScope)[keyof typeof GoogleAPIScope];

export namespace GoogleDrive {
	export interface File {
		readonly id: string;
		readonly kind: string;
		readonly mimeType: MimeType;
		readonly name: string;
	}

	export type MimeType =
		| (typeof GoogleDrive.MimeType)[keyof typeof GoogleDrive.MimeType]
		| string;
}

export const GoogleDrive = {
	ROOT_FOLDER_ID: "root",
	MimeType: {
		FOLDER: "application/vnd.google-apps.folder",
	} as const,
};

export class GoogleAPIClient {
	static readonly Key = ComponentKey.of(GoogleAPIClient);
	private grantedScopes: Set<GoogleAPIScope> = new Set();
	private token: string = "";
	private expiresAt: number = 0;

	async listFilesByFolder(folderId: string) {
		const files: GoogleDrive.File[] = [];

		let nextPageToken: string | undefined;
		while (true) {
			const result = await this.listFiles({
				folderId,
				pageToken: nextPageToken,
			});

			files.push(...result.files);
			if (result.nextPageToken === undefined) {
				break;
			} else {
				nextPageToken = result.nextPageToken;
			}
		}

		return files;
	}

	private async listFiles(options: {
		folderId?: string;
		pageToken?: string;
	}): Promise<ListFilesResponse> {
		await this.ensureScope([GoogleAPIScope.DRIVE_METADATA_READONLY]);
		const url = new URL("https://www.googleapis.com/drive/v3/files");

		const queries: string[] = ["trashed = false"];
		if (options.folderId !== undefined) {
			queries.push(`'${options.folderId}' in parents`);
		}
		if (queries.length > 0) {
			url.searchParams.set("q", queries.join(" and "));
		}

		if (options.pageToken !== undefined) {
			url.searchParams.set("pageToken", options.pageToken);
		}

		return (await this.fetchJSON(url.toString())) as ListFilesResponse;
	}

	async postFile(options: {
		parentId: string;
		file: File;
	}): Promise<GoogleDrive.File> {
		await this.ensureScope([GoogleAPIScope.DRIVE_FILE]);

		const url = new URL("https://www.googleapis.com/upload/drive/v3/files");
		url.searchParams.set("uploadType", "multipart");

		const formData = new FormData();
		formData.append(
			"metadata",
			new Blob(
				[
					JSON.stringify({
						parents: [options.parentId],
						mimeType: options.file.type,
						name: options.file.name,
					}),
				],
				{ type: "application/json; charset=UTF-8" },
			),
		);
		formData.append("file", options.file);

		return await this.fetchJSON(url.toString(), {
			method: "POST",
			body: formData,
		});
	}

	async patchFile(options: {
		fileId: string;
		file: File;
	}): Promise<GoogleDrive.File> {
		await this.ensureScope([GoogleAPIScope.DRIVE_FILE]);

		const url = new URL(
			`https://www.googleapis.com/upload/drive/v3/files/${options.fileId}`,
		);
		url.searchParams.set("uploadType", "media");

		return await this.fetchJSON(url.toString(), {
			method: "PATCH",
			headers: {
				"Content-Type": options.file.type,
			},
			body: options.file,
		});
	}

	async getFile(fileId: string): Promise<ArrayBuffer> {
		await this.ensureScope([GoogleAPIScope.DRIVE_FILE]);

		const url = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
		url.searchParams.set("alt", "media");

		return await this.fetchBuffer(url.toString());
	}

	async getAbout(): Promise<{
		user: {
			photoLink: string;
			emailAddress: string;
		};
	}> {
		await this.ensureScope([
			GoogleAPIScope.DRIVE_METADATA_READONLY,
			GoogleAPIScope.DRIVE_METADATA,
		]);

		return await this.fetchJSON(
			"https://www.googleapis.com/drive/v3/about?fields=kind,user,storageQuota",
		);
	}

	private async fetchJSON(url: string, req?: RequestInit) {
		const res = await this.fetch(url, req);
		return res.json();
	}

	private async fetchBuffer(url: string, req?: RequestInit) {
		const res = await this.fetch(url, req);
		return res.arrayBuffer();
	}

	private async fetch(url: string, req: RequestInit = {}) {
		const res = await fetch(url, {
			...req,
			headers: {
				...req.headers,
				Authorization: `Bearer ${this.token}`,
			},
		});
		if (!res.ok) {
			throw new Error(
				`Failed to fetch Google Drive about: ${res.status} ${res.statusText}`,
				{ cause: await res.text() },
			);
		}
		return res;
	}

	private async ensureScope(scopes: Iterable<GoogleAPIScope>) {
		if (Date.now() > this.expiresAt) {
			this.grantedScopes.clear();
		}

		const scopesArray = [...scopes];
		if (scopesArray.every((scope) => this.grantedScopes.has(scope))) return;

		const { accessToken, expiresIn, grantedScopes } =
			await AuthorizationFlow.requestToken({
				clientId: CLIENT_ID,
				scopes: [...this.grantedScopes, ...scopesArray],
			});

		this.token = accessToken;
		this.expiresAt = Date.now() + expiresIn * 1000;
		this.grantedScopes = grantedScopes;
	}
}

interface ListFilesResponse {
	readonly files: GoogleDrive.File[];
	readonly incompleteSearch: boolean;
	readonly kind: string;
	readonly nextPageToken?: string;
}

export function processOAuthResultRedirect(): boolean {
	const searchParams = new URLSearchParams(window.location.hash.slice(1));
	const state = searchParams.get("state");
	if (state === null) return false;

	history.replaceState(null, "", window.location.pathname);

	if (isNullish(window.opener)) {
		return false;
	}

	window.opener.postMessage(
		{
			state,
			searchParams: searchParams.toString(),
		},
		"*",
	);
	window.close();
	return true;
}

class AuthorizationFlow {
	private static readonly AUTH_URL =
		"https://accounts.google.com/o/oauth2/v2/auth";

	private readonly nonce = generateRandomHash(32);
	private status: "ready" | "running" | "completed" = "ready";
	private onError?: (error: Error) => void;
	private onFulfill?: (result: {
		accessToken: string;
		expiresIn: number;
		grantedScopes: Set<string>;
	}) => void;

	private readonly clientId: string;
	private readonly scopes: readonly string[];

	constructor(props: {
		clientId: string;
		scopes: readonly string[];
	}) {
		this.clientId = props.clientId;
		this.scopes = props.scopes;
	}

	static async requestToken({
		clientId,
		scopes,
	}: {
		clientId: string;
		scopes: readonly string[];
	}): Promise<{
		accessToken: string;
		expiresIn: number;
		grantedScopes: Set<string>;
	}> {
		return new Promise((resolved, rejected) => {
			const flow = new AuthorizationFlow({
				clientId: clientId,
				scopes: scopes,
			});
			flow.onFulfill = resolved;
			flow.onError = rejected;
			flow.start();
		});
	}

	start() {
		if (this.status !== "ready") {
			throw new Error("Authorization flow is already started");
		}
		this.status = "running";

		window.addEventListener("message", this.handleWindowMessage);

		const url = new URL(AuthorizationFlow.AUTH_URL);
		url.searchParams.set("response_type", "token");
		url.searchParams.set("client_id", this.clientId);
		url.searchParams.set("redirect_uri", location.href);
		url.searchParams.set("scope", this.scopes.join(" "));
		url.searchParams.set("state", this.nonce);

		window.open(url.toString(), "new", "width=500,height=600,popup");
	}

	private finalize() {
		if (this.status === "completed") return;
		this.status = "completed";

		window.removeEventListener("message", this.handleWindowMessage);
		this.onError = undefined;
		this.onFulfill = undefined;
	}

	private readonly handleWindowMessage = async (ev: MessageEvent) => {
		try {
			if (!("state" in ev.data)) return;
			if (typeof ev.data.state !== "string") return;
			if (ev.data.state !== this.nonce) return;

			const searchParams = new URLSearchParams(ev.data.searchParams);
			if (searchParams.get("error")) {
				throw new Error("OAuth error", {
					cause: ev.data.searchParams,
				});
			}

			const accessToken = searchParams.get("access_token");
			if (accessToken === null) {
				throw new Error("No access_token in OAuth response", {
					cause: ev.data.searchParams,
				});
			}

			const expiresInStr = searchParams.get("expires_in");
			if (expiresInStr === null) {
				throw new Error("No expires_in in OAuth response", {
					cause: ev.data.searchParams,
				});
			}
			const expiresIn = Number(expiresInStr);
			if (Number.isNaN(expiresIn) || expiresIn <= 0) {
				throw new Error("Invalid expires_in in OAuth response", {
					cause: ev.data.searchParams,
				});
			}

			const grantedScopesStr = searchParams.get("scope");
			if (grantedScopesStr === null) {
				throw new Error("No scope in OAuth response", {
					cause: ev.data.searchParams,
				});
			}
			const grantedScopes = new Set(grantedScopesStr.split(" "));

			this.onFulfill?.({ accessToken, expiresIn, grantedScopes });
			this.finalize();
		} catch (e) {
			this.onError?.(new Error("Failed to request access token", { cause: e }));
			this.finalize();
		}
	};
}

function generateRandomHash(length: number = 64) {
	const array = new Uint8Array(length);
	crypto.getRandomValues(array);
	return btoa(String.fromCharCode(...array))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

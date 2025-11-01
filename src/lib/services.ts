import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { BASE_URL, COMFYUI_URL, MACHINE_ID } from "./config";

import { ComfyApi } from "@saintno/comfyui-sdk";
export const comfyApi = new ComfyApi(COMFYUI_URL).init(20, 1000);
// Configure fetch to handle SSL certificate issues
const customFetch = (url: string, options?: RequestInit) => {
	return fetch(url, {
		...options,
		// @ts-ignore - Node.js specific option to handle SSL certificates
		rejectUnauthorized: false,
	});
};

const link = new RPCLink({
	url: `${BASE_URL}/rpc`,
	fetch: (request: Request, init: { redirect?: RequestRedirect | undefined }, options: any, path: readonly string[], input: unknown) => {
		return customFetch(request.url, {
			...init,
			method: request.method,
			headers: request.headers,
			body: request.body,
		});
	},
	headers: {
		"x-machine-id": MACHINE_ID,
	},
});

export const api: RouterClient<any> = createORPCClient(link);

import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

export const machineId = Bun.env.MACHINE_ID;
const DEV = Bun.env.NODE_ENV === "development";
const DOMAIN = DEV ? `localhost:8787` : `fussion.studio`;
export const BASE_URL = `http${DEV ? "" : "s"}://${DOMAIN}`;
export const WS_URL = `ws${DEV ? "" : "s"}://${DOMAIN}`;
console.table({ DEV, machineId, DOMAIN });

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
	fetch: customFetch,
	headers: {
		"x-machine-id": machineId,
	},
});

export const api: RouterClient<any> = createORPCClient(link);

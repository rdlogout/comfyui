import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

export const machineId = process.env.MACHINE_ID || "c7f8de03-3f70-4386-acf0-bef80eab22ca";
const DEV = true;
const DOMAIN = DEV ? `localhost:8787` : `fussion.studio`;
export const BASE_URL = `http${DEV ? "" : "s"}://${DOMAIN}`;
export const WS_URL = `ws${DEV ? "" : "s"}://${DOMAIN}`;

const link = new RPCLink({
	url: `${BASE_URL}/rpc`,
	headers: {
		"x-machine-id": machineId,
	},
});

export const api: RouterClient<any> = createORPCClient(link);

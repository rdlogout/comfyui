import type { RouterClient } from "@orpc/server";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";

export const machineId = Bun.env.MACHINE_ID;
const DEV = Bun.env.NODE_ENV === "development";
const DOMAIN = DEV ? `localhost:8787` : `fussion.studio`;
export const BASE_URL = `http${DEV ? "" : "s"}://${DOMAIN}`;
export const WS_URL = `ws${DEV ? "" : "s"}://${DOMAIN}`;
console.table({ DEV, machineId, DOMAIN });

const link = new RPCLink({
	url: `${BASE_URL}/rpc`,
	headers: {
		"x-machine-id": machineId,
	},
});

export const api: RouterClient<any> = createORPCClient(link);

import ReconnectingWebSocket from "reconnecting-websocket";
import { syncDependencies } from "./dependency";
import { queueTask, syncTaskStatus } from "./task";
import { MACHINE_ID, WS_URL } from "./lib/config";
import { comfyApi } from "./lib/services";
import { onError, onProgress, onStart, onSuccess } from "./lib/events";

// Catch process-level errors so the Bun runtime doesn't exit
process.on("unhandledRejection", (reason: any) => {
	console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err: any) => {
	console.error("Uncaught exception:", err);
});

const actions: Record<string, (data?: any) => Promise<any>> = {
	syncDependencies,
	syncTaskStatus,
	queueTask,
};

const backendSocket = new ReconnectingWebSocket(`${WS_URL}/ws/machine?id=${MACHINE_ID}`);
backendSocket.onopen = () => {
	console.log("Connected to ComfyUI backend");
};
backendSocket.onerror = (e: any) => {
	console.error("Error in ComfyUI backend connection:", e.message);
};
backendSocket.onclose = (e: any) => {
	console.error("Disconnected from ComfyUI backend:", e.message);
};
backendSocket.onmessage = async (e: MessageEvent) => {
	// Ensure async action errors are caught here
	try {
		const [key, data] = JSON.parse(e.data);
		console.log(`Received message: ${key}`);
		const action = actions[key];
		if (action) await action(data);
	} catch (err) {
		console.error("Error processing message:", err);
	}
};
comfyApi.on("progress", onProgress);
comfyApi.on("execution_error", onError);
comfyApi.on("execution_start", onStart);
comfyApi.on("execution_success", onSuccess);
console.log("Starting ComfyUI backend client");

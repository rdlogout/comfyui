import ReconnectingWebSocket from "reconnecting-websocket";
import { syncDependencies } from "./dependency";
import { syncTask } from "./task";
import { machineId, WS_URL } from "./lib/api";

const actions: Record<string, (data?: any) => Promise<any>> = {
	syncDependencies,
	syncTask,
};

const backendSocket = new ReconnectingWebSocket(`${WS_URL}/ws/machine?id=${machineId}`);
backendSocket.onopen = () => {
	console.log("Connected to ComfyUI backend");
};
backendSocket.onerror = (e: any) => {
	console.error("Error in ComfyUI backend connection:", e);
};
backendSocket.onclose = (e: any) => {
	console.log("Disconnected from ComfyUI backend:", e);
};
backendSocket.onmessage = (e: MessageEvent) => {
	try {
		const [key, data] = JSON.parse(e.data);
		console.log(`Received message: ${key}`, data);
		const action = actions[key];
		if (action) action(data);
	} catch (err) {
		console.error("Error processing message:", err);
	}
};

console.log("Starting ComfyUI backend client");

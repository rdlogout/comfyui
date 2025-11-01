import ReconnectingWebSocket from "reconnecting-websocket";
import { syncDependencies } from "./dependency";
import { queueTask, syncTaskStatus } from "./task";
import { machineId, WS_URL } from "./lib/api";

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

const backendSocket = new ReconnectingWebSocket(`${WS_URL}/ws/machine?id=${machineId}`);
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

console.log("Starting ComfyUI backend client");

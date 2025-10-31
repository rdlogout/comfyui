import { homedir } from "os";
import * as path from "path";

export const COMFYUI_URL = "http://localhost:8188";
export const COMFYUI_DIR = process.env.COMFYUI_DIR || path.join(homedir(), "ComfyUI");

import { ComfyApi } from "@saintno/comfyui-sdk";
import { onError, onProgress, onStart, onSuccess } from "./events";
export const comfyApi = new ComfyApi(COMFYUI_URL).init(20, 1000);

comfyApi.on("progress", onProgress);
comfyApi.on("execution_error", onError);
comfyApi.on("execution_start", onStart);
comfyApi.on("execution_success", async (e) => {
	const { prompt_id } = e.detail;
	const history = await comfyApi.getHistory(prompt_id);
	console.log({ history });
	if (history) {
	}
	// updateTaskByPromptId(prompt_id, {
	//     status: "completed",
	//     ended_at: new Date().toISOString(),
	// });
});

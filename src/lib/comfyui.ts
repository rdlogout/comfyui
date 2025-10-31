import { homedir } from "os";
import * as path from "path";

export const COMFYUI_URL = "http://localhost:8188";
export const COMFYUI_DIR = process.env.COMFYUI_DIR || path.join(homedir(), "ComfyUI");

import { ComfyApi } from "@saintno/comfyui-sdk";
import { onError, onProgress, onStart, onSuccess } from "./events";
import { getTaskByPromptId, updateTaskByPromptId } from "./db";
import { syncTaskStatus } from "src/task";
export const comfyApi = new ComfyApi(COMFYUI_URL).init(20, 1000);

comfyApi.on("progress", onProgress);
comfyApi.on("execution_error", onError);
comfyApi.on("execution_start", onStart);
comfyApi.on("execution_success", async (e) => {
	const { prompt_id } = e.detail;
	const history = await comfyApi.getHistory(prompt_id);
	console.log({ history });
	const files = Object.values(history?.outputs || {})
		.map((output) => Object.values(output).flat())
		.flat()
		.map((item: any) => [item.type, item.subfolder, item.filename].filter(Boolean).join("/"))
		.filter(Boolean);
	// console.log({ files });
	updateTaskByPromptId(prompt_id, {
		status: "completed",
		ended_at: new Date().toISOString(),
	});
	const task = getTaskByPromptId(prompt_id);
	await syncTaskStatus(task!.id);
});

import * as path from "path";
import { COMFYUI_URL, COMFYUI_DIR } from "./config";

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
		.map((item: any) => {
			if (item.type === "temp") {
				item.type = "output";
				const tempPath = path.join(COMFYUI_DIR, "temp", item.subfolder, item.filename);
				const tempFile = Bun.file(tempPath);
				Bun.write(path.join(COMFYUI_DIR, "output", item.filename), tempFile);
			}

			return path.join(item.type, item.subfolder, item.filename);
		})
		.filter(Boolean);
	// console.log({ files });
	updateTaskByPromptId(prompt_id, {
		status: "completed",
		ended_at: new Date().toISOString(),
		files: JSON.stringify(files),
	});
	const task = getTaskByPromptId(prompt_id);
	if (task) await syncTaskStatus(task.id);
});

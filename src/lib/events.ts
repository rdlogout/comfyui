import { TExecution, TExecutionError, TProgress } from "@saintno/comfyui-sdk";
import { taskDB } from "./db";
import { comfyApi } from "./services";
import { syncTaskStatus } from "src/task";
import { COMFYUI_DIR } from "./config";
import * as path from "path";

export const onProgress = (e: CustomEvent<TProgress>) => {
	const { prompt_id, max, value, node } = e.detail;
	const percentage = (value / max) * 100;
	// console.log(`Progress: ${percentage.toFixed(2)}% (${value}/${max})`);
	taskDB.updateByPromptId(prompt_id, {
		progress: percentage,
		active_node_id: node || "",
	});
};

export const onError = async (e: CustomEvent<TExecutionError>) => {
	const { prompt_id } = e.detail;
	console.log(`Error: ${e.detail.exception_message}`);
	taskDB.updateByPromptId(prompt_id, {
		error: e.detail.exception_message,
		status: "failed",
		ended_at: new Date().toISOString(),
	});
	await syncTaskStatus(prompt_id);
};

export const onStart = (e: CustomEvent<TExecution>) => {
	const { prompt_id } = e.detail;
	// console.log(`Start: ${prompt_id}`);
	taskDB.updateByPromptId(prompt_id, {
		status: "running",
		started_at: new Date().toISOString(),
		progress: 0,
	});
};

export const onSuccess = async (e: CustomEvent<TExecution>) => {
	const { prompt_id } = e.detail;
	const history = await comfyApi.getHistory(prompt_id);
	if (!history) {
		console.log(`Error: History Not found`);
		return;
	}
	const error_msg = history.status?.status_str;
	// console.log({ history });
	const files = Object.values(history?.outputs || {})
		.map((output) => Object.values(output).flat())
		.flat()
		.map((item: any) => {
			if (item.type !== "output") Bun.write(path.join(COMFYUI_DIR, "output", item.filename), Bun.file(path.join(COMFYUI_DIR, "temp", item.subfolder, item.filename)));

			return path.join("output", item.subfolder, item.filename);
		})
		.filter(Boolean);
	taskDB.updateByPromptId(prompt_id, {
		status: error_msg ? "failed" : "success",
		ended_at: new Date().toISOString(),
		files: files,
		error: error_msg,
	});

	const task = taskDB.get(prompt_id, "prompt_id");
	if (task) await syncTaskStatus(task.id);
};

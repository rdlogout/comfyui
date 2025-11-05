import { TExecution, TExecutionError, TProgress } from "@saintno/comfyui-sdk";
import { taskDB } from "./db";
import { comfyApi } from "./services";
import { syncTaskStatus } from "src/task";
import { COMFYUI_DIR } from "./config";
import * as path from "path";

const reqThrottleMap = new Map<string, Date>();

const syncToServer = async (prompt_id: string) => {
	const task = taskDB.get(prompt_id, "prompt_id");
	if (task) await syncTaskStatus(task.id);
};

export const onProgress = (e: CustomEvent<TProgress>) => {
	const { prompt_id, max, value, node } = e.detail;
	const percentage = (value / max) * 100;
	console.log(`Progress: ${percentage.toFixed(2)}% (${value}/${max})`);
	taskDB.updateByPromptId(prompt_id, {
		progress: percentage,
		status: "running",
		active_node_id: node || "",
	});
	const lastUpdate = reqThrottleMap.get(prompt_id);
	//wait for 1 sec before sync
	if (!lastUpdate || lastUpdate.getTime() < Date.now() - 1000) {
		reqThrottleMap.set(prompt_id, new Date());
		syncToServer(prompt_id);
	}

	// if(!lastUpdate)
};

export const onError = async (e: CustomEvent<TExecutionError>) => {
	const { prompt_id } = e.detail;
	console.log(`Error: ${e.detail.exception_message}`);
	taskDB.updateByPromptId(prompt_id, {
		error: e.detail.exception_message,
		status: "failed",
		ended_at: new Date().toISOString(),
	});
	syncToServer(prompt_id);
};

export const onStart = async (e: CustomEvent<TExecution>) => {
	const { prompt_id } = e.detail;
	console.log(`Start: ${prompt_id}`);
	// console.log(`Start: ${prompt_id}`);
	taskDB.updateByPromptId(prompt_id, {
		status: "running",
		started_at: new Date().toISOString(),
		progress: 0,
	});
	await syncToServer(prompt_id);
};

export const onSuccess = async (e: CustomEvent<TExecution>) => {
	const { prompt_id } = e.detail;
	const history = await comfyApi.getHistory(prompt_id);
	if (!history) {
		console.log(`Error: History Not found`);
		return;
	}
	const is_error = history.status?.status_str.toLocaleLowerCase() === "error";
	const error_msg = is_error ? history.status?.status_str : "";
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
		status: is_error ? "failed" : "success",
		ended_at: new Date().toISOString(),
		files: files,
		error: error_msg,
	});

	await syncToServer(prompt_id);
};

export const onQueueError = async (e: CustomEvent<Error>) => {
	console.log(`Queue Error: ${e.detail?.message}`);
	// taskDB.updateByPromptId(prompt_id, {
	// 	error: e.detail.message,
	// 	status: "failed",
	// 	ended_at: new Date().toISOString(),
	// });
	// await syncToServer(prompt_id);
};

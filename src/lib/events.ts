import { TExecuted, TExecution, TExecutionError, TProgress } from "@saintno/comfyui-sdk";
import { updateTaskByPromptId } from "./db";

export const onProgress = (e: CustomEvent<TProgress>) => {
	const { prompt_id, max, value, node } = e.detail;
	const percentage = (value / max) * 100;
	console.log(`Progress: ${percentage.toFixed(2)}% (${value}/${max})`);
	updateTaskByPromptId(prompt_id, {
		progress: percentage,
		active_node_id: node || "",
	});
};

export const onError = (e: CustomEvent<TExecutionError>) => {
	const { prompt_id } = e.detail;
	console.log(`Error: ${e.detail.exception_message}`);
	updateTaskByPromptId(prompt_id, {
		error: e.detail.exception_message,
		status: "failed",
		ended_at: new Date().toISOString(),
	});
};

export const onStart = (e: CustomEvent<TExecution>) => {
	const { prompt_id } = e.detail;
	console.log(`Start: ${prompt_id}`);
	updateTaskByPromptId(prompt_id, {
		status: "running",
		started_at: new Date().toISOString(),
		progress: 0,
	});
};

export const onSuccess = (e: CustomEvent<TExecution>) => {
	const { prompt_id } = e.detail;
	console.log(`Success: ${prompt_id}`);
	updateTaskByPromptId(prompt_id, {
		status: "completed",
		ended_at: new Date().toISOString(),
	});
};

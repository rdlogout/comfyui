import path from "path";
import fs from "fs/promises";
import { taskDB } from "src/lib/db";
import { comfyApi } from "src/lib/services";
import { COMFYUI_DIR } from "src/lib/config";
import { syncTaskStatus } from "./status";
import { QueueItem } from "@saintno/comfyui-sdk";
type QueueTaskData = {
	id: string;
	prompt: any;
	progress_map: Map<string, number>;
};

const isDuplicateTask = async (task_id: string) => {
	const task = taskDB.get(task_id);
	const prompt_id = task?.data?.prompt_id;
	const status = task?.data?.status;
	console.log({ prompt_id, status });
	if (prompt_id && status !== "success") {
		const history = await comfyApi.getHistory(prompt_id);
		if (history) {
			console.log(`Task already executed with prompt id ${prompt_id}`);
			return true;
		}
		const queue = await comfyApi.getQueue();
		const in_queue = !!queue?.queue_pending?.find((item: QueueItem) => Object.values(item).includes(prompt_id));
		const is_running = !!queue?.queue_running?.find((item: QueueItem) => Object.values(item).includes(prompt_id));
		if (in_queue || is_running) {
			console.log(`Task ${task_id} is already in queue or running with prompt id ${prompt_id}`);
			return true;
		}
	}

	return false;
};

export const queueTask = async (data: QueueTaskData) => {
	const { id: task_id } = data;

	const prompt = await getWorkflow(data.prompt);
	const isDuplicate = await isDuplicateTask(task_id);
	if (!isDuplicate) {
		const resp = await comfyApi.appendPrompt(prompt).catch((e) => {
			console.log("failed to queue task", task_id, e);
			return {
				prompt_id: "",
				error: `Failed to queue task : ${e.message}`,
			};
		});
		const prompt_id = resp?.prompt_id;
		const error = (resp as any)?.error;
		taskDB.updateById(task_id, {
			prompt_id,
			status: "inqueue",
			progress: 0,
			queued_at: new Date().toISOString(),
			error: error as string,
		});
	}

	await syncTaskStatus(task_id);
	// resp.
};

async function getWorkflow(workflowInput: any) {
	// Handle both string and object inputs
	let workflow: any = typeof workflowInput === "string" ? JSON.parse(workflowInput) : workflowInput;
	const processedWorkflow = await processWorkflowUrls(workflow);

	return processedWorkflow;
}

async function processWorkflowUrls(obj: any): Promise<any> {
	// First pass: collect all URLs that need to be downloaded
	const urlsToDownload = new Set<string>();
	collectUrls(obj, urlsToDownload);

	// Download URLs with small concurrency to avoid memory spikes
	const urlMap = new Map<string, string>();
	if (urlsToDownload.size > 0) {
		const urls = Array.from(urlsToDownload);
		const maxConcurrency = 3;
		let index = 0;
		const results: { url: string; filename: string }[] = [];

		const worker = async () => {
			while (true) {
				let current: string | undefined;
				if (index < urls.length) {
					current = urls[index++];
				} else {
					break;
				}
				const filename = await downloadAndReplaceUrl(current);
				results.push({ url: current, filename });
			}
		};

		const workers = Array.from({ length: Math.min(maxConcurrency, urls.length) }, () => worker());
		await Promise.all(workers);

		results.forEach(({ url, filename }) => {
			urlMap.set(url, filename);
		});
	}

	// Second pass: replace URLs with downloaded filenames
	return replaceUrls(obj, urlMap);
}

function collectUrls(obj: any, urlsToDownload: Set<string>): void {
	if (typeof obj !== "object" || obj === null) {
		return;
	}

	if (Array.isArray(obj)) {
		for (const item of obj) {
			collectUrls(item, urlsToDownload);
		}
		return;
	}

	for (const [key, value] of Object.entries(obj)) {
		if (key.includes("image")) {
			console.log("found", key, value);
		}
		if (typeof value === "string" && isTargetUrl(value)) {
			urlsToDownload.add(value);
		} else {
			collectUrls(value, urlsToDownload);
		}
	}
}

function replaceUrls(obj: any, urlMap: Map<string, string>): any {
	if (typeof obj !== "object" || obj === null) {
		return obj;
	}

	if (Array.isArray(obj)) {
		return obj.map((item) => replaceUrls(item, urlMap));
	}

	const processedObj: any = {};
	for (const [key, value] of Object.entries(obj)) {
		if (typeof value === "string" && isTargetUrl(value)) {
			const filename = urlMap.get(value);
			processedObj[key] = filename || value;
			console.log(value, filename);
		} else {
			processedObj[key] = replaceUrls(value, urlMap);
		}
	}

	return processedObj;
}

function isTargetUrl(value: string): boolean {
	// Check if the value is a URL from https://ai.drahul.dev/
	try {
		const url = new URL(value);
		return true;
		return url.protocol === "https:" && url.hostname === "ai.drahul.dev";
	} catch {
		return false;
	}
}

// Stream-safe download using the downloader service; avoids buffering entire file into memory
async function downloadFile(url: string, filename: string): Promise<void> {
	// Get ComfyUI path and ensure input directory exists
	const comfyuiPath = COMFYUI_DIR;
	const inputDir = path.join(comfyuiPath, "input");
	await fs.mkdir(inputDir, { recursive: true });
	console.log(`Downloading file ${filename} to ${path.join(inputDir, filename)}`);

	const resp = await fetch(url);
	const arrayBuffer = await resp.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	await fs.writeFile(path.join(inputDir, filename), buffer);
}

async function downloadAndReplaceUrl(url: string): Promise<string> {
	if (!isTargetUrl(url)) {
		return url;
	}

	const filename = new URL(url).pathname.split("/").pop() || "input";
	console.log(`Downloading file ${filename} from ${url}`);
	//check if file exist
	const fileExist = Bun.file(path.join(COMFYUI_DIR, "input", filename)).exists();
	if (!fileExist) await downloadFile(url, filename);

	// Download file using streaming-friendly service
	return filename;
}

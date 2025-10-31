import path from "path";
import crypto from "crypto";
import fs from "fs/promises";
import { getTask, insertTask, updatePromptId, updateTask } from "src/lib/db";
import { comfyApi, COMFYUI_DIR } from "src/lib/comfyui";
import { syncTaskStatus } from "./status";
type QueueTaskData = {
	id: string;
	prompt: any;
};

export const queueTask = async (data: QueueTaskData) => {
	const { id: task_id } = data;
	const prompt = await getWorkflow(data.prompt);
	const task = getTask(task_id);
	// if (task.prompt_id) {
	// 	const history = await comfyApi.getHistory(task.prompt_id);
	// 	if (history) {
	// 		console.log("task already has prompt id", task_id, task.prompt_id);
	// 		return;
	// 	}
	// }
	const resp = await comfyApi.appendPrompt(prompt);
	console.log(resp);
	const prompt_id = resp.prompt_id;
	if (prompt_id) {
		const success = updatePromptId(task_id, prompt_id);
		// if(!success){
		// 	console.log("failed to update prompt id", task_id, prompt_id);
		// 	//cancel the task
		// 	// comfyApi.(prompt_id);
		// 	return;
		// }
	}
	// updateTask(task_id, { prompt_id: resp.prompt_id, error: JSON.stringify(resp.node_errors) });
	await syncTaskStatus(task_id);
	// resp.
};

async function getWorkflow(workflowInput: any) {
	// Handle both string and object inputs
	let workflow: any;
	if (typeof workflowInput === "string") {
		// Parse the workflow string to object
		workflow = JSON.parse(workflowInput);
	} else {
		// Use the object directly
		workflow = workflowInput;
	}

	// console.log("workflow", workflow);

	// Process the workflow to download and replace URLs
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

	const resp = await fetch(url);
	const arrayBuffer = await resp.arrayBuffer();
	const buffer = Buffer.from(arrayBuffer);
	await fs.writeFile(path.join(inputDir, filename), buffer);
}

async function downloadAndReplaceUrl(url: string): Promise<string> {
	if (!isTargetUrl(url)) {
		console.log(url);
		return url;
	}

	// Generate unique filename
	const originalFilename = url.split("/").pop() || "input";
	const extension = path.extname(originalFilename);
	const baseName = path.basename(originalFilename, extension);
	const uniqueId = crypto.randomUUID().substring(0, 8);
	const uniqueFilename = `${baseName}_${uniqueId}${extension}`;

	console.log("Downloading file", {
		url,
		uniqueFilename,
	});

	// Download file using streaming-friendly service
	await downloadFile(url, uniqueFilename);
	console.log("Downloaded file to", uniqueFilename);
	return uniqueFilename;
}

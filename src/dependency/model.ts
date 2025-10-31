/**
 * Simplified Hugging Face model downloader using HF CLI
 * Supports resumable downloads and prevents duplicate downloads
 */

import { exec } from "child_process";
import { promisify } from "util";
import * as path from "path";
import * as fs from "fs/promises";
import { existsSync } from "fs";
import { homedir } from "os";

const execAsync = promisify(exec);

/**
 * Result interface for downloadModel function
 */
export interface DownloadResult {
	success: boolean;
	message: string;
}

/**
 * Parse Hugging Face URL to determine download type and extract repo info
 */
function parseHuggingFaceUrl(url: string): { repoId: string; type: "repo" | "folder" | "file"; filePath?: string } {
	// Remove trailing slash and normalize URL
	const cleanUrl = url.replace(/\/$/, "");

	// Extract repo ID from URL
	const match = cleanUrl.match(/https:\/\/huggingface\.co\/([^\/]+\/[^\/]+)/);
	if (!match) {
		throw new Error("Invalid Hugging Face URL");
	}

	const repoId = match[1];
	const remainingPath = cleanUrl.replace(`https://huggingface.co/${repoId}`, "");

	// Determine type based on URL structure
	if (!remainingPath || remainingPath === "/tree/main" || remainingPath.startsWith("/tree/")) {
		return { repoId, type: "repo" };
	} else if (remainingPath.includes("/blob/")) {
		// Extract file path from blob URL
		const filePath = remainingPath.replace(/\/blob\/[^\/]+\//, "");
		return { repoId, type: "file", filePath };
	} else if (remainingPath.includes("/tree/")) {
		// Extract folder path from tree URL
		const filePath = remainingPath.replace(/\/tree\/[^\/]+\//, "");
		return { repoId, type: "folder", filePath };
	}

	return { repoId, type: "repo" };
}

/**
 * Check if a file or directory already exists and is complete
 */
async function checkExistingDownload(outputPath: string, type: "file" | "folder" | "repo"): Promise<boolean> {
	if (!existsSync(outputPath)) {
		return false;
	}

	try {
		const stats = await fs.stat(outputPath);

		if (type === "file") {
			// For files, check if it exists and has content
			return stats.isFile() && stats.size > 0;
		} else {
			// For folders/repos, check if directory exists and has content
			if (stats.isDirectory()) {
				const files = await fs.readdir(outputPath);
				return files.length > 0;
			}
		}
	} catch (error) {
		console.warn(`Warning: Could not check existing download: ${error}`);
	}

	return false;
}

/**
 * Download model from Hugging Face using HF CLI
 * @param url - Hugging Face URL (repo, folder, or file)
 * @param output - Output directory path
 * @returns Promise<DownloadResult> - Object with success boolean and message
 */
export async function downloadModel(url: string, output: string): Promise<DownloadResult> {
	try {
		const { repoId, type, filePath } = parseHuggingFaceUrl(url);

		console.log(`📥 Downloading from ${url}...`);
		console.log(`📂 Output directory: ${output}`);

		// Ensure output directory exists and is absolute
		const absoluteOutput = path.isAbsolute(output) ? output : path.resolve(output);
		
		// Determine the target path for existence check
		let targetPath: string = absoluteOutput;
		let outputDir: string = absoluteOutput;
		
		if (type === 'file' && filePath) {
			// For single files, we want to download directly to the specified file path
			// So we need to use the parent directory as the output directory
			outputDir = path.dirname(absoluteOutput);
		}

		// Check if already downloaded
		const alreadyExists = await checkExistingDownload(targetPath, type);
		if (alreadyExists) {
			console.log(`✅ Already exists: ${targetPath}`);
			console.log(`🔄 Skipping download - file/folder already present`);
			return {
				success: true,
				message: `File already exists at ${targetPath}`,
			};
		}

		// Set cache directory path and ensure it's an absolute path
		let cacheDir = process.env.HF_HOME || process.env.HF_HUB_CACHE || path.join(homedir(), '.cache', 'huggingface');
		// Ensure cacheDir is absolute
		if (!path.isAbsolute(cacheDir)) {
			cacheDir = path.resolve(cacheDir);
		}
		console.log(`💾 Using cache directory: ${cacheDir}`);

		// For files, create the parent directory; for directories/repos, create the target directory
		const dirToCreate = (type === 'file' && filePath) ? path.dirname(absoluteOutput) : absoluteOutput;
		await fs.mkdir(dirToCreate, { recursive: true });

		let command: string;

		let actualFilePath: string = targetPath;
		
		if (type === "file" && filePath) {
			// Download single file
			// The HF CLI will download the file with its original name to the specified directory
			// So we need to check for the actual file that was downloaded
			actualFilePath = path.join(outputDir, path.basename(filePath));
			command = `hf download ${repoId} ${filePath} --local-dir "${outputDir}" --cache-dir "${cacheDir}"`;
			console.log(`📄 Downloading file: ${filePath}`);
			console.log(`📄 Will be saved as: ${actualFilePath}`);
		} else if (type === "folder" && filePath) {
			// Download folder using include pattern
			command = `hf download ${repoId} --include "${filePath}/*" --local-dir "${absoluteOutput}" --cache-dir "${cacheDir}"`;
			console.log(`📁 Downloading folder: ${filePath}`);
		} else {
			// Download entire repository
			command = `hf download ${repoId} --local-dir "${absoluteOutput}" --cache-dir "${cacheDir}"`;
			console.log(`📦 Downloading repository: ${repoId}`);
		}

		console.log(`🔄 Executing: ${command}`);

		// Set environment variables for cache optimization
		const execOptions = {
			env: {
				...process.env,
				HF_HUB_CACHE: cacheDir,
				HF_HUB_OFFLINE: '0', // Ensure online mode for downloads
				HF_HUB_DISABLE_SYMLINKS: '0', // Allow symlinks for better caching
			}
		};

		const { stdout, stderr } = await execAsync(command, execOptions);

		if (stderr && !stderr.includes("warning") && !stderr.includes("already exists") && !stderr.includes("Fetching") && !stderr.includes("100%")) {
			console.warn(`⚠️  Warning: ${stderr}`);
		}

		if (stdout) {
			console.log(stdout);
		}

		// Verify download completed successfully
		const downloadCompleted = await checkExistingDownload(actualFilePath, type);
		if (downloadCompleted) {
			console.log(`✅ Successfully downloaded to ${actualFilePath}`);
			return {
				success: true,
				message: `Successfully downloaded to ${actualFilePath}`,
			};
		} else {
			console.warn(`⚠️  Download may be incomplete. Please check ${actualFilePath}`);
			return {
				success: false,
				message: `Download may be incomplete. Please check ${actualFilePath}`,
			};
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`❌ Error downloading from ${url}: ${errorMessage}`);
		return {
			success: false,
			message: `Error downloading from ${url}: ${errorMessage}`,
		};
	}
}

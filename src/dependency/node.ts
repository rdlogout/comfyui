/**
 * Custom Node Installer Helper
 * Complete utility for installing custom nodes from Git repositories with dependency management
 */

import { exec, spawn } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";

const execAsync = promisify(exec);

// Types and Interfaces
interface GitHubInfo {
	user: string;
	repo: string;
	branch: string;
	subfolder?: string;
	cloneUrl: string;
	originalUrl: string;
}

interface RequirementInfo {
	name: string;
	original: string;
	constraint: string;
}

interface RequirementsAnalysis {
	safeToInstall: string[];
	skippedCritical: string[];
	alreadyInstalled: string[];
	totalRequested: number;
	error?: string;
}

interface SyncNodeResponse {
	success: boolean;
	alreadyExists: boolean;
	message: string;
	repoName: string;
	dependenciesInstalled?: number;
	skippedDependencies?: number;
	error?: string;
}

// Critical ComfyUI dependencies that should not be upgraded
const CRITICAL_DEPS = new Set([
	"torch",
	"torchvision",
	"torchaudio",
	"numpy",
	"pillow",
	"opencv-python",
	"opencv-contrib-python",
	"transformers",
	"accelerate",
	"safetensors",
	"xformers",
	"einops",
	"diffusers",
	"compel",
	"tokenizers",
	"huggingface-hub",
	"scipy",
	"scikit-learn",
	"matplotlib",
	"requests",
	"aiohttp",
	"websockets",
]);

/**
 * Get dictionary of currently installed packages and their versions
 */
async function getInstalledPackages(): Promise<Record<string, string>> {
	try {
		const { stdout } = await execAsync("pip list --format=json");
		const packages = JSON.parse(stdout);
		return packages.reduce((acc: Record<string, string>, pkg: any) => {
			acc[pkg.name.toLowerCase()] = pkg.version;
			return acc;
		}, {});
	} catch (error) {
		console.error("Error getting installed packages:", error);
		return {};
	}
}

/**
 * Parse a requirements.txt line and extract package info
 */
function parseRequirementLine(line: string): RequirementInfo | null {
	const trimmedLine = line.trim();
	if (!trimmedLine || trimmedLine.startsWith("#")) {
		return null;
	}

	const match = trimmedLine.match(/^([a-zA-Z0-9_-]+)([><=!~]+.*)?$/);
	if (match) {
		return {
			name: match[1].toLowerCase().replace("_", "-"),
			original: trimmedLine,
			constraint: match[2] || "",
		};
	}
	return null;
}

/**
 * Analyze requirements file and return what would be installed/skipped
 */
async function analyzeRequirements(requirementsPath: string, repoName: string): Promise<RequirementsAnalysis> {
	try {
		const installedPackages = await getInstalledPackages();
		const safeRequirements: string[] = [];
		const skippedPackages: string[] = [];
		const alreadyInstalled: string[] = [];

		const content = await fs.readFile(requirementsPath, "utf-8");
		const lines = content.split("\n");

		for (const line of lines) {
			const parsed = parseRequirementLine(line);
			if (!parsed) continue;

			const packageName = parsed.name;
			const originalLine = parsed.original;

			// Check if package is critical
			if (CRITICAL_DEPS.has(packageName)) {
				if (packageName in installedPackages) {
					skippedPackages.push(`${packageName} (installed: ${installedPackages[packageName]} - protected from upgrade)`);
				} else {
					// Allow installing critical packages if not already installed
					safeRequirements.push(originalLine);
				}
				continue;
			}

			// For non-critical packages, always allow installation (including updates)
			safeRequirements.push(originalLine);
		}

		return {
			safeToInstall: safeRequirements,
			skippedCritical: skippedPackages,
			alreadyInstalled,
			totalRequested: safeRequirements.length + skippedPackages.length + alreadyInstalled.length,
		};
	} catch (error) {
		console.error(`Error analyzing requirements for ${repoName}:`, error);
		return {
			safeToInstall: [],
			skippedCritical: [],
			alreadyInstalled: [],
			totalRequested: 0,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Install requirements in background with dependency protection
 */
async function installRequirementsAsync(pipExecutable: string, requirementsPath: string, repoName: string): Promise<void> {
	try {
		console.log(`Installing dependencies for ${repoName} in background...`);

		const analysis = await analyzeRequirements(requirementsPath, repoName);

		if (analysis.skippedCritical.length > 0) {
			console.warn(`Skipped critical packages for ${repoName}:`, analysis.skippedCritical.join(", "));
		}

		if (analysis.safeToInstall.length === 0) {
			console.log(`No new safe dependencies to install for ${repoName}`);
			return;
		}

		console.log(`Installing ${analysis.safeToInstall.length} safe dependencies for ${repoName}`);

		// Create a temporary requirements file with safe dependencies only
		const tempRequirementsPath = requirementsPath + ".safe";
		try {
			await fs.writeFile(tempRequirementsPath, analysis.safeToInstall.join("\n"));

			// Install safe dependencies
			const { stdout, stderr } = await execAsync(`${pipExecutable} install -r ${tempRequirementsPath}`);

			console.log(`Successfully installed safe dependencies for ${repoName}`);
			if (stdout) {
				console.debug(`Install output: ${stdout}`);
			}
		} finally {
			// Clean up temporary file
			if (existsSync(tempRequirementsPath)) {
				await fs.unlink(tempRequirementsPath);
			}
		}
	} catch (error) {
		console.error(`Failed to install dependencies for ${repoName}:`, error);
	}
}

/**
 * Parse GitHub URL to extract repository information and branch
 */
function parseGitHubUrl(url: string): GitHubInfo | null {
	try {
		// Remove trailing slashes and .git extension
		const cleanUrl = url.replace(/\/$/, "");

		// Pattern for GitHub URLs with optional branch/tree
		const githubPattern = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.*))?)?(?:\.git)?$/;

		const match = cleanUrl.match(githubPattern);
		if (!match) {
			return null;
		}

		const user = match[1];
		const repo = match[2];
		const branch = match[3] || "main"; // Default to main branch
		const subfolder = match[4] || undefined;

		// Create clean clone URL
		const cloneUrl = `https://github.com/${user}/${repo}.git`;

		return {
			user,
			repo,
			branch,
			subfolder,
			cloneUrl,
			originalUrl: url,
		};
	} catch (error) {
		console.error(`Error parsing GitHub URL ${url}:`, error);
		return null;
	}
}

/**
 * Get ComfyUI path - this should be implemented based on your project structure
 */
function getComfyUIPath(): string {
	// This should be implemented based on your project's way of getting the ComfyUI path
	// For now, returning a placeholder - you'll need to implement this based on your setup
	return process.env.COMFYUI_PATH || "/path/to/comfyui";
}

/**
 * Main function to sync/install a custom node from URL
 *
 * @param nodeUrl - Git repository URL for the custom node
 * @returns Promise<SyncNodeResponse> - Response object with installation status
 */
export async function syncNode(nodeUrl: string): Promise<SyncNodeResponse> {
	try {
		const comfyuiPath = getComfyUIPath();
		const customNodesPath = path.join(comfyuiPath, "custom_nodes");
		const venvPath = path.join(comfyuiPath, "venv");
		const pipExecutable = path.join(venvPath, "bin", "pip");

		// Check if custom nodes directory exists
		if (!existsSync(customNodesPath)) {
			return {
				success: false,
				alreadyExists: false,
				message: "Custom nodes directory not found",
				repoName: "",
				error: "Custom nodes directory not found",
			};
		}

		// Parse the URL to extract repository information
		const githubInfo = parseGitHubUrl(nodeUrl);
		let repoName: string;
		let cloneUrl: string;
		let branch: string;

		if (githubInfo) {
			// GitHub URL with branch support
			repoName = githubInfo.repo;
			cloneUrl = githubInfo.cloneUrl;
			branch = githubInfo.branch;
			console.log(`Parsed GitHub URL: ${githubInfo.user}/${repoName} (branch: ${branch})`);
		} else {
			// Fallback to original parsing for non-GitHub URLs
			repoName = nodeUrl.split("/").pop()?.replace(".git", "") || "unknown";
			cloneUrl = nodeUrl;
			branch = "main"; // Default branch
			console.log(`Using fallback parsing for non-GitHub URL: ${repoName}`);
		}

		const repoPath = path.join(customNodesPath, repoName);

		// Check if folder already exists
		if (existsSync(repoPath)) {
			console.log(`Custom node ${repoName} already exists`);

			// Check if requirements.txt exists and install missing dependencies in background
			const requirementsPath = path.join(repoPath, "requirements.txt");
			if (existsSync(requirementsPath)) {
				// Analyze requirements first
				const analysis = await analyzeRequirements(requirementsPath, repoName);

				if (analysis.safeToInstall.length > 0) {
					// Install dependencies in background (don't await)
					installRequirementsAsync(pipExecutable, requirementsPath, repoName).catch(console.error);
					console.log(`Installing ${analysis.safeToInstall.length} safe dependencies for existing node ${repoName} in background`);
				}

				return {
					success: true,
					alreadyExists: true,
					message: `Custom node ${repoName} already exists, dependencies being updated in background`,
					repoName,
					dependenciesInstalled: analysis.safeToInstall.length,
					skippedDependencies: analysis.skippedCritical.length,
				};
			}

			return {
				success: true,
				alreadyExists: true,
				message: `Custom node ${repoName} already exists`,
				repoName,
			};
		}

		// Clone the repository with branch support
		console.log(`Cloning custom node from ${cloneUrl} (branch: ${branch})`);

		if (branch && branch !== "main") {
			// Clone specific branch
			await execAsync(`git clone --branch ${branch} --single-branch ${cloneUrl} ${repoPath}`);
			console.log(`Custom node ${repoName} (branch: ${branch}) installed successfully`);
		} else {
			// Clone default branch
			await execAsync(`git clone ${cloneUrl} ${repoPath}`);
			console.log(`Custom node ${repoName} installed successfully`);
		}

		// Check if requirements.txt exists and install dependencies in background
		const requirementsPath = path.join(repoPath, "requirements.txt");
		if (existsSync(requirementsPath)) {
			// Analyze requirements first
			const analysis = await analyzeRequirements(requirementsPath, repoName);

			if (analysis.safeToInstall.length > 0) {
				// Install dependencies in background (don't await)
				installRequirementsAsync(pipExecutable, requirementsPath, repoName).catch(console.error);
				console.log(`Installing ${analysis.safeToInstall.length} safe dependencies for new node ${repoName} in background`);
			}

			return {
				success: true,
				alreadyExists: false,
				message: `Custom node ${repoName} installed successfully, dependencies being installed in background`,
				repoName,
				dependenciesInstalled: analysis.safeToInstall.length,
				skippedDependencies: analysis.skippedCritical.length,
			};
		}

		return {
			success: true,
			alreadyExists: false,
			message: `Custom node ${repoName} installed successfully`,
			repoName,
		};
	} catch (error) {
		console.error(`Error installing custom node ${nodeUrl}:`, error);
		return {
			success: false,
			alreadyExists: false,
			message: `Failed to install custom node: ${error instanceof Error ? error.message : String(error)}`,
			repoName: nodeUrl.split("/").pop()?.replace(".git", "") || "unknown",
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

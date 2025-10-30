/**
 * Simplified Hugging Face model downloader using HF CLI
 * Supports resumable downloads and prevents duplicate downloads
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';
import { existsSync } from 'fs';

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
function parseHuggingFaceUrl(url: string): { repoId: string; type: 'repo' | 'folder' | 'file'; filePath?: string } {
  // Remove trailing slash and normalize URL
  const cleanUrl = url.replace(/\/$/, '');
  
  // Extract repo ID from URL
  const match = cleanUrl.match(/https:\/\/huggingface\.co\/([^\/]+\/[^\/]+)/);
  if (!match) {
    throw new Error('Invalid Hugging Face URL');
  }
  
  const repoId = match[1];
  const remainingPath = cleanUrl.replace(`https://huggingface.co/${repoId}`, '');
  
  // Determine type based on URL structure
  if (!remainingPath || remainingPath === '/tree/main' || remainingPath.startsWith('/tree/')) {
    return { repoId, type: 'repo' };
  } else if (remainingPath.includes('/blob/')) {
    // Extract file path from blob URL
    const filePath = remainingPath.replace(/\/blob\/[^\/]+\//, '');
    return { repoId, type: 'file', filePath };
  } else if (remainingPath.includes('/tree/')) {
    // Extract folder path from tree URL
    const filePath = remainingPath.replace(/\/tree\/[^\/]+\//, '');
    return { repoId, type: 'folder', filePath };
  }
  
  return { repoId, type: 'repo' };
}

/**
 * Check if a file or directory already exists and is complete
 */
async function checkExistingDownload(outputPath: string, type: 'file' | 'folder' | 'repo'): Promise<boolean> {
  if (!existsSync(outputPath)) {
    return false;
  }

  try {
    const stats = await fs.stat(outputPath);
    
    if (type === 'file') {
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
    
    // Determine the target path for existence check
    let targetPath: string;
    if (type === 'file' && filePath) {
      targetPath = path.join(output, path.basename(filePath));
    } else {
      targetPath = output;
    }
    
    // Check if already downloaded
    const alreadyExists = await checkExistingDownload(targetPath, type);
    if (alreadyExists) {
      console.log(`✅ Already exists: ${targetPath}`);
      console.log(`🔄 Skipping download - file/folder already present`);
      return {
        success: true,
        message: `File already exists at ${targetPath}`
      };
    }
    
    // Ensure output directory exists
    await fs.mkdir(output, { recursive: true });
    
    let command: string;
    
    if (type === 'file' && filePath) {
      // Download single file
      command = `hf download ${repoId} ${filePath} --local-dir "${output}"`;
      console.log(`📄 Downloading file: ${filePath}`);
    } else if (type === 'folder' && filePath) {
      // Download folder using include pattern
      command = `hf download ${repoId} --include "${filePath}/*" --local-dir "${output}"`;
      console.log(`📁 Downloading folder: ${filePath}`);
    } else {
      // Download entire repository
      command = `hf download ${repoId} --local-dir "${output}"`;
      console.log(`📦 Downloading repository: ${repoId}`);
    }
    
    console.log(`🔄 Executing: ${command}`);
    
    const { stdout, stderr } = await execAsync(command);
    
    if (stderr && !stderr.includes('warning') && !stderr.includes('already exists') && !stderr.includes('Fetching') && !stderr.includes('100%')) {
      console.warn(`⚠️  Warning: ${stderr}`);
    }
    
    if (stdout) {
      console.log(stdout);
    }
    
    // Verify download completed successfully
    const downloadCompleted = await checkExistingDownload(targetPath, type);
    if (downloadCompleted) {
      console.log(`✅ Successfully downloaded to ${output}`);
      return {
        success: true,
        message: `Successfully downloaded to ${output}`
      };
    } else {
      console.warn(`⚠️  Download may be incomplete. Please check ${output}`);
      return {
        success: false,
        message: `Download may be incomplete. Please check ${output}`
      };
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ Error downloading from ${url}: ${errorMessage}`);
    return {
      success: false,
      message: `Error downloading from ${url}: ${errorMessage}`
    };
  }
}

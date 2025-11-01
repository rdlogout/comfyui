import { homedir } from "os";
import * as path from "path";

export const COMFYUI_URL = "http://localhost:8188";
export const COMFYUI_DIR = process.env.COMFYUI_DIR || path.join(homedir(), "ComfyUI");
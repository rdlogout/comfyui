export const COMFYUI_URL = "http://localhost:8188";
export const COMFYUI_DIR = process.env.COMFYUI_DIR || `${process.env.HOME}/ComfyUI`;

import { ComfyApi } from "@saintno/comfyui-sdk";
export const comfyApi = new ComfyApi(COMFYUI_URL).init(20, 1000);

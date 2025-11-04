import { homedir } from "os";
import * as path from "path";
import dotenv from "dotenv";

export const COMFYUI_URL = "http://localhost:8188";
export const COMFYUI_DIR = process.env.COMFYUI_DIR || path.join(homedir(), "ComfyUI");
dotenv.config({ path: path.join(COMFYUI_DIR, ".env") });
export const MACHINE_ID = process.env.MACHINE_ID;
export const DEV = Bun.env.NODE_ENV === "development";
const DOMAIN = DEV ? `localhost:8787` : `fussion.studio`;
export const BASE_URL = `http${DEV ? "" : "s"}://${DOMAIN}`;
export const WS_URL = `ws${DEV ? "" : "s"}://${DOMAIN}`;
export const DB_PATH = path.join(COMFYUI_DIR, "db.sqlite");
console.table({ MACHINE_ID, DOMAIN, COMFYUI_DIR });

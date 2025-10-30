// @bun
// node_modules/reconnecting-websocket/dist/reconnecting-websocket-mjs.js
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
var extendStatics = function(d, b) {
  extendStatics = Object.setPrototypeOf || { __proto__: [] } instanceof Array && function(d2, b2) {
    d2.__proto__ = b2;
  } || function(d2, b2) {
    for (var p in b2)
      if (b2.hasOwnProperty(p))
        d2[p] = b2[p];
  };
  return extendStatics(d, b);
};
function __extends(d, b) {
  extendStatics(d, b);
  function __() {
    this.constructor = d;
  }
  d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __);
}
function __values(o) {
  var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
  if (m)
    return m.call(o);
  return {
    next: function() {
      if (o && i >= o.length)
        o = undefined;
      return { value: o && o[i++], done: !o };
    }
  };
}
function __read(o, n) {
  var m = typeof Symbol === "function" && o[Symbol.iterator];
  if (!m)
    return o;
  var i = m.call(o), r, ar = [], e;
  try {
    while ((n === undefined || n-- > 0) && !(r = i.next()).done)
      ar.push(r.value);
  } catch (error) {
    e = { error };
  } finally {
    try {
      if (r && !r.done && (m = i["return"]))
        m.call(i);
    } finally {
      if (e)
        throw e.error;
    }
  }
  return ar;
}
function __spread() {
  for (var ar = [], i = 0;i < arguments.length; i++)
    ar = ar.concat(__read(arguments[i]));
  return ar;
}
var Event = function() {
  function Event2(type, target) {
    this.target = target;
    this.type = type;
  }
  return Event2;
}();
var ErrorEvent = function(_super) {
  __extends(ErrorEvent2, _super);
  function ErrorEvent2(error, target) {
    var _this = _super.call(this, "error", target) || this;
    _this.message = error.message;
    _this.error = error;
    return _this;
  }
  return ErrorEvent2;
}(Event);
var CloseEvent = function(_super) {
  __extends(CloseEvent2, _super);
  function CloseEvent2(code, reason, target) {
    if (code === undefined) {
      code = 1000;
    }
    if (reason === undefined) {
      reason = "";
    }
    var _this = _super.call(this, "close", target) || this;
    _this.wasClean = true;
    _this.code = code;
    _this.reason = reason;
    return _this;
  }
  return CloseEvent2;
}(Event);
/*!
 * Reconnecting WebSocket
 * by Pedro Ladaria <pedro.ladaria@gmail.com>
 * https://github.com/pladaria/reconnecting-websocket
 * License MIT
 */
var getGlobalWebSocket = function() {
  if (typeof WebSocket !== "undefined") {
    return WebSocket;
  }
};
var isWebSocket = function(w) {
  return typeof w !== "undefined" && !!w && w.CLOSING === 2;
};
var DEFAULT = {
  maxReconnectionDelay: 1e4,
  minReconnectionDelay: 1000 + Math.random() * 4000,
  minUptime: 5000,
  reconnectionDelayGrowFactor: 1.3,
  connectionTimeout: 4000,
  maxRetries: Infinity,
  maxEnqueuedMessages: Infinity,
  startClosed: false,
  debug: false
};
var ReconnectingWebSocket = function() {
  function ReconnectingWebSocket2(url, protocols, options) {
    var _this = this;
    if (options === undefined) {
      options = {};
    }
    this._listeners = {
      error: [],
      message: [],
      open: [],
      close: []
    };
    this._retryCount = -1;
    this._shouldReconnect = true;
    this._connectLock = false;
    this._binaryType = "blob";
    this._closeCalled = false;
    this._messageQueue = [];
    this.onclose = null;
    this.onerror = null;
    this.onmessage = null;
    this.onopen = null;
    this._handleOpen = function(event) {
      _this._debug("open event");
      var _a = _this._options.minUptime, minUptime = _a === undefined ? DEFAULT.minUptime : _a;
      clearTimeout(_this._connectTimeout);
      _this._uptimeTimeout = setTimeout(function() {
        return _this._acceptOpen();
      }, minUptime);
      _this._ws.binaryType = _this._binaryType;
      _this._messageQueue.forEach(function(message) {
        return _this._ws.send(message);
      });
      _this._messageQueue = [];
      if (_this.onopen) {
        _this.onopen(event);
      }
      _this._listeners.open.forEach(function(listener) {
        return _this._callEventListener(event, listener);
      });
    };
    this._handleMessage = function(event) {
      _this._debug("message event");
      if (_this.onmessage) {
        _this.onmessage(event);
      }
      _this._listeners.message.forEach(function(listener) {
        return _this._callEventListener(event, listener);
      });
    };
    this._handleError = function(event) {
      _this._debug("error event", event.message);
      _this._disconnect(undefined, event.message === "TIMEOUT" ? "timeout" : undefined);
      if (_this.onerror) {
        _this.onerror(event);
      }
      _this._debug("exec error listeners");
      _this._listeners.error.forEach(function(listener) {
        return _this._callEventListener(event, listener);
      });
      _this._connect();
    };
    this._handleClose = function(event) {
      _this._debug("close event");
      _this._clearTimeouts();
      if (_this._shouldReconnect) {
        _this._connect();
      }
      if (_this.onclose) {
        _this.onclose(event);
      }
      _this._listeners.close.forEach(function(listener) {
        return _this._callEventListener(event, listener);
      });
    };
    this._url = url;
    this._protocols = protocols;
    this._options = options;
    if (this._options.startClosed) {
      this._shouldReconnect = false;
    }
    this._connect();
  }
  Object.defineProperty(ReconnectingWebSocket2, "CONNECTING", {
    get: function() {
      return 0;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2, "OPEN", {
    get: function() {
      return 1;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2, "CLOSING", {
    get: function() {
      return 2;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2, "CLOSED", {
    get: function() {
      return 3;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "CONNECTING", {
    get: function() {
      return ReconnectingWebSocket2.CONNECTING;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "OPEN", {
    get: function() {
      return ReconnectingWebSocket2.OPEN;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "CLOSING", {
    get: function() {
      return ReconnectingWebSocket2.CLOSING;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "CLOSED", {
    get: function() {
      return ReconnectingWebSocket2.CLOSED;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "binaryType", {
    get: function() {
      return this._ws ? this._ws.binaryType : this._binaryType;
    },
    set: function(value) {
      this._binaryType = value;
      if (this._ws) {
        this._ws.binaryType = value;
      }
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "retryCount", {
    get: function() {
      return Math.max(this._retryCount, 0);
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "bufferedAmount", {
    get: function() {
      var bytes = this._messageQueue.reduce(function(acc, message) {
        if (typeof message === "string") {
          acc += message.length;
        } else if (message instanceof Blob) {
          acc += message.size;
        } else {
          acc += message.byteLength;
        }
        return acc;
      }, 0);
      return bytes + (this._ws ? this._ws.bufferedAmount : 0);
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "extensions", {
    get: function() {
      return this._ws ? this._ws.extensions : "";
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "protocol", {
    get: function() {
      return this._ws ? this._ws.protocol : "";
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "readyState", {
    get: function() {
      if (this._ws) {
        return this._ws.readyState;
      }
      return this._options.startClosed ? ReconnectingWebSocket2.CLOSED : ReconnectingWebSocket2.CONNECTING;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(ReconnectingWebSocket2.prototype, "url", {
    get: function() {
      return this._ws ? this._ws.url : "";
    },
    enumerable: true,
    configurable: true
  });
  ReconnectingWebSocket2.prototype.close = function(code, reason) {
    if (code === undefined) {
      code = 1000;
    }
    this._closeCalled = true;
    this._shouldReconnect = false;
    this._clearTimeouts();
    if (!this._ws) {
      this._debug("close enqueued: no ws instance");
      return;
    }
    if (this._ws.readyState === this.CLOSED) {
      this._debug("close: already closed");
      return;
    }
    this._ws.close(code, reason);
  };
  ReconnectingWebSocket2.prototype.reconnect = function(code, reason) {
    this._shouldReconnect = true;
    this._closeCalled = false;
    this._retryCount = -1;
    if (!this._ws || this._ws.readyState === this.CLOSED) {
      this._connect();
    } else {
      this._disconnect(code, reason);
      this._connect();
    }
  };
  ReconnectingWebSocket2.prototype.send = function(data) {
    if (this._ws && this._ws.readyState === this.OPEN) {
      this._debug("send", data);
      this._ws.send(data);
    } else {
      var _a = this._options.maxEnqueuedMessages, maxEnqueuedMessages = _a === undefined ? DEFAULT.maxEnqueuedMessages : _a;
      if (this._messageQueue.length < maxEnqueuedMessages) {
        this._debug("enqueue", data);
        this._messageQueue.push(data);
      }
    }
  };
  ReconnectingWebSocket2.prototype.addEventListener = function(type, listener) {
    if (this._listeners[type]) {
      this._listeners[type].push(listener);
    }
  };
  ReconnectingWebSocket2.prototype.dispatchEvent = function(event) {
    var e_1, _a;
    var listeners = this._listeners[event.type];
    if (listeners) {
      try {
        for (var listeners_1 = __values(listeners), listeners_1_1 = listeners_1.next();!listeners_1_1.done; listeners_1_1 = listeners_1.next()) {
          var listener = listeners_1_1.value;
          this._callEventListener(event, listener);
        }
      } catch (e_1_1) {
        e_1 = { error: e_1_1 };
      } finally {
        try {
          if (listeners_1_1 && !listeners_1_1.done && (_a = listeners_1.return))
            _a.call(listeners_1);
        } finally {
          if (e_1)
            throw e_1.error;
        }
      }
    }
    return true;
  };
  ReconnectingWebSocket2.prototype.removeEventListener = function(type, listener) {
    if (this._listeners[type]) {
      this._listeners[type] = this._listeners[type].filter(function(l) {
        return l !== listener;
      });
    }
  };
  ReconnectingWebSocket2.prototype._debug = function() {
    var args = [];
    for (var _i = 0;_i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    if (this._options.debug) {
      console.log.apply(console, __spread(["RWS>"], args));
    }
  };
  ReconnectingWebSocket2.prototype._getNextDelay = function() {
    var _a = this._options, _b = _a.reconnectionDelayGrowFactor, reconnectionDelayGrowFactor = _b === undefined ? DEFAULT.reconnectionDelayGrowFactor : _b, _c = _a.minReconnectionDelay, minReconnectionDelay = _c === undefined ? DEFAULT.minReconnectionDelay : _c, _d = _a.maxReconnectionDelay, maxReconnectionDelay = _d === undefined ? DEFAULT.maxReconnectionDelay : _d;
    var delay = 0;
    if (this._retryCount > 0) {
      delay = minReconnectionDelay * Math.pow(reconnectionDelayGrowFactor, this._retryCount - 1);
      if (delay > maxReconnectionDelay) {
        delay = maxReconnectionDelay;
      }
    }
    this._debug("next delay", delay);
    return delay;
  };
  ReconnectingWebSocket2.prototype._wait = function() {
    var _this = this;
    return new Promise(function(resolve) {
      setTimeout(resolve, _this._getNextDelay());
    });
  };
  ReconnectingWebSocket2.prototype._getNextUrl = function(urlProvider) {
    if (typeof urlProvider === "string") {
      return Promise.resolve(urlProvider);
    }
    if (typeof urlProvider === "function") {
      var url = urlProvider();
      if (typeof url === "string") {
        return Promise.resolve(url);
      }
      if (!!url.then) {
        return url;
      }
    }
    throw Error("Invalid URL");
  };
  ReconnectingWebSocket2.prototype._connect = function() {
    var _this = this;
    if (this._connectLock || !this._shouldReconnect) {
      return;
    }
    this._connectLock = true;
    var _a = this._options, _b = _a.maxRetries, maxRetries = _b === undefined ? DEFAULT.maxRetries : _b, _c = _a.connectionTimeout, connectionTimeout = _c === undefined ? DEFAULT.connectionTimeout : _c, _d = _a.WebSocket, WebSocket2 = _d === undefined ? getGlobalWebSocket() : _d;
    if (this._retryCount >= maxRetries) {
      this._debug("max retries reached", this._retryCount, ">=", maxRetries);
      return;
    }
    this._retryCount++;
    this._debug("connect", this._retryCount);
    this._removeListeners();
    if (!isWebSocket(WebSocket2)) {
      throw Error("No valid WebSocket class provided");
    }
    this._wait().then(function() {
      return _this._getNextUrl(_this._url);
    }).then(function(url) {
      if (_this._closeCalled) {
        return;
      }
      _this._debug("connect", { url, protocols: _this._protocols });
      _this._ws = _this._protocols ? new WebSocket2(url, _this._protocols) : new WebSocket2(url);
      _this._ws.binaryType = _this._binaryType;
      _this._connectLock = false;
      _this._addListeners();
      _this._connectTimeout = setTimeout(function() {
        return _this._handleTimeout();
      }, connectionTimeout);
    });
  };
  ReconnectingWebSocket2.prototype._handleTimeout = function() {
    this._debug("timeout event");
    this._handleError(new ErrorEvent(Error("TIMEOUT"), this));
  };
  ReconnectingWebSocket2.prototype._disconnect = function(code, reason) {
    if (code === undefined) {
      code = 1000;
    }
    this._clearTimeouts();
    if (!this._ws) {
      return;
    }
    this._removeListeners();
    try {
      this._ws.close(code, reason);
      this._handleClose(new CloseEvent(code, reason, this));
    } catch (error) {}
  };
  ReconnectingWebSocket2.prototype._acceptOpen = function() {
    this._debug("accept open");
    this._retryCount = 0;
  };
  ReconnectingWebSocket2.prototype._callEventListener = function(event, listener) {
    if ("handleEvent" in listener) {
      listener.handleEvent(event);
    } else {
      listener(event);
    }
  };
  ReconnectingWebSocket2.prototype._removeListeners = function() {
    if (!this._ws) {
      return;
    }
    this._debug("removeListeners");
    this._ws.removeEventListener("open", this._handleOpen);
    this._ws.removeEventListener("close", this._handleClose);
    this._ws.removeEventListener("message", this._handleMessage);
    this._ws.removeEventListener("error", this._handleError);
  };
  ReconnectingWebSocket2.prototype._addListeners = function() {
    if (!this._ws) {
      return;
    }
    this._debug("addListeners");
    this._ws.addEventListener("open", this._handleOpen);
    this._ws.addEventListener("close", this._handleClose);
    this._ws.addEventListener("message", this._handleMessage);
    this._ws.addEventListener("error", this._handleError);
  };
  ReconnectingWebSocket2.prototype._clearTimeouts = function() {
    clearTimeout(this._connectTimeout);
    clearTimeout(this._uptimeTimeout);
  };
  return ReconnectingWebSocket2;
}();
var reconnecting_websocket_mjs_default = ReconnectingWebSocket;

// src/dependency/node.ts
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { existsSync } from "fs";
var execAsync = promisify(exec);
var CRITICAL_DEPS = new Set([
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
  "websockets"
]);
async function getInstalledPackages() {
  try {
    const { stdout } = await execAsync("pip list --format=json");
    const packages = JSON.parse(stdout);
    return packages.reduce((acc, pkg) => {
      acc[pkg.name.toLowerCase()] = pkg.version;
      return acc;
    }, {});
  } catch (error) {
    console.error("Error getting installed packages:", error);
    return {};
  }
}
function parseRequirementLine(line) {
  const trimmedLine = line.trim();
  if (!trimmedLine || trimmedLine.startsWith("#")) {
    return null;
  }
  const match = trimmedLine.match(/^([a-zA-Z0-9_-]+)([><=!~]+.*)?$/);
  if (match) {
    return {
      name: match[1].toLowerCase().replace("_", "-"),
      original: trimmedLine,
      constraint: match[2] || ""
    };
  }
  return null;
}
async function analyzeRequirements(requirementsPath, repoName) {
  try {
    const installedPackages = await getInstalledPackages();
    const safeRequirements = [];
    const skippedPackages = [];
    const alreadyInstalled = [];
    const content = await fs.readFile(requirementsPath, "utf-8");
    const lines = content.split(`
`);
    for (const line of lines) {
      const parsed = parseRequirementLine(line);
      if (!parsed)
        continue;
      const packageName = parsed.name;
      const originalLine = parsed.original;
      if (CRITICAL_DEPS.has(packageName)) {
        if (packageName in installedPackages) {
          skippedPackages.push(`${packageName} (installed: ${installedPackages[packageName]} - protected from upgrade)`);
        } else {
          safeRequirements.push(originalLine);
        }
        continue;
      }
      safeRequirements.push(originalLine);
    }
    return {
      safeToInstall: safeRequirements,
      skippedCritical: skippedPackages,
      alreadyInstalled,
      totalRequested: safeRequirements.length + skippedPackages.length + alreadyInstalled.length
    };
  } catch (error) {
    console.error(`Error analyzing requirements for ${repoName}:`, error);
    return {
      safeToInstall: [],
      skippedCritical: [],
      alreadyInstalled: [],
      totalRequested: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
async function installRequirementsAsync(pipExecutable, requirementsPath, repoName) {
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
    const tempRequirementsPath = requirementsPath + ".safe";
    try {
      await fs.writeFile(tempRequirementsPath, analysis.safeToInstall.join(`
`));
      const { stdout, stderr } = await execAsync(`${pipExecutable} install -r ${tempRequirementsPath}`);
      console.log(`Successfully installed safe dependencies for ${repoName}`);
      if (stdout) {
        console.debug(`Install output: ${stdout}`);
      }
    } finally {
      if (existsSync(tempRequirementsPath)) {
        await fs.unlink(tempRequirementsPath);
      }
    }
  } catch (error) {
    console.error(`Failed to install dependencies for ${repoName}:`, error);
  }
}
function parseGitHubUrl(url) {
  try {
    const cleanUrl = url.replace(/\/$/, "");
    const githubPattern = /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.*))?)?(?:\.git)?$/;
    const match = cleanUrl.match(githubPattern);
    if (!match) {
      return null;
    }
    const user = match[1];
    const repo = match[2];
    const branch = match[3] || "main";
    const subfolder = match[4] || undefined;
    const cloneUrl = `https://github.com/${user}/${repo}.git`;
    return {
      user,
      repo,
      branch,
      subfolder,
      cloneUrl,
      originalUrl: url
    };
  } catch (error) {
    console.error(`Error parsing GitHub URL ${url}:`, error);
    return null;
  }
}
function getComfyUIPath() {
  return process.env.COMFYUI_PATH || "/path/to/comfyui";
}
async function syncNode(nodeUrl) {
  try {
    const comfyuiPath = getComfyUIPath();
    const customNodesPath = path.join(comfyuiPath, "custom_nodes");
    const venvPath = path.join(comfyuiPath, "venv");
    const pipExecutable = path.join(venvPath, "bin", "pip");
    if (!existsSync(customNodesPath)) {
      return {
        success: false,
        alreadyExists: false,
        message: "Custom nodes directory not found",
        repoName: "",
        error: "Custom nodes directory not found"
      };
    }
    const githubInfo = parseGitHubUrl(nodeUrl);
    let repoName;
    let cloneUrl;
    let branch;
    if (githubInfo) {
      repoName = githubInfo.repo;
      cloneUrl = githubInfo.cloneUrl;
      branch = githubInfo.branch;
      console.log(`Parsed GitHub URL: ${githubInfo.user}/${repoName} (branch: ${branch})`);
    } else {
      repoName = nodeUrl.split("/").pop()?.replace(".git", "") || "unknown";
      cloneUrl = nodeUrl;
      branch = "main";
      console.log(`Using fallback parsing for non-GitHub URL: ${repoName}`);
    }
    const repoPath = path.join(customNodesPath, repoName);
    if (existsSync(repoPath)) {
      console.log(`Custom node ${repoName} already exists`);
      const requirementsPath2 = path.join(repoPath, "requirements.txt");
      if (existsSync(requirementsPath2)) {
        const analysis = await analyzeRequirements(requirementsPath2, repoName);
        if (analysis.safeToInstall.length > 0) {
          installRequirementsAsync(pipExecutable, requirementsPath2, repoName).catch(console.error);
          console.log(`Installing ${analysis.safeToInstall.length} safe dependencies for existing node ${repoName} in background`);
        }
        return {
          success: true,
          alreadyExists: true,
          message: `Custom node ${repoName} already exists, dependencies being updated in background`,
          repoName,
          dependenciesInstalled: analysis.safeToInstall.length,
          skippedDependencies: analysis.skippedCritical.length
        };
      }
      return {
        success: true,
        alreadyExists: true,
        message: `Custom node ${repoName} already exists`,
        repoName
      };
    }
    console.log(`Cloning custom node from ${cloneUrl} (branch: ${branch})`);
    if (branch && branch !== "main") {
      await execAsync(`git clone --branch ${branch} --single-branch ${cloneUrl} ${repoPath}`);
      console.log(`Custom node ${repoName} (branch: ${branch}) installed successfully`);
    } else {
      await execAsync(`git clone ${cloneUrl} ${repoPath}`);
      console.log(`Custom node ${repoName} installed successfully`);
    }
    const requirementsPath = path.join(repoPath, "requirements.txt");
    if (existsSync(requirementsPath)) {
      const analysis = await analyzeRequirements(requirementsPath, repoName);
      if (analysis.safeToInstall.length > 0) {
        installRequirementsAsync(pipExecutable, requirementsPath, repoName).catch(console.error);
        console.log(`Installing ${analysis.safeToInstall.length} safe dependencies for new node ${repoName} in background`);
      }
      return {
        success: true,
        alreadyExists: false,
        message: `Custom node ${repoName} installed successfully, dependencies being installed in background`,
        repoName,
        dependenciesInstalled: analysis.safeToInstall.length,
        skippedDependencies: analysis.skippedCritical.length
      };
    }
    return {
      success: true,
      alreadyExists: false,
      message: `Custom node ${repoName} installed successfully`,
      repoName
    };
  } catch (error) {
    console.error(`Error installing custom node ${nodeUrl}:`, error);
    return {
      success: false,
      alreadyExists: false,
      message: `Failed to install custom node: ${error instanceof Error ? error.message : String(error)}`,
      repoName: nodeUrl.split("/").pop()?.replace(".git", "") || "unknown",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// src/dependency/model.ts
import { exec as exec2 } from "child_process";
import { promisify as promisify2 } from "util";
import * as path2 from "path";
import * as fs2 from "fs/promises";
import { existsSync as existsSync2 } from "fs";
var execAsync2 = promisify2(exec2);
function parseHuggingFaceUrl(url) {
  const cleanUrl = url.replace(/\/$/, "");
  const match = cleanUrl.match(/https:\/\/huggingface\.co\/([^\/]+\/[^\/]+)/);
  if (!match) {
    throw new Error("Invalid Hugging Face URL");
  }
  const repoId = match[1];
  const remainingPath = cleanUrl.replace(`https://huggingface.co/${repoId}`, "");
  if (!remainingPath || remainingPath === "/tree/main" || remainingPath.startsWith("/tree/")) {
    return { repoId, type: "repo" };
  } else if (remainingPath.includes("/blob/")) {
    const filePath = remainingPath.replace(/\/blob\/[^\/]+\//, "");
    return { repoId, type: "file", filePath };
  } else if (remainingPath.includes("/tree/")) {
    const filePath = remainingPath.replace(/\/tree\/[^\/]+\//, "");
    return { repoId, type: "folder", filePath };
  }
  return { repoId, type: "repo" };
}
async function checkExistingDownload(outputPath, type) {
  if (!existsSync2(outputPath)) {
    return false;
  }
  try {
    const stats = await fs2.stat(outputPath);
    if (type === "file") {
      return stats.isFile() && stats.size > 0;
    } else {
      if (stats.isDirectory()) {
        const files = await fs2.readdir(outputPath);
        return files.length > 0;
      }
    }
  } catch (error) {
    console.warn(`Warning: Could not check existing download: ${error}`);
  }
  return false;
}
async function downloadModel(url, output) {
  try {
    const { repoId, type, filePath } = parseHuggingFaceUrl(url);
    console.log(`\uD83D\uDCE5 Downloading from ${url}...`);
    console.log(`\uD83D\uDCC2 Output directory: ${output}`);
    let targetPath;
    if (type === "file" && filePath) {
      targetPath = path2.join(output, path2.basename(filePath));
    } else {
      targetPath = output;
    }
    const alreadyExists = await checkExistingDownload(targetPath, type);
    if (alreadyExists) {
      console.log(`\u2705 Already exists: ${targetPath}`);
      console.log(`\uD83D\uDD04 Skipping download - file/folder already present`);
      return {
        success: true,
        message: `File already exists at ${targetPath}`
      };
    }
    await fs2.mkdir(output, { recursive: true });
    let command;
    if (type === "file" && filePath) {
      command = `hf download ${repoId} ${filePath} --local-dir "${output}"`;
      console.log(`\uD83D\uDCC4 Downloading file: ${filePath}`);
    } else if (type === "folder" && filePath) {
      command = `hf download ${repoId} --include "${filePath}/*" --local-dir "${output}"`;
      console.log(`\uD83D\uDCC1 Downloading folder: ${filePath}`);
    } else {
      command = `hf download ${repoId} --local-dir "${output}"`;
      console.log(`\uD83D\uDCE6 Downloading repository: ${repoId}`);
    }
    console.log(`\uD83D\uDD04 Executing: ${command}`);
    const { stdout, stderr } = await execAsync2(command);
    if (stderr && !stderr.includes("warning") && !stderr.includes("already exists") && !stderr.includes("Fetching") && !stderr.includes("100%")) {
      console.warn(`\u26A0\uFE0F  Warning: ${stderr}`);
    }
    if (stdout) {
      console.log(stdout);
    }
    const downloadCompleted = await checkExistingDownload(targetPath, type);
    if (downloadCompleted) {
      console.log(`\u2705 Successfully downloaded to ${output}`);
      return {
        success: true,
        message: `Successfully downloaded to ${output}`
      };
    } else {
      console.warn(`\u26A0\uFE0F  Download may be incomplete. Please check ${output}`);
      return {
        success: false,
        message: `Download may be incomplete. Please check ${output}`
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`\u274C Error downloading from ${url}: ${errorMessage}`);
    return {
      success: false,
      message: `Error downloading from ${url}: ${errorMessage}`
    };
  }
}

// node_modules/@orpc/shared/dist/index.mjs
function resolveMaybeOptionalOptions(rest) {
  return rest[0] ?? {};
}
function toArray(value) {
  return Array.isArray(value) ? value : value === undefined || value === null ? [] : [value];
}
var ORPC_NAME = "orpc";
var ORPC_SHARED_PACKAGE_NAME = "@orpc/shared";
var ORPC_SHARED_PACKAGE_VERSION = "1.10.2";

class AbortError extends Error {
  constructor(...rest) {
    super(...rest);
    this.name = "AbortError";
  }
}
function once(fn) {
  let cached;
  return () => {
    if (cached) {
      return cached.result;
    }
    const result = fn();
    cached = { result };
    return result;
  };
}
function sequential(fn) {
  let lastOperationPromise = Promise.resolve();
  return (...args) => {
    return lastOperationPromise = lastOperationPromise.catch(() => {}).then(() => {
      return fn(...args);
    });
  };
}
var SPAN_ERROR_STATUS = 2;
var GLOBAL_OTEL_CONFIG_KEY = `__${ORPC_SHARED_PACKAGE_NAME}@${ORPC_SHARED_PACKAGE_VERSION}/otel/config__`;
function getGlobalOtelConfig() {
  return globalThis[GLOBAL_OTEL_CONFIG_KEY];
}
function startSpan(name, options = {}, context) {
  const tracer = getGlobalOtelConfig()?.tracer;
  return tracer?.startSpan(name, options, context);
}
function setSpanError(span, error, options = {}) {
  if (!span) {
    return;
  }
  const exception = toOtelException(error);
  span.recordException(exception);
  if (!options.signal?.aborted || options.signal.reason !== error) {
    span.setStatus({
      code: SPAN_ERROR_STATUS,
      message: exception.message
    });
  }
}
function toOtelException(error) {
  if (error instanceof Error) {
    const exception = {
      message: error.message,
      name: error.name,
      stack: error.stack
    };
    if ("code" in error && (typeof error.code === "string" || typeof error.code === "number")) {
      exception.code = error.code;
    }
    return exception;
  }
  return { message: String(error) };
}
async function runWithSpan({ name, context, ...options }, fn) {
  const tracer = getGlobalOtelConfig()?.tracer;
  if (!tracer) {
    return fn();
  }
  const callback = async (span) => {
    try {
      return await fn(span);
    } catch (e) {
      setSpanError(span, e, options);
      throw e;
    } finally {
      span.end();
    }
  };
  if (context) {
    return tracer.startActiveSpan(name, options, context, callback);
  } else {
    return tracer.startActiveSpan(name, options, callback);
  }
}
async function runInSpanContext(span, fn) {
  const otelConfig = getGlobalOtelConfig();
  if (!span || !otelConfig) {
    return fn();
  }
  const ctx = otelConfig.trace.setSpan(otelConfig.context.active(), span);
  return otelConfig.context.with(ctx, fn);
}
function isAsyncIteratorObject(maybe) {
  if (!maybe || typeof maybe !== "object") {
    return false;
  }
  return "next" in maybe && typeof maybe.next === "function" && Symbol.asyncIterator in maybe && typeof maybe[Symbol.asyncIterator] === "function";
}
var fallbackAsyncDisposeSymbol = Symbol.for("asyncDispose");
var asyncDisposeSymbol = Symbol.asyncDispose ?? fallbackAsyncDisposeSymbol;

class AsyncIteratorClass {
  #isDone = false;
  #isExecuteComplete = false;
  #cleanup;
  #next;
  constructor(next, cleanup) {
    this.#cleanup = cleanup;
    this.#next = sequential(async () => {
      if (this.#isDone) {
        return { done: true, value: undefined };
      }
      try {
        const result = await next();
        if (result.done) {
          this.#isDone = true;
        }
        return result;
      } catch (err) {
        this.#isDone = true;
        throw err;
      } finally {
        if (this.#isDone && !this.#isExecuteComplete) {
          this.#isExecuteComplete = true;
          await this.#cleanup("next");
        }
      }
    });
  }
  next() {
    return this.#next();
  }
  async return(value) {
    this.#isDone = true;
    if (!this.#isExecuteComplete) {
      this.#isExecuteComplete = true;
      await this.#cleanup("return");
    }
    return { done: true, value };
  }
  async throw(err) {
    this.#isDone = true;
    if (!this.#isExecuteComplete) {
      this.#isExecuteComplete = true;
      await this.#cleanup("throw");
    }
    throw err;
  }
  async[asyncDisposeSymbol]() {
    this.#isDone = true;
    if (!this.#isExecuteComplete) {
      this.#isExecuteComplete = true;
      await this.#cleanup("dispose");
    }
  }
  [Symbol.asyncIterator]() {
    return this;
  }
}
function asyncIteratorWithSpan({ name, ...options }, iterator) {
  let span;
  return new AsyncIteratorClass(async () => {
    span ??= startSpan(name);
    try {
      const result = await runInSpanContext(span, () => iterator.next());
      span?.addEvent(result.done ? "completed" : "yielded");
      return result;
    } catch (err) {
      setSpanError(span, err, options);
      throw err;
    }
  }, async (reason) => {
    try {
      if (reason !== "next") {
        await runInSpanContext(span, () => iterator.return?.());
      }
    } catch (err) {
      setSpanError(span, err, options);
      throw err;
    } finally {
      span?.end();
    }
  });
}

class EventPublisher {
  #listenersMap = /* @__PURE__ */ new Map;
  #maxBufferedEvents;
  constructor(options = {}) {
    this.#maxBufferedEvents = options.maxBufferedEvents ?? 100;
  }
  get size() {
    return this.#listenersMap.size;
  }
  publish(event, payload) {
    const listeners = this.#listenersMap.get(event);
    if (!listeners) {
      return;
    }
    for (const listener of listeners) {
      listener(payload);
    }
  }
  subscribe(event, listenerOrOptions) {
    if (typeof listenerOrOptions === "function") {
      let listeners = this.#listenersMap.get(event);
      if (!listeners) {
        this.#listenersMap.set(event, listeners = []);
      }
      listeners.push(listenerOrOptions);
      return once(() => {
        listeners.splice(listeners.indexOf(listenerOrOptions), 1);
        if (listeners.length === 0) {
          this.#listenersMap.delete(event);
        }
      });
    }
    const signal = listenerOrOptions?.signal;
    const maxBufferedEvents = listenerOrOptions?.maxBufferedEvents ?? this.#maxBufferedEvents;
    signal?.throwIfAborted();
    const bufferedEvents = [];
    const pullResolvers = [];
    const unsubscribe = this.subscribe(event, (payload) => {
      const resolver = pullResolvers.shift();
      if (resolver) {
        resolver[0]({ done: false, value: payload });
      } else {
        bufferedEvents.push(payload);
        if (bufferedEvents.length > maxBufferedEvents) {
          bufferedEvents.shift();
        }
      }
    });
    const abortListener = (event2) => {
      unsubscribe();
      pullResolvers.forEach((resolver) => resolver[1](event2.target.reason));
      pullResolvers.length = 0;
      bufferedEvents.length = 0;
    };
    signal?.addEventListener("abort", abortListener, { once: true });
    return new AsyncIteratorClass(async () => {
      if (signal?.aborted) {
        throw signal.reason;
      }
      if (bufferedEvents.length > 0) {
        return { done: false, value: bufferedEvents.shift() };
      }
      return new Promise((resolve, reject) => {
        pullResolvers.push([resolve, reject]);
      });
    }, async () => {
      unsubscribe();
      signal?.removeEventListener("abort", abortListener);
      pullResolvers.forEach((resolver) => resolver[0]({ done: true, value: undefined }));
      pullResolvers.length = 0;
      bufferedEvents.length = 0;
    });
  }
}

class SequentialIdGenerator {
  index = BigInt(1);
  generate() {
    const id = this.index.toString(36);
    this.index++;
    return id;
  }
}
function intercept(interceptors, options, main) {
  const next = (options2, index) => {
    const interceptor = interceptors[index];
    if (!interceptor) {
      return main(options2);
    }
    return interceptor({
      ...options2,
      next: (newOptions = options2) => next(newOptions, index + 1)
    });
  };
  return next(options, 0);
}
function parseEmptyableJSON(text) {
  if (!text) {
    return;
  }
  return JSON.parse(text);
}
function stringifyJSON(value) {
  return JSON.stringify(value);
}
function getConstructor(value) {
  if (!isTypescriptObject(value)) {
    return null;
  }
  return Object.getPrototypeOf(value)?.constructor;
}
function isObject(value) {
  if (!value || typeof value !== "object") {
    return false;
  }
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || !proto || !proto.constructor;
}
function isTypescriptObject(value) {
  return !!value && (typeof value === "object" || typeof value === "function");
}
function value(value2, ...args) {
  if (typeof value2 === "function") {
    return value2(...args);
  }
  return value2;
}
function preventNativeAwait(target) {
  return new Proxy(target, {
    get(target2, prop, receiver) {
      const value2 = Reflect.get(target2, prop, receiver);
      if (prop !== "then" || typeof value2 !== "function") {
        return value2;
      }
      return new Proxy(value2, {
        apply(targetFn, thisArg, args) {
          if (args.length !== 2 || args.some((arg) => !isNativeFunction(arg))) {
            return Reflect.apply(targetFn, thisArg, args);
          }
          let shouldOmit = true;
          args[0].call(thisArg, preventNativeAwait(new Proxy(target2, {
            get: (target3, prop2, receiver2) => {
              if (shouldOmit && prop2 === "then") {
                shouldOmit = false;
                return;
              }
              return Reflect.get(target3, prop2, receiver2);
            }
          })));
        }
      });
    }
  });
}
var NATIVE_FUNCTION_REGEX = /^\s*function\s*\(\)\s*\{\s*\[native code\]\s*\}\s*$/;
function isNativeFunction(fn) {
  return typeof fn === "function" && NATIVE_FUNCTION_REGEX.test(fn.toString());
}
function tryDecodeURIComponent(value2) {
  try {
    return decodeURIComponent(value2);
  } catch {
    return value2;
  }
}
// node_modules/@orpc/standard-server/dist/index.mjs
class EventEncoderError extends TypeError {
}

class EventDecoderError extends TypeError {
}

class ErrorEvent2 extends Error {
  data;
  constructor(options) {
    super(options?.message ?? "An error event was received", options);
    this.data = options?.data;
  }
}
function decodeEventMessage(encoded) {
  const lines = encoded.replace(/\n+$/, "").split(/\n/);
  const message = {
    data: undefined,
    event: undefined,
    id: undefined,
    retry: undefined,
    comments: []
  };
  for (const line of lines) {
    const index = line.indexOf(":");
    const key = index === -1 ? line : line.slice(0, index);
    const value2 = index === -1 ? "" : line.slice(index + 1).replace(/^\s/, "");
    if (index === 0) {
      message.comments.push(value2);
    } else if (key === "data") {
      message.data ??= "";
      message.data += `${value2}
`;
    } else if (key === "event") {
      message.event = value2;
    } else if (key === "id") {
      message.id = value2;
    } else if (key === "retry") {
      const maybeInteger = Number.parseInt(value2);
      if (Number.isInteger(maybeInteger) && maybeInteger >= 0 && maybeInteger.toString() === value2) {
        message.retry = maybeInteger;
      }
    }
  }
  message.data = message.data?.replace(/\n$/, "");
  return message;
}

class EventDecoder {
  constructor(options = {}) {
    this.options = options;
  }
  incomplete = "";
  feed(chunk) {
    this.incomplete += chunk;
    const lastCompleteIndex = this.incomplete.lastIndexOf(`

`);
    if (lastCompleteIndex === -1) {
      return;
    }
    const completes = this.incomplete.slice(0, lastCompleteIndex).split(/\n\n/);
    this.incomplete = this.incomplete.slice(lastCompleteIndex + 2);
    for (const encoded of completes) {
      const message = decodeEventMessage(`${encoded}

`);
      if (this.options.onEvent) {
        this.options.onEvent(message);
      }
    }
    this.incomplete = "";
  }
  end() {
    if (this.incomplete) {
      throw new EventDecoderError("Event Iterator ended before complete");
    }
  }
}

class EventDecoderStream extends TransformStream {
  constructor() {
    let decoder;
    super({
      start(controller) {
        decoder = new EventDecoder({
          onEvent: (event) => {
            controller.enqueue(event);
          }
        });
      },
      transform(chunk) {
        decoder.feed(chunk);
      },
      flush() {
        decoder.end();
      }
    });
  }
}
function assertEventId(id) {
  if (id.includes(`
`)) {
    throw new EventEncoderError("Event's id must not contain a newline character");
  }
}
function assertEventName(event) {
  if (event.includes(`
`)) {
    throw new EventEncoderError("Event's event must not contain a newline character");
  }
}
function assertEventRetry(retry) {
  if (!Number.isInteger(retry) || retry < 0) {
    throw new EventEncoderError("Event's retry must be a integer and >= 0");
  }
}
function assertEventComment(comment) {
  if (comment.includes(`
`)) {
    throw new EventEncoderError("Event's comment must not contain a newline character");
  }
}
function encodeEventData(data) {
  const lines = data?.split(/\n/) ?? [];
  let output = "";
  for (const line of lines) {
    output += `data: ${line}
`;
  }
  return output;
}
function encodeEventComments(comments) {
  let output = "";
  for (const comment of comments ?? []) {
    assertEventComment(comment);
    output += `: ${comment}
`;
  }
  return output;
}
function encodeEventMessage(message) {
  let output = "";
  output += encodeEventComments(message.comments);
  if (message.event !== undefined) {
    assertEventName(message.event);
    output += `event: ${message.event}
`;
  }
  if (message.retry !== undefined) {
    assertEventRetry(message.retry);
    output += `retry: ${message.retry}
`;
  }
  if (message.id !== undefined) {
    assertEventId(message.id);
    output += `id: ${message.id}
`;
  }
  output += encodeEventData(message.data);
  output += `
`;
  return output;
}
var EVENT_SOURCE_META_SYMBOL = Symbol("ORPC_EVENT_SOURCE_META");
function withEventMeta(container, meta) {
  if (meta.id === undefined && meta.retry === undefined && !meta.comments?.length) {
    return container;
  }
  if (meta.id !== undefined) {
    assertEventId(meta.id);
  }
  if (meta.retry !== undefined) {
    assertEventRetry(meta.retry);
  }
  if (meta.comments !== undefined) {
    for (const comment of meta.comments) {
      assertEventComment(comment);
    }
  }
  return new Proxy(container, {
    get(target, prop, receiver) {
      if (prop === EVENT_SOURCE_META_SYMBOL) {
        return meta;
      }
      return Reflect.get(target, prop, receiver);
    }
  });
}
function getEventMeta(container) {
  return isTypescriptObject(container) ? Reflect.get(container, EVENT_SOURCE_META_SYMBOL) : undefined;
}
function generateContentDisposition(filename) {
  const escapedFileName = filename.replace(/"/g, "\\\"");
  const encodedFilenameStar = encodeURIComponent(filename).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`).replace(/%(7C|60|5E)/g, (str, hex) => String.fromCharCode(Number.parseInt(hex, 16)));
  return `inline; filename="${escapedFileName}"; filename*=utf-8''${encodedFilenameStar}`;
}
function getFilenameFromContentDisposition(contentDisposition) {
  const encodedFilenameStarMatch = contentDisposition.match(/filename\*=(UTF-8'')?([^;]*)/i);
  if (encodedFilenameStarMatch && typeof encodedFilenameStarMatch[2] === "string") {
    return tryDecodeURIComponent(encodedFilenameStarMatch[2]);
  }
  const encodedFilenameMatch = contentDisposition.match(/filename="((?:\\"|[^"])*)"/i);
  if (encodedFilenameMatch && typeof encodedFilenameMatch[1] === "string") {
    return encodedFilenameMatch[1].replace(/\\"/g, '"');
  }
}
function mergeStandardHeaders(a, b) {
  const merged = { ...a };
  for (const key in b) {
    if (Array.isArray(b[key])) {
      merged[key] = [...toArray(merged[key]), ...b[key]];
    } else if (b[key] !== undefined) {
      if (Array.isArray(merged[key])) {
        merged[key] = [...merged[key], b[key]];
      } else if (merged[key] !== undefined) {
        merged[key] = [merged[key], b[key]];
      } else {
        merged[key] = b[key];
      }
    }
  }
  return merged;
}

// node_modules/@orpc/client/dist/shared/client.CcxIdvpr.mjs
var ORPC_CLIENT_PACKAGE_NAME = "@orpc/client";
var ORPC_CLIENT_PACKAGE_VERSION = "1.10.2";
var COMMON_ORPC_ERROR_DEFS = {
  BAD_REQUEST: {
    status: 400,
    message: "Bad Request"
  },
  UNAUTHORIZED: {
    status: 401,
    message: "Unauthorized"
  },
  FORBIDDEN: {
    status: 403,
    message: "Forbidden"
  },
  NOT_FOUND: {
    status: 404,
    message: "Not Found"
  },
  METHOD_NOT_SUPPORTED: {
    status: 405,
    message: "Method Not Supported"
  },
  NOT_ACCEPTABLE: {
    status: 406,
    message: "Not Acceptable"
  },
  TIMEOUT: {
    status: 408,
    message: "Request Timeout"
  },
  CONFLICT: {
    status: 409,
    message: "Conflict"
  },
  PRECONDITION_FAILED: {
    status: 412,
    message: "Precondition Failed"
  },
  PAYLOAD_TOO_LARGE: {
    status: 413,
    message: "Payload Too Large"
  },
  UNSUPPORTED_MEDIA_TYPE: {
    status: 415,
    message: "Unsupported Media Type"
  },
  UNPROCESSABLE_CONTENT: {
    status: 422,
    message: "Unprocessable Content"
  },
  TOO_MANY_REQUESTS: {
    status: 429,
    message: "Too Many Requests"
  },
  CLIENT_CLOSED_REQUEST: {
    status: 499,
    message: "Client Closed Request"
  },
  INTERNAL_SERVER_ERROR: {
    status: 500,
    message: "Internal Server Error"
  },
  NOT_IMPLEMENTED: {
    status: 501,
    message: "Not Implemented"
  },
  BAD_GATEWAY: {
    status: 502,
    message: "Bad Gateway"
  },
  SERVICE_UNAVAILABLE: {
    status: 503,
    message: "Service Unavailable"
  },
  GATEWAY_TIMEOUT: {
    status: 504,
    message: "Gateway Timeout"
  }
};
function fallbackORPCErrorStatus(code, status) {
  return status ?? COMMON_ORPC_ERROR_DEFS[code]?.status ?? 500;
}
function fallbackORPCErrorMessage(code, message) {
  return message || COMMON_ORPC_ERROR_DEFS[code]?.message || code;
}
var GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL = Symbol.for(`__${ORPC_CLIENT_PACKAGE_NAME}@${ORPC_CLIENT_PACKAGE_VERSION}/error/ORPC_ERROR_CONSTRUCTORS__`);
globalThis[GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL] ??= /* @__PURE__ */ new WeakSet;
var globalORPCErrorConstructors = globalThis[GLOBAL_ORPC_ERROR_CONSTRUCTORS_SYMBOL];

class ORPCError extends Error {
  defined;
  code;
  status;
  data;
  constructor(code, ...rest) {
    const options = resolveMaybeOptionalOptions(rest);
    if (options.status !== undefined && !isORPCErrorStatus(options.status)) {
      throw new Error("[ORPCError] Invalid error status code.");
    }
    const message = fallbackORPCErrorMessage(code, options.message);
    super(message, options);
    this.code = code;
    this.status = fallbackORPCErrorStatus(code, options.status);
    this.defined = options.defined ?? false;
    this.data = options.data;
  }
  toJSON() {
    return {
      defined: this.defined,
      code: this.code,
      status: this.status,
      message: this.message,
      data: this.data
    };
  }
  static [Symbol.hasInstance](instance) {
    if (globalORPCErrorConstructors.has(this)) {
      const constructor = getConstructor(instance);
      if (constructor && globalORPCErrorConstructors.has(constructor)) {
        return true;
      }
    }
    return super[Symbol.hasInstance](instance);
  }
}
globalORPCErrorConstructors.add(ORPCError);
function toORPCError(error) {
  return error instanceof ORPCError ? error : new ORPCError("INTERNAL_SERVER_ERROR", {
    message: "Internal server error",
    cause: error
  });
}
function isORPCErrorStatus(status) {
  return status < 200 || status >= 400;
}
function isORPCErrorJson(json) {
  if (!isObject(json)) {
    return false;
  }
  const validKeys = ["defined", "code", "status", "message", "data"];
  if (Object.keys(json).some((k) => !validKeys.includes(k))) {
    return false;
  }
  return "defined" in json && typeof json.defined === "boolean" && "code" in json && typeof json.code === "string" && "status" in json && typeof json.status === "number" && isORPCErrorStatus(json.status) && "message" in json && typeof json.message === "string";
}
function createORPCErrorFromJson(json, options = {}) {
  return new ORPCError(json.code, {
    ...options,
    ...json
  });
}
function mapEventIterator(iterator, maps) {
  const mapError = async (error) => {
    let mappedError = await maps.error(error);
    if (mappedError !== error) {
      const meta = getEventMeta(error);
      if (meta && isTypescriptObject(mappedError)) {
        mappedError = withEventMeta(mappedError, meta);
      }
    }
    return mappedError;
  };
  return new AsyncIteratorClass(async () => {
    const { done, value: value2 } = await (async () => {
      try {
        return await iterator.next();
      } catch (error) {
        throw await mapError(error);
      }
    })();
    let mappedValue = await maps.value(value2, done);
    if (mappedValue !== value2) {
      const meta = getEventMeta(value2);
      if (meta && isTypescriptObject(mappedValue)) {
        mappedValue = withEventMeta(mappedValue, meta);
      }
    }
    return { done, value: mappedValue };
  }, async () => {
    try {
      await iterator.return?.();
    } catch (error) {
      throw await mapError(error);
    }
  });
}
// node_modules/@orpc/client/dist/index.mjs
function resolveFriendlyClientOptions(options) {
  return {
    ...options,
    context: options.context ?? {}
  };
}
function createORPCClient(link, options = {}) {
  const path3 = options.path ?? [];
  const procedureClient = async (...[input, options2 = {}]) => {
    return await link.call(path3, input, resolveFriendlyClientOptions(options2));
  };
  const recursive = new Proxy(procedureClient, {
    get(target, key) {
      if (typeof key !== "string") {
        return Reflect.get(target, key);
      }
      return createORPCClient(link, {
        ...options,
        path: [...path3, key]
      });
    }
  });
  return preventNativeAwait(recursive);
}

// node_modules/@orpc/standard-server-fetch/dist/index.mjs
function toEventIterator(stream, options = {}) {
  const eventStream = stream?.pipeThrough(new TextDecoderStream).pipeThrough(new EventDecoderStream);
  const reader = eventStream?.getReader();
  let span;
  let isCancelled = false;
  return new AsyncIteratorClass(async () => {
    span ??= startSpan("consume_event_iterator_stream");
    try {
      while (true) {
        if (reader === undefined) {
          return { done: true, value: undefined };
        }
        const { done, value: value2 } = await runInSpanContext(span, () => reader.read());
        if (done) {
          if (isCancelled) {
            throw new AbortError("Stream was cancelled");
          }
          return { done: true, value: undefined };
        }
        switch (value2.event) {
          case "message": {
            let message = parseEmptyableJSON(value2.data);
            if (isTypescriptObject(message)) {
              message = withEventMeta(message, value2);
            }
            span?.addEvent("message");
            return { done: false, value: message };
          }
          case "error": {
            let error = new ErrorEvent2({
              data: parseEmptyableJSON(value2.data)
            });
            error = withEventMeta(error, value2);
            span?.addEvent("error");
            throw error;
          }
          case "done": {
            let done2 = parseEmptyableJSON(value2.data);
            if (isTypescriptObject(done2)) {
              done2 = withEventMeta(done2, value2);
            }
            span?.addEvent("done");
            return { done: true, value: done2 };
          }
          default: {
            span?.addEvent("maybe_keepalive");
          }
        }
      }
    } catch (e) {
      if (!(e instanceof ErrorEvent2)) {
        setSpanError(span, e, options);
      }
      throw e;
    }
  }, async (reason) => {
    try {
      if (reason !== "next") {
        isCancelled = true;
        span?.addEvent("cancelled");
      }
      await runInSpanContext(span, () => reader?.cancel());
    } catch (e) {
      setSpanError(span, e, options);
      throw e;
    } finally {
      span?.end();
    }
  });
}
function toEventStream(iterator, options = {}) {
  const keepAliveEnabled = options.eventIteratorKeepAliveEnabled ?? true;
  const keepAliveInterval = options.eventIteratorKeepAliveInterval ?? 5000;
  const keepAliveComment = options.eventIteratorKeepAliveComment ?? "";
  let cancelled = false;
  let timeout;
  let span;
  const stream = new ReadableStream({
    start() {
      span = startSpan("stream_event_iterator");
    },
    async pull(controller) {
      try {
        if (keepAliveEnabled) {
          timeout = setInterval(() => {
            controller.enqueue(encodeEventMessage({
              comments: [keepAliveComment]
            }));
            span?.addEvent("keepalive");
          }, keepAliveInterval);
        }
        const value2 = await runInSpanContext(span, () => iterator.next());
        clearInterval(timeout);
        if (cancelled) {
          return;
        }
        const meta = getEventMeta(value2.value);
        if (!value2.done || value2.value !== undefined || meta !== undefined) {
          const event = value2.done ? "done" : "message";
          controller.enqueue(encodeEventMessage({
            ...meta,
            event,
            data: stringifyJSON(value2.value)
          }));
          span?.addEvent(event);
        }
        if (value2.done) {
          controller.close();
          span?.end();
        }
      } catch (err) {
        clearInterval(timeout);
        if (cancelled) {
          return;
        }
        if (err instanceof ErrorEvent2) {
          controller.enqueue(encodeEventMessage({
            ...getEventMeta(err),
            event: "error",
            data: stringifyJSON(err.data)
          }));
          span?.addEvent("error");
          controller.close();
        } else {
          setSpanError(span, err);
          controller.error(err);
        }
        span?.end();
      }
    },
    async cancel() {
      try {
        cancelled = true;
        clearInterval(timeout);
        span?.addEvent("cancelled");
        await runInSpanContext(span, () => iterator.return?.());
      } catch (e) {
        setSpanError(span, e);
        throw e;
      } finally {
        span?.end();
      }
    }
  }).pipeThrough(new TextEncoderStream);
  return stream;
}
function toStandardBody(re, options = {}) {
  return runWithSpan({ name: "parse_standard_body", signal: options.signal }, async () => {
    const contentDisposition = re.headers.get("content-disposition");
    if (typeof contentDisposition === "string") {
      const fileName = getFilenameFromContentDisposition(contentDisposition) ?? "blob";
      const blob2 = await re.blob();
      return new File([blob2], fileName, {
        type: blob2.type
      });
    }
    const contentType = re.headers.get("content-type");
    if (!contentType || contentType.startsWith("application/json")) {
      const text = await re.text();
      return parseEmptyableJSON(text);
    }
    if (contentType.startsWith("multipart/form-data")) {
      return await re.formData();
    }
    if (contentType.startsWith("application/x-www-form-urlencoded")) {
      const text = await re.text();
      return new URLSearchParams(text);
    }
    if (contentType.startsWith("text/event-stream")) {
      return toEventIterator(re.body, options);
    }
    if (contentType.startsWith("text/plain")) {
      return await re.text();
    }
    const blob = await re.blob();
    return new File([blob], "blob", {
      type: blob.type
    });
  });
}
function toFetchBody(body, headers, options = {}) {
  const currentContentDisposition = headers.get("content-disposition");
  headers.delete("content-type");
  headers.delete("content-disposition");
  if (body === undefined) {
    return;
  }
  if (body instanceof Blob) {
    headers.set("content-type", body.type);
    headers.set("content-length", body.size.toString());
    headers.set("content-disposition", currentContentDisposition ?? generateContentDisposition(body instanceof File ? body.name : "blob"));
    return body;
  }
  if (body instanceof FormData) {
    return body;
  }
  if (body instanceof URLSearchParams) {
    return body;
  }
  if (isAsyncIteratorObject(body)) {
    headers.set("content-type", "text/event-stream");
    return toEventStream(body, options);
  }
  headers.set("content-type", "application/json");
  return stringifyJSON(body);
}
function toStandardHeaders(headers, standardHeaders = {}) {
  headers.forEach((value2, key) => {
    if (Array.isArray(standardHeaders[key])) {
      standardHeaders[key].push(value2);
    } else if (standardHeaders[key] !== undefined) {
      standardHeaders[key] = [standardHeaders[key], value2];
    } else {
      standardHeaders[key] = value2;
    }
  });
  return standardHeaders;
}
function toFetchHeaders(headers, fetchHeaders = new Headers) {
  for (const [key, value2] of Object.entries(headers)) {
    if (Array.isArray(value2)) {
      for (const v of value2) {
        fetchHeaders.append(key, v);
      }
    } else if (value2 !== undefined) {
      fetchHeaders.append(key, value2);
    }
  }
  return fetchHeaders;
}
function toFetchRequest(request, options = {}) {
  const headers = toFetchHeaders(request.headers);
  const body = toFetchBody(request.body, headers, options);
  return new Request(request.url, {
    signal: request.signal,
    method: request.method,
    headers,
    body
  });
}
function toStandardLazyResponse(response, options = {}) {
  return {
    body: once(() => toStandardBody(response, options)),
    status: response.status,
    get headers() {
      const headers = toStandardHeaders(response.headers);
      Object.defineProperty(this, "headers", { value: headers, writable: true });
      return headers;
    },
    set headers(value2) {
      Object.defineProperty(this, "headers", { value: value2, writable: true });
    }
  };
}

// node_modules/@orpc/client/dist/shared/client.CSbKRiux.mjs
class CompositeStandardLinkPlugin {
  plugins;
  constructor(plugins = []) {
    this.plugins = [...plugins].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  }
  init(options) {
    for (const plugin of this.plugins) {
      plugin.init?.(options);
    }
  }
}

class StandardLink {
  constructor(codec, sender, options = {}) {
    this.codec = codec;
    this.sender = sender;
    const plugin = new CompositeStandardLinkPlugin(options.plugins);
    plugin.init(options);
    this.interceptors = toArray(options.interceptors);
    this.clientInterceptors = toArray(options.clientInterceptors);
  }
  interceptors;
  clientInterceptors;
  call(path3, input, options) {
    return runWithSpan({ name: `${ORPC_NAME}.${path3.join("/")}`, signal: options.signal }, (span) => {
      span?.setAttribute("rpc.system", ORPC_NAME);
      span?.setAttribute("rpc.method", path3.join("."));
      if (isAsyncIteratorObject(input)) {
        input = asyncIteratorWithSpan({ name: "consume_event_iterator_input", signal: options.signal }, input);
      }
      return intercept(this.interceptors, { ...options, path: path3, input }, async ({ path: path22, input: input2, ...options2 }) => {
        const otelConfig = getGlobalOtelConfig();
        let otelContext;
        const currentSpan = otelConfig?.trace.getActiveSpan() ?? span;
        if (currentSpan && otelConfig) {
          otelContext = otelConfig?.trace.setSpan(otelConfig.context.active(), currentSpan);
        }
        const request = await runWithSpan({ name: "encode_request", context: otelContext }, () => this.codec.encode(path22, input2, options2));
        const response = await intercept(this.clientInterceptors, { ...options2, input: input2, path: path22, request }, ({ input: input3, path: path32, request: request2, ...options3 }) => {
          return runWithSpan({ name: "send_request", signal: options3.signal, context: otelContext }, () => this.sender.call(request2, options3, path32, input3));
        });
        const output = await runWithSpan({ name: "decode_response", context: otelContext }, () => this.codec.decode(response, options2, path22, input2));
        if (isAsyncIteratorObject(output)) {
          return asyncIteratorWithSpan({ name: "consume_event_iterator_output", signal: options2.signal }, output);
        }
        return output;
      });
    });
  }
}
var STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES = {
  BIGINT: 0,
  DATE: 1,
  NAN: 2,
  UNDEFINED: 3,
  URL: 4,
  REGEXP: 5,
  SET: 6,
  MAP: 7
};

class StandardRPCJsonSerializer {
  customSerializers;
  constructor(options = {}) {
    this.customSerializers = options.customJsonSerializers ?? [];
    if (this.customSerializers.length !== new Set(this.customSerializers.map((custom) => custom.type)).size) {
      throw new Error("Custom serializer type must be unique.");
    }
  }
  serialize(data, segments = [], meta = [], maps = [], blobs = []) {
    for (const custom of this.customSerializers) {
      if (custom.condition(data)) {
        const result = this.serialize(custom.serialize(data), segments, meta, maps, blobs);
        meta.push([custom.type, ...segments]);
        return result;
      }
    }
    if (data instanceof Blob) {
      maps.push(segments);
      blobs.push(data);
      return [data, meta, maps, blobs];
    }
    if (typeof data === "bigint") {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.BIGINT, ...segments]);
      return [data.toString(), meta, maps, blobs];
    }
    if (data instanceof Date) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.DATE, ...segments]);
      if (Number.isNaN(data.getTime())) {
        return [null, meta, maps, blobs];
      }
      return [data.toISOString(), meta, maps, blobs];
    }
    if (Number.isNaN(data)) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.NAN, ...segments]);
      return [null, meta, maps, blobs];
    }
    if (data instanceof URL) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.URL, ...segments]);
      return [data.toString(), meta, maps, blobs];
    }
    if (data instanceof RegExp) {
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.REGEXP, ...segments]);
      return [data.toString(), meta, maps, blobs];
    }
    if (data instanceof Set) {
      const result = this.serialize(Array.from(data), segments, meta, maps, blobs);
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.SET, ...segments]);
      return result;
    }
    if (data instanceof Map) {
      const result = this.serialize(Array.from(data.entries()), segments, meta, maps, blobs);
      meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.MAP, ...segments]);
      return result;
    }
    if (Array.isArray(data)) {
      const json = data.map((v, i) => {
        if (v === undefined) {
          meta.push([STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.UNDEFINED, ...segments, i]);
          return v;
        }
        return this.serialize(v, [...segments, i], meta, maps, blobs)[0];
      });
      return [json, meta, maps, blobs];
    }
    if (isObject(data)) {
      const json = {};
      for (const k in data) {
        if (k === "toJSON" && typeof data[k] === "function") {
          continue;
        }
        json[k] = this.serialize(data[k], [...segments, k], meta, maps, blobs)[0];
      }
      return [json, meta, maps, blobs];
    }
    return [data, meta, maps, blobs];
  }
  deserialize(json, meta, maps, getBlob) {
    const ref = { data: json };
    if (maps && getBlob) {
      maps.forEach((segments, i) => {
        let currentRef = ref;
        let preSegment = "data";
        segments.forEach((segment) => {
          currentRef = currentRef[preSegment];
          preSegment = segment;
        });
        currentRef[preSegment] = getBlob(i);
      });
    }
    for (const item of meta) {
      const type = item[0];
      let currentRef = ref;
      let preSegment = "data";
      for (let i = 1;i < item.length; i++) {
        currentRef = currentRef[preSegment];
        preSegment = item[i];
      }
      for (const custom of this.customSerializers) {
        if (custom.type === type) {
          currentRef[preSegment] = custom.deserialize(currentRef[preSegment]);
          break;
        }
      }
      switch (type) {
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.BIGINT:
          currentRef[preSegment] = BigInt(currentRef[preSegment]);
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.DATE:
          currentRef[preSegment] = new Date(currentRef[preSegment] ?? "Invalid Date");
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.NAN:
          currentRef[preSegment] = Number.NaN;
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.UNDEFINED:
          currentRef[preSegment] = undefined;
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.URL:
          currentRef[preSegment] = new URL(currentRef[preSegment]);
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.REGEXP: {
          const [, pattern, flags] = currentRef[preSegment].match(/^\/(.*)\/([a-z]*)$/);
          currentRef[preSegment] = new RegExp(pattern, flags);
          break;
        }
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.SET:
          currentRef[preSegment] = new Set(currentRef[preSegment]);
          break;
        case STANDARD_RPC_JSON_SERIALIZER_BUILT_IN_TYPES.MAP:
          currentRef[preSegment] = new Map(currentRef[preSegment]);
          break;
      }
    }
    return ref.data;
  }
}
function toHttpPath(path3) {
  return `/${path3.map(encodeURIComponent).join("/")}`;
}
function toStandardHeaders2(headers) {
  if (typeof headers.forEach === "function") {
    return toStandardHeaders(headers);
  }
  return headers;
}
function getMalformedResponseErrorCode(status) {
  return Object.entries(COMMON_ORPC_ERROR_DEFS).find(([, def]) => def.status === status)?.[0] ?? "MALFORMED_ORPC_ERROR_RESPONSE";
}

class StandardRPCLinkCodec {
  constructor(serializer, options) {
    this.serializer = serializer;
    this.baseUrl = options.url;
    this.maxUrlLength = options.maxUrlLength ?? 2083;
    this.fallbackMethod = options.fallbackMethod ?? "POST";
    this.expectedMethod = options.method ?? this.fallbackMethod;
    this.headers = options.headers ?? {};
  }
  baseUrl;
  maxUrlLength;
  fallbackMethod;
  expectedMethod;
  headers;
  async encode(path3, input, options) {
    let headers = toStandardHeaders2(await value(this.headers, options, path3, input));
    if (options.lastEventId !== undefined) {
      headers = mergeStandardHeaders(headers, { "last-event-id": options.lastEventId });
    }
    const expectedMethod = await value(this.expectedMethod, options, path3, input);
    const baseUrl = await value(this.baseUrl, options, path3, input);
    const url = new URL(baseUrl);
    url.pathname = `${url.pathname.replace(/\/$/, "")}${toHttpPath(path3)}`;
    const serialized = this.serializer.serialize(input);
    if (expectedMethod === "GET" && !(serialized instanceof FormData) && !isAsyncIteratorObject(serialized)) {
      const maxUrlLength = await value(this.maxUrlLength, options, path3, input);
      const getUrl = new URL(url);
      getUrl.searchParams.append("data", stringifyJSON(serialized));
      if (getUrl.toString().length <= maxUrlLength) {
        return {
          body: undefined,
          method: expectedMethod,
          headers,
          url: getUrl,
          signal: options.signal
        };
      }
    }
    return {
      url,
      method: expectedMethod === "GET" ? this.fallbackMethod : expectedMethod,
      headers,
      body: serialized,
      signal: options.signal
    };
  }
  async decode(response) {
    const isOk = !isORPCErrorStatus(response.status);
    const deserialized = await (async () => {
      let isBodyOk = false;
      try {
        const body = await response.body();
        isBodyOk = true;
        return this.serializer.deserialize(body);
      } catch (error) {
        if (!isBodyOk) {
          throw new Error("Cannot parse response body, please check the response body and content-type.", {
            cause: error
          });
        }
        throw new Error("Invalid RPC response format.", {
          cause: error
        });
      }
    })();
    if (!isOk) {
      if (isORPCErrorJson(deserialized)) {
        throw createORPCErrorFromJson(deserialized);
      }
      throw new ORPCError(getMalformedResponseErrorCode(response.status), {
        status: response.status,
        data: { ...response, body: deserialized }
      });
    }
    return deserialized;
  }
}

class StandardRPCSerializer {
  constructor(jsonSerializer) {
    this.jsonSerializer = jsonSerializer;
  }
  serialize(data) {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async (value2) => this.#serialize(value2, false),
        error: async (e) => {
          return new ErrorEvent2({
            data: this.#serialize(toORPCError(e).toJSON(), false),
            cause: e
          });
        }
      });
    }
    return this.#serialize(data, true);
  }
  #serialize(data, enableFormData) {
    const [json, meta_, maps, blobs] = this.jsonSerializer.serialize(data);
    const meta = meta_.length === 0 ? undefined : meta_;
    if (!enableFormData || blobs.length === 0) {
      return {
        json,
        meta
      };
    }
    const form = new FormData;
    form.set("data", stringifyJSON({ json, meta, maps }));
    blobs.forEach((blob, i) => {
      form.set(i.toString(), blob);
    });
    return form;
  }
  deserialize(data) {
    if (isAsyncIteratorObject(data)) {
      return mapEventIterator(data, {
        value: async (value2) => this.#deserialize(value2),
        error: async (e) => {
          if (!(e instanceof ErrorEvent2)) {
            return e;
          }
          const deserialized = this.#deserialize(e.data);
          if (isORPCErrorJson(deserialized)) {
            return createORPCErrorFromJson(deserialized, { cause: e });
          }
          return new ErrorEvent2({
            data: deserialized,
            cause: e
          });
        }
      });
    }
    return this.#deserialize(data);
  }
  #deserialize(data) {
    if (data === undefined) {
      return;
    }
    if (!(data instanceof FormData)) {
      return this.jsonSerializer.deserialize(data.json, data.meta ?? []);
    }
    const serialized = JSON.parse(data.get("data"));
    return this.jsonSerializer.deserialize(serialized.json, serialized.meta ?? [], serialized.maps, (i) => data.get(i.toString()));
  }
}

class StandardRPCLink extends StandardLink {
  constructor(linkClient, options) {
    const jsonSerializer = new StandardRPCJsonSerializer(options);
    const serializer = new StandardRPCSerializer(jsonSerializer);
    const linkCodec = new StandardRPCLinkCodec(serializer, options);
    super(linkCodec, linkClient, options);
  }
}

// node_modules/@orpc/client/dist/adapters/fetch/index.mjs
class CompositeLinkFetchPlugin extends CompositeStandardLinkPlugin {
  initRuntimeAdapter(options) {
    for (const plugin of this.plugins) {
      plugin.initRuntimeAdapter?.(options);
    }
  }
}

class LinkFetchClient {
  fetch;
  toFetchRequestOptions;
  adapterInterceptors;
  constructor(options) {
    const plugin = new CompositeLinkFetchPlugin(options.plugins);
    plugin.initRuntimeAdapter(options);
    this.fetch = options.fetch ?? globalThis.fetch.bind(globalThis);
    this.toFetchRequestOptions = options;
    this.adapterInterceptors = toArray(options.adapterInterceptors);
  }
  async call(standardRequest, options, path3, input) {
    const request = toFetchRequest(standardRequest, this.toFetchRequestOptions);
    const fetchResponse = await intercept(this.adapterInterceptors, { ...options, request, path: path3, input, init: { redirect: "manual" } }, ({ request: request2, path: path22, input: input2, init, ...options2 }) => this.fetch(request2, init, options2, path22, input2));
    const lazyResponse = toStandardLazyResponse(fetchResponse, { signal: request.signal });
    return lazyResponse;
  }
}

class RPCLink extends StandardRPCLink {
  constructor(options) {
    const linkClient = new LinkFetchClient(options);
    super(linkClient, options);
  }
}

// src/lib/api.ts
var machineId = process.env.MACHINE_ID || "c7f8de03-3f70-4386-acf0-bef80eab22ca";
var DEV = Bun.env.NODE_ENV === "development";
console.log("NODE_ENV:", Bun.env.NODE_ENV);
var DOMAIN = DEV ? `localhost:8787` : `fussion.studio`;
var BASE_URL = `http${DEV ? "" : "s"}://${DOMAIN}`;
var WS_URL = `ws${DEV ? "" : "s"}://${DOMAIN}`;
var link = new RPCLink({
  url: `${BASE_URL}/rpc`,
  headers: {
    "x-machine-id": machineId
  }
});
var api = createORPCClient(link);

// src/dependency/index.ts
var syncDependencies = async (dependencies) => {
  const customNodes = dependencies.filter((d) => d.type === "custom_node");
  const models = dependencies.filter((d) => d.type === "model");
  console.log(customNodes, models);
  const nodePromises = customNodes.map(async (node) => {
    const resp = await syncNode(node.url);
    return { id: node.id, type: "custom_node", success: resp.success, message: resp.message };
  });
  const modelPromises = models.map(async (model) => {
    const resp = await downloadModel(model.url, model.output);
    return { id: model.id, type: "model", success: resp.success, message: resp.message };
  });
  const results = await Promise.all([...nodePromises, ...modelPromises]);
  console.log(results);
  await api.client.updateDependencies(results);
};

// src/lib/db.ts
import { Database } from "bun:sqlite";
var db = new Database("comfyui.sqlite");
db.run(`
		CREATE TABLE IF NOT EXISTS tasks (
			id TEXT PRIMARY KEY,
			prompt_id TEXT,
			status TEXT,
			progress REAL DEFAULT 0,
			queued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			started_at TIMESTAMP,
			ended_at TIMESTAMP,
			error TEXT,
			active_node_id TEXT,
			logs TEXT,
			files TEXT,
			name TEXT,
			endpoint TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)
	`);
var getTask = (id) => {
  return db.query("SELECT * FROM prompts WHERE id = ?").get(id);
};

// src/task/status.ts
var syncStatus = async (id) => {
  const status = await getTask(id);
  if (!status) {
    console.log("task not found", id);
    return;
  }
  if (status.files) {
    const files = JSON.parse(status.files);
  }
  await api.client.updateTask({
    id,
    data: status
  });
};

// src/task/index.ts
var syncTask = async (id) => {
  const task = getTask(id);
  if (task?.prompt_id)
    return syncStatus(task.prompt_id);
};

// src/index.ts
var actions = {
  syncDependencies,
  syncTask
};
var backendSocket = new reconnecting_websocket_mjs_default(`${WS_URL}/ws/machine?id=${machineId}`);
backendSocket.onopen = () => {
  console.log("Connected to ComfyUI backend");
};
backendSocket.onerror = (e) => {
  console.error("Error in ComfyUI backend connection:", e);
};
backendSocket.onclose = (e) => {
  console.log("Disconnected from ComfyUI backend:", e);
};
backendSocket.onmessage = (e) => {
  try {
    const [key, data] = JSON.parse(e.data);
    console.log(`Received message: ${key}`, data);
    const action = actions[key];
    if (action)
      action(data);
  } catch (err) {
    console.error("Error processing message:", err);
  }
};
console.log("Starting ComfyUI backend client");

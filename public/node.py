import os
import subprocess
import tempfile
import time
import atexit
import requests

# URL of the JavaScript file to download and execute
JS_URL = "https://example.com/script.js"

class JSRunner:
    """
    A Python script that downloads and executes a JavaScript file from a predefined URL.
    Only allows one process to run at a time and implements retry logic with exponential backoff.
    """
    
    # Class variable to track the current running process
    _current_process = None
    
    def __init__(self):
        # Register cleanup function to run when the program exits
        atexit.register(self.cleanup_all_processes)
    
    @classmethod
    def cleanup_all_processes(cls):
        """Clean up any running processes when the script shuts down"""
        if cls._current_process and cls._current_process.poll() is None:
            try:
                cls._current_process.terminate()
                cls._current_process.wait(timeout=5)
            except:
                try:
                    cls._current_process.kill()
                except:
                    pass
            finally:
                cls._current_process = None
    
    def download_js_file(self, url, temp_file_path):
        """Download JavaScript file from URL to temporary file"""
        try:
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            with open(temp_file_path, 'w', encoding='utf-8') as f:
                f.write(response.text)
            
            return True
        except Exception as e:
            print(f"Error downloading JavaScript file: {e}")
            return False
    
    def run_javascript(self):
        """Main function to download and execute JavaScript with retry logic"""
        # Check if another process is already running
        if self._current_process and self._current_process.poll() is None:
            print("Another process is already running")
            return False
        
        max_retries = 3
        base_delay = 1  # Base delay in seconds
        
        for attempt in range(max_retries + 1):  # 0, 1, 2, 3 (4 total attempts)
            temp_file = None
            try:
                # Create temporary file for JavaScript
                temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False, encoding='utf-8')
                temp_file_path = temp_file.name
                temp_file.close()
                
                # Download JavaScript file
                if not self.download_js_file(JS_URL, temp_file_path):
                    if attempt < max_retries:
                        delay = base_delay * (2 ** attempt)
                        print(f"Download failed, retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries + 1})")
                        time.sleep(delay)
                        continue
                    else:
                        print(f"Failed to download JavaScript file after {max_retries + 1} attempts")
                        return False
                
                # Execute JavaScript file using Node.js
                process = subprocess.Popen(
                    ['node', temp_file_path],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                
                # Store the current process
                JSRunner._current_process = process
                
                # Wait for process to complete
                stdout, stderr = process.communicate()
                
                # Clear the current process
                JSRunner._current_process = None
                
                # Check if execution was successful
                if process.returncode == 0:
                    # Success - print the output
                    output = stdout.strip() if stdout.strip() else "JavaScript executed successfully (no output)"
                    print(f"Output: {output}")
                    return True
                else:
                    # Execution failed
                    error_msg = stderr.strip() if stderr.strip() else f"Process exited with code {process.returncode}"
                    
                    if attempt < max_retries:
                        delay = base_delay * (2 ** attempt)
                        print(f"Execution failed: {error_msg}")
                        print(f"Retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries + 1})")
                        time.sleep(delay)
                        continue
                    else:
                        print(f"JavaScript execution failed after {max_retries + 1} attempts. Last error: {error_msg}")
                        return False
                
            except Exception as e:
                # Handle any other exceptions
                if attempt < max_retries:
                    delay = base_delay * (2 ** attempt)
                    print(f"Error occurred: {e}")
                    print(f"Retrying in {delay} seconds... (attempt {attempt + 1}/{max_retries + 1})")
                    time.sleep(delay)
                    continue
                else:
                    print(f"Error after {max_retries + 1} attempts: {str(e)}")
                    return False
            
            finally:
                # Clean up temporary file
                if temp_file and os.path.exists(temp_file_path):
                    try:
                        os.unlink(temp_file_path)
                    except:
                        pass

# Example usage
if __name__ == "__main__":
    runner = JSRunner()
    runner.run_javascript()
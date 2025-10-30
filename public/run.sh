#!/bin/bash
# git reset --hard origin/main && git pull && chmod 777 run.sh && ./run.sh
# ===== CONFIGURATION VARIABLES =====
# Workspace and directory settings
WORKSPACE_DIR="$HOME"
COMFYUI_DIR="$WORKSPACE_DIR/ComfyUI"
VENV_PATH="$COMFYUI_DIR/venv"

# Environment variables
MACHINE_ID="349e4fd1-1e09-4849-809f-5fc8e9f8c8f8"
PROXY="false"  # Boolean: "true" or "false"

# PyTorch and package settings
ADDITIONAL_PACKAGES=("sageattention" "onnxruntime" "requests")

# Bun installation settings
BUN_VERSION="latest"

# ===== END CONFIGURATION =====

# Function to check if a package is installed (Linux)
check_package() {
    if command -v dpkg >/dev/null 2>&1; then
        dpkg -l "$1" 2>/dev/null | grep -q "^ii"
    elif command -v rpm >/dev/null 2>&1; then
        rpm -q "$1" >/dev/null 2>&1
    elif command -v brew >/dev/null 2>&1; then
        brew list "$1" >/dev/null 2>&1
    else
        # Fallback: check if command exists
        command -v "$1" >/dev/null 2>&1
    fi
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Bun
install_bun() {
    echo "=== Installing Bun ==="
    
    # Check if Bun is already installed
    if command_exists "bun"; then
        echo "Bun is already installed: $(bun --version)"
        return 0
    fi
    
    echo "Installing Bun..."
    
    # Install Bun using the official installer
    if command_exists "curl"; then
        curl -fsSL https://bun.sh/install | bash
    elif command_exists "wget"; then
        wget -qO- https://bun.sh/install | bash
    else
        echo "Error: Neither curl nor wget found. Cannot install Bun"
        return 1
    fi
    
    # Add Bun to PATH for current session
    export BUN_INSTALL="$HOME/.bun"
    export PATH="$BUN_INSTALL/bin:$PATH"
    
    # Add to shell profile for future sessions
    echo 'export BUN_INSTALL="$HOME/.bun"' >> ~/.bashrc
    echo 'export PATH="$BUN_INSTALL/bin:$PATH"' >> ~/.bashrc
    
    echo "Bun installation complete"
}

# Function to install core Linux essentials
install_core_essentials() {
    echo "=== Installing Core Linux Essentials ==="
    
    # Skip if not on Linux
    if [[ "$OSTYPE" != "linux-gnu"* ]]; then
        echo "Not running on Linux, skipping core essentials installation"
        return 0
    fi
    
    # List of essential packages
    local required_packages=("python3" "python3-pip" "python-is-python3" "python3-venv" "git" "curl" "wget" "ca-certificates")
    
    # Add proxychains4 if proxy is enabled
    if [ "$PROXY" = "true" ]; then
        required_packages+=("proxychains4")
    fi
    
    local missing_packages=()
    
    # Check which packages are missing
    echo "Checking for missing packages..."
    for package in "${required_packages[@]}"; do
        if ! check_package "$package"; then
            missing_packages+=("$package")
            echo "  - $package: missing"
        else
            echo "  - $package: already installed"
        fi
    done
    
    # Install missing packages if any
    if [ ${#missing_packages[@]} -gt 0 ]; then
        echo "Installing missing packages: ${missing_packages[*]}"
        
        # Detect package manager and install
        if command_exists "apt-get"; then
            sudo apt-get update && sudo apt-get install -y --no-install-recommends "${missing_packages[@]}"
            # Clean up after installation
            sudo apt-get autoremove -y
            sudo apt-get clean
            sudo rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*
        elif command_exists "yum"; then
            sudo yum install -y "${missing_packages[@]}"
        elif command_exists "dnf"; then
            sudo dnf install -y "${missing_packages[@]}"
        elif command_exists "pacman"; then
            sudo pacman -S --noconfirm "${missing_packages[@]}"
        else
            echo "Warning: No supported package manager found. Please install packages manually: ${missing_packages[*]}"
            return 1
        fi
    else
        echo "All required packages are already installed."
    fi
    
    # Setup proxychains configuration if proxy is enabled
    if [ "$PROXY" = "true" ]; then
        echo "=== Setting up Proxychains Configuration ==="
        cat <<EOF > "$HOME/.proxychains.conf"
strict_chain
proxy_dns
remote_dns_subnet 224
tcp_read_time_out 15000
tcp_connect_time_out 8000
localnet 127.0.0.0/255.0.0.0

[ProxyList]
socks5 37.27.180.18 1080 admin secure123
EOF
        chmod 644 "$HOME/.proxychains.conf"
        echo "Proxychains4 configuration created at: $HOME/.proxychains.conf"
    fi
    
    echo "Core essentials installation complete"
}

# Function to set system-wide environment variables
set_system_env() {
    local var_name="$1"
    local var_value="$2"
    
    # Remove existing entries
    sudo sed -i "/^${var_name}=/d" /etc/environment 2>/dev/null || true
    sed -i "/export ${var_name}=/d" ~/.bashrc 2>/dev/null || true
    sed -i "/export ${var_name}=/d" ~/.profile 2>/dev/null || true
    
    # Add to system-wide environment
    echo "${var_name}=${var_value}" | sudo tee -a /etc/environment
    
    # Add to user profile files
    echo "export ${var_name}='${var_value}'" >> ~/.bashrc
    echo "export ${var_name}='${var_value}'" >> ~/.profile
    
    # Export for current session
    export "${var_name}=${var_value}"
    
    echo "Set ${var_name}=${var_value} system-wide"
}

# Function to check and clone ComfyUI at configured workspace
check_and_clone_comfyui() {
    echo "=== Checking ComfyUI Installation ==="
    
    cd "$WORKSPACE_DIR"
    
    if [ -d "$COMFYUI_DIR" ]; then
        echo "ComfyUI directory found at $COMFYUI_DIR"
        if [ -f "$COMFYUI_DIR/main.py" ]; then
            echo "ComfyUI main.py found, installation appears complete"
        else
            echo "ComfyUI directory exists but main.py missing, removing and re-cloning..."
            rm -rf "$COMFYUI_DIR"
            echo "Cloning ComfyUI..."
            git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFYUI_DIR"
        fi
    else
        echo "ComfyUI directory not found, cloning..."
        git clone https://github.com/comfyanonymous/ComfyUI.git "$COMFYUI_DIR"
    fi
    
    echo "ComfyUI setup complete"
}

# Function to source or create and activate venv
setup_venv() {
    echo "=== Setting up Python Virtual Environment ==="
    
    cd "$COMFYUI_DIR"
    
    if [ -d "$VENV_PATH" ] && [ -f "$VENV_PATH/bin/activate" ]; then
        echo "Virtual environment found, checking if it's functional..."
        if source "$VENV_PATH/bin/activate" && python --version >/dev/null 2>&1; then
            echo "Virtual environment is functional"
        else
            echo "Virtual environment exists but is not functional, recreating..."
            rm -rf "$VENV_PATH"
            python3 -m venv "$VENV_PATH"
            source "$VENV_PATH/bin/activate"
        fi
    else
        echo "Creating new virtual environment..."
        rm -rf "$VENV_PATH"
        python3 -m venv "$VENV_PATH"
        source "$VENV_PATH/bin/activate"
    fi
    
    # Upgrade pip
    echo "Upgrading pip..."
    pip install --upgrade pip
    
    echo "Virtual environment setup complete"
}

# Function to detect Blackwell series GPU
detect_blackwell_gpu() {
    if command -v nvidia-smi >/dev/null 2>&1; then
        local gpu_names=$(nvidia-smi --query-gpu=name --format=csv,noheader,nounits 2>/dev/null | tr '[:upper:]' '[:lower:]')
        
        # Check for Blackwell series patterns (RTX 50xx series)
        if echo "$gpu_names" | grep -qE "rtx[[:space:]]*50[0-9]{2}|geforce[[:space:]]*rtx[[:space:]]*50[0-9]{2}|rtx[[:space:]]*509[0-9]|rtx[[:space:]]*508[0-9]|rtx[[:space:]]*507[0-9]|rtx[[:space:]]*506[0-9]"; then
            echo "Blackwell series GPU detected"
            return 0
        fi
    fi
    echo "No Blackwell series GPU detected or nvidia-smi not available"
    return 1
}

# Function to check and install dependencies
check_and_install_deps() {
    echo "=== Installing Dependencies ==="
    
    # Detect GPU type
    local is_blackwell=false
    if detect_blackwell_gpu; then
        is_blackwell=true
    fi
    
    # Install PyTorch based on GPU detection
    if python -c "import torch; print('PyTorch version:', torch.__version__)" 2>/dev/null; then
        echo "PyTorch is already installed"
    else
        echo "Installing PyTorch..."
        if [ "$is_blackwell" = true ]; then
            echo "Installing PyTorch nightly for Blackwell GPU..."
            pip install --pre torch torchvision torchaudio torchsde --index-url https://download.pytorch.org/whl/nightly/cu128
        else
            echo "Installing standard PyTorch..."
            pip install torch torchvision torchaudio torchsde
        fi
    fi
    
    # Install ComfyUI requirements
    if [ -f "requirements.txt" ]; then
        echo "Installing ComfyUI dependencies..."
        if [ "$is_blackwell" = true ]; then
            echo "Installing other ComfyUI dependencies (excluding torch packages for Blackwell)..."
            grep -v 'torch\|torchaudio\|torchvision\|torchsde' requirements.txt > temp_requirements.txt
            pip install -r temp_requirements.txt
            rm -f temp_requirements.txt
        else
            echo "Installing standard ComfyUI dependencies..."
            pip install -r requirements.txt
        fi
    else
        echo "requirements.txt not found, skipping dependency installation"
    fi
    
    # Install additional packages
    for package in "${ADDITIONAL_PACKAGES[@]}"; do
        if python -c "import $package" 2>/dev/null; then
            echo "$package is already installed"
        else
            echo "Installing $package..."
            pip install "$package"
        fi
    done
    
    echo "Dependencies installation complete"
}

# Function to copy node.py to custom_nodes folder
copy_node_to_custom_nodes() {
    echo "=== Copying node.py to custom_nodes/logoutrd/__init__.py ==="
    
    local custom_nodes_dir="$COMFYUI_DIR/custom_nodes"
    local logoutrd_dir="$custom_nodes_dir/logoutrd"
    local init_py_dest="$logoutrd_dir/__init__.py"
    
    # Always download node.py from GitHub
    echo "Downloading node.py from GitHub..."
    
    # Download node.py from GitHub to current directory
    local github_url="https://raw.githubusercontent.com/rdlogout/comfyui/main/public/node.py"
    local download_path="$(pwd)/node.py"
    
    if command -v curl >/dev/null 2>&1; then
        curl -L -o "$download_path" "$github_url"
    elif command -v wget >/dev/null 2>&1; then
        wget -O "$download_path" "$github_url"
    else
        echo "Error: Neither curl nor wget found. Cannot download node.py"
        echo "Please install curl or wget"
        return 1
    fi
    
    # Check if download was successful
    if [ ! -f "$download_path" ]; then
        echo "Error: Failed to download node.py from GitHub"
        return 1
    fi
    
    # Create custom_nodes/logoutrd directory if it doesn't exist
    if [ ! -d "$logoutrd_dir" ]; then
        echo "Creating logoutrd directory at $logoutrd_dir"
        mkdir -p "$logoutrd_dir"
    fi
    
    # Copy node.py to custom_nodes/logoutrd/__init__.py (overwrite if exists)
    echo "Copying $download_path to $init_py_dest"
    cp "$download_path" "$init_py_dest"
    
    if [ $? -eq 0 ]; then
        echo "Successfully copied node.py to custom_nodes/logoutrd/__init__.py"
    else
        echo "Error: Failed to copy node.py to custom_nodes/logoutrd/__init__.py"
        return 1
    fi
    
    echo "node.py copy operation complete"
}

# Main execution
echo "=== ComfyUI Setup Script ==="

# Set environment variables from configuration
set_system_env "MACHINE_ID" "$MACHINE_ID"
set_system_env "PROXY" "$PROXY"
set_system_env "COMFYUI_DIR" "$COMFYUI_DIR"

# Install core essentials first
install_core_essentials

# Install Bun
install_bun

# ComfyUI setup functions
check_and_clone_comfyui
setup_venv
check_and_install_deps

# Copy node.py to custom_nodes folder
copy_node_to_custom_nodes

# Source environment files
source /etc/environment 2>/dev/null || true
source ~/.bashrc 2>/dev/null || true

echo "=== Setup Complete ==="
echo "Configuration used:"
echo "WORKSPACE_DIR: $WORKSPACE_DIR"
echo "COMFYUI_DIR: $COMFYUI_DIR"
echo "VENV_PATH: $VENV_PATH"
echo "MACHINE_ID: $MACHINE_ID"
echo "PROXY: $PROXY"
echo ""

# Print appropriate running commands based on proxy setting
if [ "$PROXY" = "true" ]; then
    echo "=== Proxy Mode Enabled ==="
    echo "Starting ComfyUI with proxy..."
    echo "Command: cd $COMFYUI_DIR && source venv/bin/activate && proxychains4 -f \$HOME/.proxychains.conf python main.py --listen --enable-cors-header"
    echo ""
    echo "Proxy configuration file: $HOME/.proxychains.conf"
    echo ""
    
    # Start ComfyUI with proxy
    cd "$COMFYUI_DIR"
    source venv/bin/activate
    proxychains4 -f "$HOME/.proxychains.conf" python main.py --listen --enable-cors-header
else
    echo "=== Normal Mode ==="
    echo "Starting ComfyUI..."
    echo "Command: cd $COMFYUI_DIR && source venv/bin/activate && python main.py --listen --enable-cors-header"
    echo ""
    
    # Start ComfyUI normally
    cd "$COMFYUI_DIR"
    source venv/bin/activate
    python main.py --listen --enable-cors-header
fi
#!/bin/bash

# ========== Configuration ==========
# Change this if you make your own fork
REPO_URL="https://github.com/Zeeraa/Protogen"
REPO_BRANCH="main"


# ========== Argument parsing ==========
REINSTALL_FT_ONLY=false
EXPERIMENTAL_PI5_SUPPORT=false
for arg in "$@"; do
    case "$arg" in
        --reinstall-ft) REINSTALL_FT_ONLY=true ;;
        --experimental-pi5-support) EXPERIMENTAL_PI5_SUPPORT=true ;;
    esac
done

# ========== Functions ==========
install_flaschen_taschen() {
    local force_reinstall="${1:-false}"
    local pi5_support="${2:-false}"
    if [[ "$force_reinstall" == "true" ]] && [[ -d "/home/pi/flaschen-taschen" ]]; then
        echo "Removing existing flaschen-taschen directory..."
        rm -rf /home/pi/flaschen-taschen
    fi
    if [[ -f "/home/pi/flaschen-taschen/server/ft-server" ]]; then
        echo "flaschen-taschen binary already found"
    else
        echo "flaschen-taschen binary not found. Cloning repo and compiling it"
        git clone --recursive https://github.com/hzeller/flaschen-taschen.git /home/pi/flaschen-taschen

        if [[ "$pi5_support" == "true" ]]; then
            echo "[Experimental] Swapping rgb-matrix submodule to Pi5 fork..."
            cd /home/pi/flaschen-taschen/server/rgb-matrix
            git remote add pi5fork https://github.com/kingdo9/rpi-rgb-led-matrix_pwm_experiment.git
            git fetch pi5fork pi5_support
            git checkout bbd4cf1
            echo "[Experimental] rgb-matrix switched to Pi5 fork commit bbd4cf1"
        fi

        cd /home/pi/flaschen-taschen/server
        make FT_BACKEND=rgb-matrix
    fi
    chown -R pi:pi /home/pi/flaschen-taschen
}

# ========== Permission check and disclaimer ==========
# Check for root permissions

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root!"
    exit 1
fi

# ========== Reinstall flaschen-taschen only ==========
if [[ "$REINSTALL_FT_ONLY" == "true" ]]; then
    echo "Reinstalling flaschen-taschen..."
    install_flaschen_taschen true "$EXPERIMENTAL_PI5_SUPPORT"
    echo "flaschen-taschen reinstall complete."
    exit 0
fi

# ========== Detect update vs fresh install ==========
IS_UPDATE=false
if [[ -d "/home/pi/protogen" ]]; then
    IS_UPDATE=true
fi

if [[ "$IS_UPDATE" == "true" ]]; then
    echo "Existing installation detected at /home/pi/protogen."
    echo "This script will update your Protogen installation."
else
    echo "WARNING: This script is intended to run on a clean install of Raspberry Pi OS Lite as the user 'pi' using sudo."
    echo "I am not responsible for any data loss if this script is run on an existing install or a non-supported system."
fi
echo ""
read -rp "Do you want to continue? (y/N): " confirm

# Convert input to lowercase and check if it's 'y'
if [[ "${confirm,,}" != "y" ]]; then
    echo "Canceled."
    exit 1
fi

if [[ "$IS_UPDATE" == "true" ]]; then
    echo "Proceeding with update..."
else
    echo "Proceeding with installation..."
fi

# ========== Feature selection ==========
ask_yes_no() {
    local prompt="$1"
    local answer
    while true; do
        read -rp "$prompt (y/n): " answer
        case "${answer,,}" in
            y) return 0 ;;
            n) return 1 ;;
            *) echo "Please enter y or n." ;;
        esac
    done
}

# ========== Update mode: Git checks ==========
if [[ "$IS_UPDATE" == "true" ]]; then
    # Check if git repo
    if [[ ! -d "/home/pi/protogen/.git" ]]; then
        echo "Error: /home/pi/protogen is not a git repository."
        echo "The directory is already in use and we were unable to update due to a missing git repo."
        exit 1
    fi

    cd /home/pi/protogen

    # Check branch
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    if [[ "$CURRENT_BRANCH" != "$REPO_BRANCH" ]]; then
        echo "Warning: You are currently on branch '$CURRENT_BRANCH', not '$REPO_BRANCH'."
        read -rp "Switch to '$REPO_BRANCH' to proceed with the update? (y/N): " switch_confirm
        if [[ "${switch_confirm,,}" != "y" ]]; then
            echo "Update canceled."
            exit 1
        fi
        if ! git checkout "$REPO_BRANCH"; then
            echo "Error: Failed to switch to branch '$REPO_BRANCH'."
            exit 1
        fi
    fi

    # Check if repo is dirty
    if [[ -n "$(git status --porcelain)" ]]; then
        echo "Warning: The repository has uncommitted local changes."
        read -rp "Run 'git reset --hard' to discard all local changes and proceed? (y/N): " reset_confirm
        if [[ "${reset_confirm,,}" != "y" ]]; then
            echo "Update canceled."
            exit 1
        fi
        if ! git reset --hard; then
            echo "Error: Failed to reset repository."
            exit 1
        fi
    fi

    # Stop services before updating
    echo "Stopping services..."
    systemctl stop protogen || true
    systemctl stop gamepad-listener || true
    systemctl stop flaschen-taschen || true
    systemctl stop mosquitto || true

    # Pull latest changes
    echo "Pulling latest changes from '$REPO_BRANCH'..."
    if ! git pull; then
        echo "Error: git pull failed."
        exit 1
    fi
    echo "Repository updated successfully."
fi

if [[ "$IS_UPDATE" == "false" ]]; then
    echo ""
    echo "--- Feature Configuration ---"
    if ask_yes_no "Enable Serial communication? (required for RGB, HUD, and boop sensor)"; then
        ENABLE_SERIAL="true"
        if ask_yes_no "Enable RGB?"; then ENABLE_RGB="true"; else ENABLE_RGB="false"; fi
        if ask_yes_no "Enable HUD?"; then ENABLE_HUD="true"; else ENABLE_HUD="false"; fi
        if ask_yes_no "Enable Boop Sensor?"; then ENABLE_BOOP_SENSOR="true"; else ENABLE_BOOP_SENSOR="false"; fi
    else
        ENABLE_SERIAL="false"
        ENABLE_RGB="false"
        ENABLE_HUD="false"
        ENABLE_BOOP_SENSOR="false"
    fi
    echo ""
    echo "Video playback requires a separate processing server (remote worker) to be set up manually."
    echo "See the documentation for instructions on how to configure it."
    if ask_yes_no "Enable Video Playback?"; then VIDEO_PLAYBACK_ENABLED="true"; else VIDEO_PLAYBACK_ENABLED="false"; fi
    echo ""
    echo "Interface List is a development tool that exposes the local IP addresses of this device under /whatsyourip."
    echo "Only install this if you need it for development or network discovery purposes."
    if ask_yes_no "Install Interface List (exposes device IP at /whatsmyip)? [default: no]"; then INSTALL_INTERFACE_LIST="true"; else INSTALL_INTERFACE_LIST="false"; fi
    echo ""
fi

# ========== Packages ==========
echo Installing required packages
sudo apt update
sudo apt install pwgen -y

echo "phpmyadmin phpmyadmin/dbconfig-install boolean true" | sudo debconf-set-selections
echo "phpmyadmin phpmyadmin/reconfigure-webserver multiselect apache2" | sudo debconf-set-selections
echo "phpmyadmin phpmyadmin/mysql/app-pass password $(pwgen -s -1 128)" | sudo debconf-set-selections

sudo apt install -y dkms vlc ffmpeg btop git build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev apache2 mariadb-server mariadb-client php php-mbstring php-zip php-gd php-json php-curl phpmyadmin wpasupplicant wireless-tools iproute2 mosquitto python3 python3-venv

# Check if Node.js is installed
if ! command -v node &>/dev/null; then
    echo "Node.js is not installed. Installing..."
    
    curl -fsSL https://deb.nodesource.com/setup_24.x -o nodesource_setup.sh
    bash nodesource_setup.sh
    rm nodesource_setup.sh

    sudo apt install -y nodejs

    # Verify installation
    if command -v node &>/dev/null; then
        echo "Node.js installed successfully."
    else
        echo "Error: Node.js installation failed!"
        exit 1
    fi
else
    echo "Node.js is already installed. Version: $(node -v)"
fi

# Node packages
npm install --global typescript @angular/cli
ng config -g cli.interactive false

# ========== Configure stuff ==========
if [[ "$IS_UPDATE" == "false" ]]; then
    # Database password
    GENERATED_DB_PASSWORD=$(pwgen -s -1 32)
    echo "Configuring MariaDB..."

    sudo mysql -u root -e "CREATE USER IF NOT EXISTS 'protogen'@'localhost' IDENTIFIED BY '$GENERATED_DB_PASSWORD';"
    sudo mysql -u root -e "ALTER USER 'protogen'@'localhost' IDENTIFIED BY '$GENERATED_DB_PASSWORD';"
    sudo mysql -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'protogen'@'localhost' WITH GRANT OPTION;"
    sudo mysql -u root -e "FLUSH PRIVILEGES;"
    sudo mysql -u root -e "CREATE DATABASE IF NOT EXISTS protogen;"

    echo "DB Password: $GENERATED_DB_PASSWORD"
fi

# ========== Build flaschen-taschen ==========
install_flaschen_taschen false "$EXPERIMENTAL_PI5_SUPPORT"


# ========== Setup protogen frontend and backend ==========
if [[ "$IS_UPDATE" == "false" ]]; then
    # Clone the repository
    echo "Cloning repository..."
    if ! git clone "$REPO_URL" "/home/pi/protogen"; then
        echo "Error: Failed to clone the repository!"
        exit 1
    fi
    echo "Repository cloned successfully."
    cd /home/pi/protogen
    git checkout $REPO_BRANCH
fi

cd /home/pi/protogen
git submodule update --init --recursive

# Frontend
echo Building frontend
cd /home/pi/protogen/frontend
npm install
chmod +x /home/pi/protogen/frontend/build.sh
bash /home/pi/protogen/frontend/build.sh

# Backend
cd /home/pi/protogen/backend
npm install
npm run build

if [[ "$IS_UPDATE" == "false" ]]; then
    if [[ ! -f "/home/pi/protogen/backend/.env" ]]; then
        echo "Creating .env from sample file"
        cp /home/pi/protogen/backend/.env.sample /home/pi/protogen/backend/.env
        sed -i 's|^REMOTE_WORKER_URL=.*|REMOTE_WORKER_URL="http://127.0.0.1:3069"|' /home/pi/protogen/backend/.env
    fi

    sed -i 's|^DB_USERNAME=.*|DB_USERNAME="protogen"|' /home/pi/protogen/backend/.env
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=\"${GENERATED_DB_PASSWORD}\"|" /home/pi/protogen/backend/.env
    sed -i "s|^ENABLE_SERIAL=.*|ENABLE_SERIAL=\"${ENABLE_SERIAL}\"|" /home/pi/protogen/backend/.env
    sed -i "s|^ENABLE_RGB=.*|ENABLE_RGB=\"${ENABLE_RGB}\"|" /home/pi/protogen/backend/.env
    sed -i "s|^ENABLE_HUD=.*|ENABLE_HUD=\"${ENABLE_HUD}\"|" /home/pi/protogen/backend/.env
    sed -i "s|^ENABLE_BOOP_SENSOR=.*|ENABLE_BOOP_SENSOR=\"${ENABLE_BOOP_SENSOR}\"|" /home/pi/protogen/backend/.env
    sed -i "s|^VIDEO_PLAYBACK_ENABLED=.*|VIDEO_PLAYBACK_ENABLED=\"${VIDEO_PLAYBACK_ENABLED}\"|" /home/pi/protogen/backend/.env
fi

sudo chown -R pi:pi /home/pi/protogen

# ========== Gamepad Listener ==========
echo "Setting up Gamepad Listener..."
cd /home/pi/protogen/gamepad_listener
if [[ ! -d "venv" ]]; then
    python3 -m venv venv
fi
venv/bin/pip install -r requirements.txt
sudo chown -R pi:pi /home/pi/protogen/gamepad_listener

# ========== Configure Mosquitto ==========
echo "Configuring Mosquitto MQTT broker..."
cp /home/pi/protogen/gamepad_listener/mosquitto.conf /etc/mosquitto/conf.d/protogen.conf
systemctl enable mosquitto
systemctl restart mosquitto

# ========== Setup services ==========
if [[ -f "/etc/systemd/system/flaschen-taschen.service" ]]; then
    echo "flaschen-taschen.service already exists"
else
    echo "Creating service flaschen-taschen.service"
    cp /home/pi/protogen/systemd/flaschen-taschen.service /etc/systemd/system/flaschen-taschen.service
    systemctl enable flaschen-taschen.service
fi


if [[ -f "/etc/systemd/system/protogen.service" ]]; then
    echo "protogen.service already exists"
else
    echo "Creating service protogen.service"
    cp /home/pi/protogen/systemd/protogen.service /etc/systemd/system/protogen.service
    systemctl enable protogen.service
fi

if [[ -f "/etc/systemd/system/gamepad-listener.service" ]]; then
    echo "gamepad-listener.service already exists"
else
    echo "Creating service gamepad-listener.service"
    cp /home/pi/protogen/systemd/gamepad-listener.service /etc/systemd/system/gamepad-listener.service
    systemctl enable gamepad-listener.service
fi

# ========== Interface List ==========
if [[ "$INSTALL_INTERFACE_LIST" == "true" ]]; then
    echo "Installing Interface List..."
    if [[ -d "/home/pi/Interface-List" ]]; then
        echo "Removing existing Interface-List directory..."
        rm -rf /home/pi/Interface-List
    fi
    git clone https://github.com/Zeeraa/Interface-List /home/pi/Interface-List
    cd /home/pi/Interface-List
    npm install
    tsc
    chown -R pi:pi /home/pi/Interface-List

    if [[ -f "/etc/systemd/system/interface-list.service" ]]; then
        echo "interface-list.service already exists"
    else
        echo "Creating service interface-list.service"
        cp /home/pi/protogen/systemd/interface-list.service /etc/systemd/system/interface-list.service
        systemctl enable interface-list.service
    fi
    echo "Interface List installed."
fi

# ========== Better gamepad support ==========
# Install xpadneo for better Xbox controller support
if [[ -d "/home/pi/xpadneo" ]]; then
    echo "xpadneo directory already exists. Checking installation..."
    if lsmod | grep -q "hid_xpadneo"; then
        echo "xpadneo driver already loaded"
    else
        echo "xpadneo directory exists but driver not loaded. Reinstalling..."
        cd /home/pi/xpadneo
        sudo ./install.sh
    fi
else
    echo "Installing xpadneo for better Xbox controller support..."
    git clone https://github.com/atar-axis/xpadneo.git /home/pi/xpadneo
    cd /home/pi/xpadneo
    sudo ./install.sh
    echo "xpadneo installed successfully"
fi
sudo chown -R pi:pi /home/pi/xpadneo


# ========== Final ==========
echo "--led-cols=64 --led-rows=32 --led-chain=2 --led-gpio-mapping=adafruit-hat --led-slowdown-gpio=3 --led-limit-refresh=100" > /home/pi/ft_config.txt
sudo chown pi:pi /home/pi/ft_config.txt

# Enable bluetooth
sudo systemctl enable bluetooth

# ========== Configure Bluetooth stack ==========
echo "Configuring Bluetooth stack for controller support..."

# Disable ERTM (required for Xbox controller pairing)
if ! grep -q "disable_ertm" /etc/modprobe.d/bluetooth.conf 2>/dev/null; then
    echo "options bluetooth disable_ertm=y" | sudo tee -a /etc/modprobe.d/bluetooth.conf
    echo "ERTM disabled in /etc/modprobe.d/bluetooth.conf"
else
    echo "ERTM already disabled"
fi

# Also disable at runtime in case we don't reboot
sudo bash -c 'echo 1 > /sys/module/bluetooth/parameters/disable_ertm' 2>/dev/null || true

# Configure /etc/bluetooth/main.conf
BTCONF="/etc/bluetooth/main.conf"
if [[ -f "$BTCONF" ]]; then
    # Enable dual controller mode (BR/EDR + LE)
    sed -i 's/^#ControllerMode = dual/ControllerMode = dual/' "$BTCONF"
    sed -i 's/^ControllerMode = .*/ControllerMode = dual/' "$BTCONF"

    # Enable device privacy mode (needed for BLE devices like Xbox controllers)
    sed -i 's/^#Privacy = off/Privacy = device/' "$BTCONF"
    sed -i 's/^Privacy = off/Privacy = device/' "$BTCONF"

    # Enable JustWorks pairing (no interactive PIN for headless pairing)
    sed -i 's/^#JustWorksRepairing = never/JustWorksRepairing = always/' "$BTCONF"
    sed -i 's/^JustWorksRepairing = never/JustWorksRepairing = always/' "$BTCONF"

    # Enable fast connectable for quicker reconnection
    sed -i 's/^#FastConnectable = false/FastConnectable = true/' "$BTCONF"
    sed -i 's/^FastConnectable = false/FastConnectable = true/' "$BTCONF"

    echo "Bluetooth main.conf configured"
else
    echo "Warning: $BTCONF not found, skipping Bluetooth config"
fi

sudo systemctl restart bluetooth

# Apache2
a2enmod rewrite
a2enmod headers
a2enmod proxy
a2enmod proxy_http
a2enmod proxy_wstunnel

a2dissite 000-default.conf

if [[ -f "/etc/apache2/sites-available/protogen.conf" ]]; then
    echo "Apache2 config for protogen already exists"
else
    echo "Creating apache2 config for protogen"
    cp /home/pi/protogen/apache2/protogen.conf /etc/apache2/sites-available/protogen.conf
fi

a2ensite protogen.conf

service apache2 restart

# Start / restart services
if [[ "$IS_UPDATE" == "true" ]]; then
    systemctl restart flaschen-taschen
    systemctl restart gamepad-listener
    systemctl restart protogen
    if systemctl is-enabled --quiet interface-list 2>/dev/null; then
        systemctl restart interface-list
    fi
else
    systemctl start flaschen-taschen
    systemctl start gamepad-listener
    systemctl start protogen
    systemctl start mosquitto
    if [[ "$INSTALL_INTERFACE_LIST" == "true" ]]; then
        systemctl start interface-list
    fi
fi

if [[ "$IS_UPDATE" == "true" ]]; then
    echo "Update complete! Services have been restarted."
else
    echo "Installation complete!"
    echo "DB Credentials: protogen:$GENERATED_DB_PASSWORD"
fi

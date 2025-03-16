#!/bin/bash

# ========== Configuration ==========
# Change this if you make your own fork
REPO_URL="https://github.com/Zeeraa/Protogen"
REPO_BRANCH="main"


# ========== Permission check and disclaimer ==========
# Check for root permissions

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root!"
    exit 1
fi

echo "WARNING: This script is intended to run on a clean install of Raspberry Pi OS Lite as the user 'pi' using sudo."
echo "I am not responsible for any data loss if this script is run on an existing install or a non-supported system."
echo ""
read -rp "Do you want to continue? (y/N): " confirm

# Convert input to lowercase and check if it's 'y'
if [[ "${confirm,,}" != "y" ]]; then
    echo "Installation canceled."
    exit 1
fi

echo "Proceeding with installation..."

# ========== Packages ==========
echo Installing required packages
sudo apt update
sudo apt install pwgen

echo "phpmyadmin phpmyadmin/dbconfig-install boolean true" | sudo debconf-set-selections
echo "phpmyadmin phpmyadmin/reconfigure-webserver multiselect apache2" | sudo debconf-set-selections
echo "phpmyadmin phpmyadmin/mysql/app-pass password $(pwgen -s -1 128)" | sudo debconf-set-selections

sudo apt install -y vlc ffmpeg btop git build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev apache2 mariadb-server mariadb-client php php-mbstring php-zip php-gd php-json php-curl phpmyadmin

# Check if Node.js is installed
if ! command -v node &>/dev/null; then
    echo "Node.js is not installed. Installing..."
    
    curl -fsSL https://deb.nodesource.com/setup_22.x -o nodesource_setup.sh
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
# Database password
GENERATED_DB_PASSWORD=$(pwgen -s -1 32)
echo "Configuring MariaDB..."

sudo mysql -u root -e "CREATE USER IF NOT EXISTS 'protogen'@'localhost' IDENTIFIED BY '$GENERATED_DB_PASSWORD';"
sudo mysql -u root -e "ALTER USER 'protogen'@'localhost' IDENTIFIED BY '$GENERATED_DB_PASSWORD';"
sudo mysql -u root -e "GRANT ALL PRIVILEGES ON *.* TO 'protogen'@'localhost' WITH GRANT OPTION;"
sudo mysql -u root -e "FLUSH PRIVILEGES;"
sudo mysql -u root -e "CREATE DATABASE IF NOT EXISTS protogen;"

echo "DB Password: $GENERATED_DB_PASSWORD"

# ========== Build flaschen-taschen ==========
if [[ -f "/home/pi/flaschen-taschen/server/ft-server" ]]; then
    echo "flaschen-taschen binary already found"
else
    echo "flaschen-taschen binary not found. Cloning repo and compiling it"
    git clone --recursive https://github.com/hzeller/flaschen-taschen.git /home/pi/flaschen-taschen
    cd flaschen-taschen/server
    make FT_BACKEND=rgb-matrix
fi
sudo chown -R pi:pi /home/pi/flaschen-taschen


# ========== Setup protogen frontend and backend ==========
# Clone the repository
if [[ ! -d "/home/pi/protogen" ]]; then
    echo "Cloning repository into $TARGET_DIR..."
    if ! git clone "$REPO_URL" "/home/pi/protogen"; then
        echo "Error: Failed to clone the repository!"
        exit 1
    fi
    echo "Repository cloned successfully."
else
    echo "Directory /home/pi/protogen already exists. Skipping clone."
fi

cd /home/pi/protogen
git checkout $REPO_BRANCH

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

if [[ ! -f "/home/pi/backend/.env" ]]; then
    echo "Cloning .env sample file"
    cp /home/pi/protogen/backend/.env.sample /home/pi/protogen/backend/.env
    sed -i 's|^REMOTE_WORKER_URL=.*|REMOTE_WORKER_URL="http://127.0.0.1:3069"|' /home/pi/protogen/backend/.env
fi

sed -i 's|^DB_USERNAME=.*|DB_USERNAME="protogen"|' /home/pi/protogen/backend/.env
sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD="${GENERATED_DB_PASSWORD}"|" /home/pi/protogen/backend/.env

sudo chown -R pi:pi /home/pi/protogen

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

# ========== Final ==========
echo "--led-cols=64 --led-rows=32 --led-chain=2 --led-gpio-mapping=adafruit-hat --led-slowdown-gpio=3 --led-limit-refresh=100" > /home/pi/ft_config.txt
sudo chown pi:pi /home/pi/ft_config.txt

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

# Start services
service flaschen-taschen start
service protogen start

echo "DB Credentials: protogen:$GENERATED_DB_PASSWORD"
#!/bin/bash
npx ng build
sudo rm /var/www/protogen -fr
sudo cp -r "$(pwd)/dist/protogen-frontend/browser" "/var/www/protogen"
sudo chown -R www-data:www-data /var/www/protogen

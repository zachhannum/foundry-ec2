#!/bin/bash

# install caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install -y caddy

# create /etc/caddy/Caddyfile to reverse proxy :80 to :30000
sudo mkdir -p /etc/caddy
sudo tee /etc/caddy/Caddyfile > /dev/null <<EOF
foundry.whentitansfell.com {
    header {
        >Access-Control-Allow-Origin *
        >Access-Control-Allow-Credentials true
        >Access-Control-Allow-Methods *
        >Access-Control-Allow-Headers *
        >Set-Cookie SameSite=Strict "SameSite=None; Secure"
        
    }
  tls zacharyhannum@gmail.com
  reverse_proxy localhost:30000
  handle_path /api* {
    reverse_proxy localhost:4040
  }
}
EOF

# restart caddy
sudo systemctl restart caddy

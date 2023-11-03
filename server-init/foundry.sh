#!/bin/bash

# Create user foundry with uid 421
sudo useradd -u 421 -m foundry

# Install Docker
sudo apt-get update
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
sudo echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo pt-cache policy docker-ce
sudo apt install -y docker-ce
sudo apt-get install -y zip unzip inotify-tools fish

# Pull foundry image
sudo docker pull felddy/foundryvtt:release

# Create data dir
sudo mkdir -p /opt/foundryvtt
sudo chmod 777 /opt/foundryvtt

# If FOUNDRY_GIT_REPO and FOUNDRY_GIT_USER, is set, download the repo and unzip it to /opt/foundryvtt
if [ -n "$FOUNDRY_GIT_REPO" ] && [ -n "$FOUNDRY_GIT_USER" ]; then
  cd /opt/foundryvtt
  CLONE_URL="https://github.com/$FOUNDRY_GIT_USER/$FOUNDRY_GIT_REPO.git"
  if [ -n "$GITHUB_PAT" ]; then
    CLONE_URL="https://$FOUNDRY_GIT_USER:$GITHUB_PAT@github.com/$FOUNDRY_GIT_USER/$FOUNDRY_GIT_REPO.git"
  fi
  echo "Cloning $CLONE_URL"
  git clone $CLONE_URL .

  local pub_ip=$(curl -s http://checkip.amazonaws.com)
  sudo -u foundry git config --global user.name "FoundryVTT"
  sudo -u foundry git config --global user.email "foundryvtt@$pub_ip"

  git remote set-url origin $CLONE_URL
  
  # Install gitwatch
  cd /tmp
  git clone https://github.com/gitwatch/gitwatch.git
  cd gitwatch
  sudo install -b gitwatch.sh /usr/local/bin/gitwatch

  sudo chown -R foundry:foundry /opt/foundryvtt

  # Create service to watch for changes
  sudo tee /etc/systemd/system/gitwatch.service > /dev/null <<EOF
[Unit]
Description=Gitwatch for FoundryVTT
After=network.target

[Service]
ExecStart=/usr/local/bin/gitwatch -r $CLONE_URL /opt/foundryvtt
Restart=always
User=foundry

[Install]
WantedBy=multi-user.target
EOF

  sudo systemctl daemon-reload
  sudo systemctl enable gitwatch
  sudo systemctl start gitwatch
fi

sudo chsh -s /usr/bin/fish ubuntu
sudo chsh -s /usr/bin/fish root

# Script to run foundry
sudo tee /usr/bin/run_foundry.sh > /dev/null <<EOF
#!/bin/bash

# check if there is an existing container that is not running that we just need to start
if [ -n "\$(sudo docker ps -aq -f status=exited -f name=foundry)" ]; then
  sudo docker start foundry
  exit 0
fi

sudo docker run -d \
  --name foundry \
  --env FOUNDRY_USERNAME=$FOUNDRY_USERNAME \
  --env FOUNDRY_PASSWORD=$FOUNDRY_PASSWORD \
  --env FOUNDRY_ADMIN_KEY=$FOUNDRY_ADMIN_KEY \
  --env CONTAINER_PATCHES=/data/container_patches \
  -p 30000:30000 \
  -v /opt/foundryvtt:/data \
  felddy/foundryvtt:release
EOF
sudo chmod +x /usr/bin/run_foundry.sh

# Set up service for foundry to run on boot
sudo tee /etc/systemd/system/foundry.service > /dev/null <<EOF
[Unit]
Description=FoundryVTT
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/run_foundry.sh
EnvFile=/etc/foundry.env
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/foundry.env > /dev/null <<EOF
FOUNDRY_USERNAME=$FOUNDRY_USERNAME
FOUNDRY_PASSWORD=$FOUNDRY_PASSWORD
FOUNDRY_ADMIN_KEY=$FOUNDRY_ADMIN_KEY
EOF

sudo systemctl daemon-reload
sudo systemctl enable foundry
sudo systemctl start foundry

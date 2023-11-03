#!/bin/bash

# Verify that all the necessary environment variables are set and exit without doing anything if they are not
echo "Verifying environment variables"
echo "docker tag: $API_DOCKER_TAG"
ENV_VERIFIED=true
if [ -z $API_DOCKER_TAG ]; then
  echo "API_DOCKER_TAG is not set"
  ENV_VERIFIED=false
fi
if [ -z $FOUNDRY_URL ]; then
  echo "FOUNDRY_URL is not set"
  ENV_VERIFIED=false
fi
if [ -z $FOUNDRY_API_USERNAME ]; then
  echo "FOUNDRY_API_USERNAME is not set"
  ENV_VERIFIED=false
fi
if [ -z $FOUNDRY_API_PASSWORD ]; then
  echo "FOUNDRY_API_PASSWORD is not set"
  ENV_VERIFIED=false
fi
if [ -z $API_KEY ]; then
  echo "API_KEY is not set"
  ENV_VERIFIED=false
fi


if [ "$ENV_VERIFIED" = false ]; then
  exit 0
fi


# Pull the latest image
sudo docker pull $API_DOCKER_TAG

# Create a script to run the foundry api
sudo tee /usr/bin/run_foundry_api.sh > /dev/null <<EOF
#!/bin/bash

# check if there is an existing container that is not running that we just need to start
if [ -n "\$(sudo docker ps -aq -f status=exited -f name=foundry_api)" ]; then
    # check if the latest image is newer than the existing container
    if [ "\$(sudo docker inspect -f '{{.Created}}' foundry_api)" -lt "\$(sudo docker inspect -f '{{.Created}}' $API_DOCKER_TAG)" ]; then
        echo "Removing old foundry_api container"
        sudo docker rm foundry_api
    else
        sudo docker start foundry_api
        exit 0
    fi
fi

sudo docker run -d \
  --name foundry_api \
  --env FOUNDRY_URL=$FOUNDRY_URL \
  --env FOUNDRY_USERNAME=$FOUNDRY_API_USERNAME \
  --env FOUNDRY_PASSWORD=$FOUNDRY_API_PASSWORD \
  --env API_KEY=$API_KEY \
  --env PORT=4040 \
  -p 4040:4040 \
  $API_DOCKER_TAG
EOF

sudo chmod +x /usr/bin/run_foundry_api.sh

# Set up service for foundry to run on boot
sudo tee /etc/systemd/system/foundry_api.service > /dev/null <<EOF
[Unit]
Description=FoundryVTT API
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/run_foundry_api.sh
Restart=always

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable foundry_api
sudo systemctl start foundry_api

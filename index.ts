import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";
import * as command from "@pulumi/command";
import * as docker from "@pulumi/docker";
import { createApi } from "./create-api";

// Get some configuration values or set default values.
const config = new pulumi.Config();
const instanceType = config.get("instanceType") || "t3.micro";

const pubKey = config.require("publicKey");
const privateKey = config.require("privateKey");
const foundryUsername = config.require("foundryUsername");
const foundryPassword = config.require("foundryPassword");
const foundryAdminKey = config.require("foundryAdminKey");

// get optional config for foundry config git url
const foundryUrl = config.get("foundryUrl");
const foundryGitRepo = config.get("foundryGitRepo");
const foundryGitUser = config.get("foundryGitUser");
const githubPat = config.get("githubPat");

// get optional config for api
const apiImageName = config.get("apiImageName");
const foundryApiUsername = config.get("foundryApiUsername");
const foundryApiPassword = config.get("foundryApiPassword");
const apiKey = config.get("apiKey");

// Create keypair for SSH access
const keyPair = new aws.ec2.KeyPair("keyPair", {
  publicKey: pubKey,
});

// Create a security group allowing inbound access over port 80 and outbound
// access to anywhere.
const secGroup = new aws.ec2.SecurityGroup("secGroup", {
  description: "Enable HTTP access",
  ingress: [
    {
      fromPort: 443,
      toPort: 443,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      fromPort: 80,
      toPort: 80,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
    },
    {
      fromPort: 22,
      toPort: 22,
      protocol: "tcp",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
  egress: [
    {
      fromPort: 0,
      toPort: 0,
      protocol: "-1",
      cidrBlocks: ["0.0.0.0/0"],
    },
  ],
});

let apiImage: docker.Image | undefined;
if (apiImageName) {
  apiImage = createApi(apiImageName);
}

// Create and launch an EC2 instance into the public subnet.
const server = new aws.ec2.Instance("server", {
  instanceType: instanceType,
  vpcSecurityGroupIds: [secGroup.id],
  ami: "ami-0f4420dd06ba77387",
  keyName: keyPair.keyName,
  tags: {
    Name: "webserver",
  },
});

// Create a hosted zone for subdomain foundry.whentitansfell.com
const hostedZone = new aws.route53.Zone("foundry", {
  name: "foundry.whentitansfell.com",
});

// Create a DNS record for foundry.whentitansfell.com
new aws.route53.Record("foundry", {
  name: "foundry.whentitansfell.com",
  zoneId: hostedZone.zoneId,
  type: "A",
  ttl: 300,
  records: [server.publicIp],
});

const connection: command.types.input.remote.ConnectionArgs = {
  host: server.publicIp,
  user: "ubuntu",
  privateKey: privateKey,
};

const copyFoundryModTime = fs
  .statSync("./server-init/foundry.sh")
  .mtime.getTime();
const copyFoundry = new command.remote.CopyFile("copy-foundry", {
  localPath: "./server-init/foundry.sh",
  remotePath: "/tmp/foundry.sh",
  connection: connection,
  // Trigger when the modification time for the local file changes.
  triggers: [copyFoundryModTime],
});

const copyCaddyModTime = fs.statSync("./server-init/caddy.sh").mtime.getTime();
const copyCaddy = new command.remote.CopyFile("copy-caddy", {
  localPath: "./server-init/caddy.sh",
  remotePath: "/tmp/caddy.sh",
  connection: connection,
  // Trigger when the modification time for the local file changes.
  triggers: [copyCaddyModTime],
});

const copyApiModTime = fs.statSync("./server-init/api.sh").mtime.getTime();
const copyApi = new command.remote.CopyFile("copy-api", {
  localPath: "./server-init/api.sh",
  remotePath: "/tmp/api.sh",
  connection: connection,
  // Trigger when the modification time for the local file changes.
  triggers: [copyApiModTime],
});

const installCommand = `
echo "Installing Foundry VTT"
export FOUNDRY_USERNAME=${foundryUsername}
export FOUNDRY_PASSWORD=${foundryPassword}
export FOUNDRY_GIT_REPO=${foundryGitRepo || ""}
export FOUNDRY_GIT_USER=${foundryGitUser || ""}
export FOUNDRY_ADMIN_KEY=${foundryAdminKey}
export FOUNDRY_URL=${foundryUrl || ""}
export FOUNDRY_API_USERNAME=${foundryApiUsername || ""}
export FOUNDRY_API_PASSWORD=${foundryApiPassword || ""}
export API_KEY=${apiKey || ""}
export GITHUB_PAT=${githubPat || ""}
export API_DOCKER_TAG=${apiImageName || ""}

sudo chmod +x /tmp/foundry.sh
sudo chmod +x /tmp/caddy.sh
sudo chmod +x /tmp/api.sh
/tmp/foundry.sh > /tmp/foundry.log 2>&1
/tmp/caddy.sh > /tmp/caddy.log 2>&1
/tmp/api.sh > /tmp/api.log 2>&1
`;

let installDependsOn = [
  server,
  copyCaddy,
  copyFoundry,
  copyApi,
] as pulumi.Resource[];
if (apiImage !== undefined) {
  installDependsOn.push(apiImage);
}
const installCmd = new command.remote.Command(
  "install",
  {
    create: installCommand,
    connection: connection,
    triggers: [copyFoundryModTime, copyCaddyModTime, copyApiModTime],
  },
  { dependsOn: installDependsOn }
);

// Export the instance's publicly accessible IP address and hostname.
export const ip = server.publicIp;
export const hostname = server.publicDns;
export const url = foundryUrl;
export const zone = hostedZone.nameServers;
export const apiCopyModTime = copyApiModTime;
export const installOut = installCmd.stdout;

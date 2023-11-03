import * as docker from "@pulumi/docker";

export const createApi = (imageName: string): docker.Image => {
  // Build and publish the image to the registry
  const image = new docker.Image("foundry-image", {
    build: {
      context: "./api",
      platform: "linux/amd64",
    },
    imageName,
  });

  return image;
};

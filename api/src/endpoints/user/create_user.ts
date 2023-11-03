import {
  FoundrySocket,
  authenticateFoundry,
  connectToFoundry,
} from "../../foundry-connect/foundry-api";
import { asyncEmit } from "../../foundry-connect/socket-io-helpers";
import config from "../../config/config";
import type { Response } from "../types";

type ErrorResult = {
  class: string;
  message: string;
};

type UserResponse = {
  name: string;
  role: number;
};

type UserCreateResponse = {
  userId: string;
  request: any;
  result: UserResponse[] | null;
  error: ErrorResult | null;
};

export const createNewFoundryUser = async (
  username: string,
  password: string
): Promise<Response> => {
  const { foundry_url, foundry_username, foundry_password } = config;
  const url = new URL(foundry_url);

  let socket: FoundrySocket | null = null;

  // return {
  //   statusCode: 201,
  //   body: "User created",
  // };

  try {
    const sessionId = await authenticateFoundry(
      url,
      foundry_username,
      foundry_password
    );
    socket = await connectToFoundry(url, sessionId, true);

    const userResponse = (await asyncEmit(socket, "modifyDocument", {
      type: "User",
      action: "create",
      data: [
        {
          name: username,
          role: 1,
          _id: null,
          password: password,
          character: null,
          color: "#9fcc28",
          pronouns: "",
          hotbar: {},
          permissions: {},
          flags: {},
          _stats: {
            systemId: null,
            systemVersion: null,
            coreVersion: null,
            createdTime: null,
            modifiedTime: null,
            lastModifiedBy: null,
          },
        },
      ],
      options: {
        temporary: false,
        renderSheet: false,
        render: true,
      },
    })) as unknown;

    socket.disconnect();

    const userCreateResponse = userResponse as UserCreateResponse;

    if (userCreateResponse.error) {
      return {
        statusCode: 409,
        body: userCreateResponse.error.message,
      };
    }

    return {
      statusCode: 201,
      body: JSON.stringify(userCreateResponse.result),
    };
  } catch {
    return {
      statusCode: 500,
      body: "Failed to connect to Foundry",
    };
  } finally {
    if (socket) {
      socket.disconnect();
    }
  }
};

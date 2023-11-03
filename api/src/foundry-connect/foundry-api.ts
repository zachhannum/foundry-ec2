import * as io from "socket.io-client";
import type { EventsMap } from "./foundry-types";
import { asyncEmit } from "./socket-io-helpers";
import axios from "axios";

export type FoundrySocket = io.Socket<EventsMap, EventsMap>;

export type FoundryConnectOptions = {
  foundryUrl: URL;
  apiUsername: string;
  apiPassword: string;
};

export function connectToFoundry(
  url: URL,
  sessionId: string,
  keepAlive = false
) {
  return new Promise<FoundrySocket>((ful, rej) => {
    const socketIoUrl = new URL("./socket.io", url);
    const socket = io.io(socketIoUrl.origin, {
      upgrade: false,
      path: socketIoUrl.pathname,
      reconnection: keepAlive,
      reconnectionDelay: 1000,
      reconnectionAttempts: 3,
      reconnectionDelayMax: 5000,
      transports: ["websocket"],
      extraHeaders: {
        cookie: `session=${sessionId}`,
      },
      query: { session: sessionId },
    });

    socket.on("connect", async () => {
      ful(socket);
    });
    socket.on("connect_error", (e) => rej(e));
    // socket.onAny((name, ...args) => console.log("RECV", name));
  });
}

export async function authenticateFoundry(
  url: URL,
  username: string,
  password: string
) {
  const joinUrl = new URL("./join", url);
  // use axios
  const getJoin = await axios.get(url.toString(), {
    withCredentials: true,
  });

  // Get the session id from the cookie
  let sessionId: string | undefined;
  if (getJoin.headers["set-cookie"]) {
    const cookie = getJoin.headers["set-cookie"][0];
    sessionId = cookie?.split(";")[0]?.split("=")[1];
  }

  if (!sessionId) {
    throw new Error("session id not found");
  }

  const socket = await connectToFoundry(url, sessionId);
  const joinData = await asyncEmit(socket, "getJoinData");
  socket.disconnect();

  const userid = joinData.users?.find((x) => x.name === username)?._id;

  if (!userid) {
    throw new Error("user not found");
  }

  const postJoin = await axios(joinUrl.toString(), {
    method: "post",
    headers: {
      "content-type": "application/json",
      cookie: `session=${sessionId}`,
    },
    data: JSON.stringify({
      action: "join",
      adminKey: "",
      password,
      userid,
    }),
  });
  const postJoinResult = postJoin.data;
  if (postJoinResult.status !== "success") throw "err";
  return sessionId;
}

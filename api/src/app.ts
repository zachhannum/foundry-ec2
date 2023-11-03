import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import compressFilter from "./utils/compressFilter.util";
import { verifyKey } from "./endpoints/verify_key/verify_key";
import { createUser } from "./endpoints/user/user";

const app: Express = express();

console.log("Starting API server");

app.use(
  cors({
    // origin is given a array if we want to have multiple origins later
    origin: "*",
    credentials: true,
  })
);

console.log("CORS enabled")

app.use(express.json())

console.log("JSON enabled")

// Helmet is used to secure this app by configuring the http-header
app.use(helmet());

console.log("Helmet enabled")

// Compression is used to reduce the size of the response body
app.use(compression({ filter: compressFilter }));

console.log("Compression enabled")

app.get("/verify_key", (req: Request, res: Response) => {
  verifyKey(req, res);
});

console.log("Verify key enabled")

app.post("/user", (req: Request, res: Response) => {
    createUser(req, res);
});

console.log("Create user enabled")

export default app;

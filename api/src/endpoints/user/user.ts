import type { Request, Response } from "express";
import { verifyToken } from "../../auth/verify_token";
import { createNewFoundryUser } from "./create_user";

export const createUser = async (req: Request, res: Response) => {
  const tokenResult = verifyToken(req);

  if (tokenResult) {
    res.status(tokenResult.status).send(tokenResult.body);
    return;
  }

  const { name, password } = req.body;

  if (!name || !password) {
    res.status(400).send("Username and password are required");
  }

  const newUserResp = await createNewFoundryUser(
    name,
    password
  );

  res.status(newUserResp.statusCode).send(newUserResp.body);
};

import { verifyToken } from "../../auth/verify_token";
import type { Request, Response } from "express";

export const verifyKey = async (req: Request, res: Response) => {
  const tokenResult = verifyToken(req);

  if (tokenResult) {
    res.status(tokenResult.status).send(tokenResult.body);
  } else {
    res.status(200).send("OK");
  }
};

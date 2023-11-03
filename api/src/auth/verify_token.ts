import type {Request} from 'express';
import config from  '../config/config';

type TokenResult = {
  status: number;
  body: string;
};

/**
 * Verify that the token in the Authorization header matches the API key
 * @param apiKey API key to compare against
 * @param headers Headers from the API Gateway event
 * @returns undefined if the token is valid, otherwise a Response object
 * with the appropriate status code and body
 */
export const verifyToken = (
  request: Request
 ) : TokenResult | undefined => {
  const apiKey = config.api_key;
  // Get token from Authorization header
  // format is "Authorization: Bearer <token>"
  // or "Authorization: token <token>"
  const token = request.headers.authorization?.split(' ')[1];
  if (!token) {
    return {
      status: 401,
      body: 'Unauthorized',
    };
  }

  // Check if token is valid
  if (token !== apiKey) {
    return {
      status: 403,
      body: 'Forbidden',
    };
  }
  return undefined;
    
};

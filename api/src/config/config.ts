import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({
  path: path.resolve(__dirname, '../../.env'),
});

const config = {
  node_env: process.env.NODE_ENV,
  port: process.env.PORT,
  foundry_url: process.env.FOUNDRY_URL,
  foundry_username: process.env.FOUNDRY_USERNAME,
  foundry_password: process.env.FOUNDRY_PASSWORD,
  api_key: process.env.API_KEY,
};

export default config;

declare namespace NodeJS {
  interface ProcessEnv {
    readonly NODE_ENV: string;
    readonly PORT: string;
    readonly FOUNDRY_URL: string;
    readonly FOUNDRY_USERNAME: string;
    readonly FOUNDRY_PASSWORD: string;
    readonly API_KEY: string;
  }
}

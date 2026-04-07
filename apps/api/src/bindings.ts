export type Bindings = {
  DB: D1Database;
  IDEALISTA_API_KEY?: string;
  IDEALISTA_API_SECRET?: string;
  LLM_API_KEY: string;
  LLM_BASE_URL: string;
  LLM_MODEL: string;
  NOTIFICATION_EMAIL_FROM: string;
  NOTIFICATION_EMAIL_TO: string;
  SEND_EMAIL: SendEmail;
};

export type AppEnv = {
  Bindings: Bindings;
};

export type Bindings = {
  DB: D1Database;
  IDEALISTA_API_KEY: string;
  IDEALISTA_API_SECRET: string;
  ANTHROPIC_API_KEY: string;
  NOTIFICATION_EMAIL_FROM: string;
  NOTIFICATION_EMAIL_TO: string;
  SEND_EMAIL: SendEmail;
};

export type AppEnv = {
  Bindings: Bindings;
};

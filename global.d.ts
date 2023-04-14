declare namespace Express {
  export interface Request {
    user?: {
      userId: number;
      roleId: string;
      apiToken: {
        name: string;
        type: string;
        env: string;
      };
    };
  }
}

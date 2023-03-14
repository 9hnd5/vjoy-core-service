declare namespace Express {
  export interface Request {
    user?: {
      userId: number;
      roleCode: string;
      apiToken: {
        name: string;
        type: string;
        env: string;
      };
    };
  }
}

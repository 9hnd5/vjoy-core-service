declare namespace Express {
  export interface Request {
    user?: {
      userId: number;
      roleId: number;
      roleCode: string;
      apiTokenPayload: {
        name: string;
        type: string;
        env: string;
      };
    };
  }
}

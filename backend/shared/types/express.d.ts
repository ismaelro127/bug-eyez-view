import "express";

declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string;
      roles?: {
        admin?: boolean;
        premium?: boolean;
      };
    }

    interface Request {
      user: User;
    }
  }
}

export {};

import "express";
import { Types } from "mongoose";

declare global {
  namespace Express {
    interface User {
      _id: Types.ObjectId;
      email: string;
      roles: {
        admin: boolean;
        premium: boolean;
      };
    }

    interface Request {
      user: User;
    }
  }
}

export {};

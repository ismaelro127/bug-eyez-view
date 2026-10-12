import mongoose, { Document, Model, Schema } from "mongoose";

/* ---------- Subdocument ---------- */

interface CreditTxn {
  delta: number;
  reason: string;
  source?: string;
  createdAt: Date;
}

/* ---------- MAIN USER TYPE ---------- */

export interface UserDocument extends Document {
  email: string;
  passwordHash?: string;

  credits: number;
  creditLedger: CreditTxn[];

  lastAdRewardAt?: Date | null;

  roles: {
    admin: boolean;
    premium: boolean;
  };

  createdAt: Date;
}

/* ---------- SCHEMA ---------- */

const CreditTxnSchema = new Schema<CreditTxn>({
  delta: { type: Number, required: true },
  reason: { type: String, required: true },
  source: String,
  createdAt: { type: Date, default: Date.now },
});

const UserSchema = new Schema<UserDocument>({
  email: { type: String, unique: true, index: true },
  passwordHash: String,

  credits: { type: Number, default: 0 },

  creditLedger: [CreditTxnSchema],

  lastAdRewardAt: {
    type: Date,
    default: null,
  },

  roles: {
    admin: { type: Boolean, default: false },
    premium: { type: Boolean, default: false },
  },

  createdAt: { type: Date, default: Date.now },
});

/* ---------- MODEL ---------- */

const User: Model<UserDocument> =
  mongoose.models.User ||
  mongoose.model<UserDocument>("User", UserSchema);

export default User;

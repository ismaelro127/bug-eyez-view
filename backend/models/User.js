import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
    },

    username: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },

    displayName: {
      type: String,
      trim: true,
      default: "",
    },

    avatarUrl: {
      type: String,
      default: "",
    },

    provider: {
      type: String,
      enum: ["local", "google", "facebook", "apple", "github"],
      default: "local",
    },

    roles: {
      admin: { type: Boolean, default: false },
      premium: { type: Boolean, default: false },
    },

    emailVerified: {
      type: Boolean,
      default: false,
      index: true,
    },

    emailVerificationTokenHash: {
      type: String,
      default: null,
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
    },

    lastVerificationEmailAt: {
      type: Date,
      default: null,
    },

    lastAdRewardAt: {
      type: Date,
      default: null,
    },
 tokenVersion: {
  type: Number,
  default: 0,
},
  },
  
  {
    timestamps: true,
  }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
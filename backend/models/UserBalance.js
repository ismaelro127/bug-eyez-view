import mongoose from "mongoose";

const UserBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      index: true,
      required: true,
    },

    credits: {
      type: Number,
      default: 0,
      min: 0,
    },

    version: {
      type: Number,
      default: 0, // optimistic locking
    },
  },
  { timestamps: true }
);

export default mongoose.model("UserBalance", UserBalanceSchema);

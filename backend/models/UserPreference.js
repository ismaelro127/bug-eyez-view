import mongoose from "mongoose";
import userPreferencesRoutes from "../routes/userPreferences.js";

const UserPreferenceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },

    settings: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    favoriteChannelIds: {
      type: [String],
      default: [],
    },
  recentChannelIds: {
  type: [String],
  default: [],
},
},
  { timestamps: true }
);


export default mongoose.model("UserPreference", UserPreferenceSchema);
import mongoose from "mongoose";
import dotenv from "dotenv";
import UserBalance from "../models/UserBalance.js";

dotenv.config();

const email = process.argv[2];
const amount = Number(process.argv[3] || 500);

if (!email) {
  console.error("Usage: node scripts/devInspectAndAddCredits.js <email> <amount>");
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("Missing MONGO_URI or MONGODB_URI in backend .env");
  process.exit(1);
}

await mongoose.connect(mongoUri);

console.log("Connected DB:", mongoose.connection.name);

const users = mongoose.connection.db.collection("users");

const exactUser = await users.findOne({
  email: { $regex: `^${email}$`, $options: "i" },
});

if (!exactUser) {
  console.error(`No exact user found for email: ${email}`);
  console.log("Showing up to 10 users so you can find the right login:");

  const sampleUsers = await users
    .find({}, { projection: { email: 1, username: 1, name: 1 } })
    .limit(10)
    .toArray();

  console.log(sampleUsers);
  await mongoose.disconnect();
  process.exit(1);
}

console.log("Found user:", {
  id: exactUser._id.toString(),
  email: exactUser.email,
  username: exactUser.username,
  name: exactUser.name,
});

const before = await UserBalance.findOne({ userId: exactUser._id }).lean();

console.log("Balance before:", before?.credits ?? 0);

const after = await UserBalance.findOneAndUpdate(
  { userId: exactUser._id },
  {
    $inc: {
      credits: amount,
      version: 1,
    },
  },
  {
    upsert: true,
    new: true,
  }
);

console.log("Credits added:", amount);
console.log("Balance after:", after.credits);

await mongoose.disconnect();

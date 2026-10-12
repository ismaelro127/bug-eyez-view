import mongoose from "mongoose";
import dotenv from "dotenv";
import UserBalance from "../models/UserBalance.js";

dotenv.config();

const email = process.argv[2];
const amount = Number(process.argv[3] || 500);

if (!email) {
  console.error("Usage: node scripts/devAddCreditsByEmail.js <email> <amount>");
  process.exit(1);
}

if (!Number.isFinite(amount) || amount <= 0) {
  console.error("Amount must be a positive number.");
  process.exit(1);
}

const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;

if (!mongoUri) {
  console.error("Missing MONGO_URI or MONGODB_URI in backend .env");
  process.exit(1);
}

await mongoose.connect(mongoUri);

const usersCollection = mongoose.connection.db.collection("users");
const user = await usersCollection.findOne({
  email: { $regex: `^${email}$`, $options: "i" },
});

if (!user) {
  console.error(`No user found with email: ${email}`);
  await mongoose.disconnect();
  process.exit(1);
}

const balance = await UserBalance.findOneAndUpdate(
  { userId: user._id },
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

console.log("Credits added successfully.");
console.log({
  email: user.email,
  userId: user._id.toString(),
  added: amount,
  newBalance: balance.credits,
});

await mongoose.disconnect();

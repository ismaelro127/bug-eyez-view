import { CoinLedger } from "../models/CoinLedger";

export async function getUserBalance(userId) {
  const result = await CoinLedger.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: null,
        balance: { $sum: "$amount" },
      },
    },
  ]);

  return result[0]?.balance || 0;
}

import express from "express";
import Stripe from "stripe";
import { CREDIT_PACKAGES } from "../config/creditPackages.js";

const router = express.Router();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

router.post("/create-checkout", async (req, res) => {
  if (!stripe) {
    return res.status(503).json({
      error: "Payments are currently disabled",
    });
  }

  const userId = req.headers["x-user-id"];
  const { packageId } = req.body;

  if (!CREDIT_PACKAGES[packageId]) {
    return res.status(400).json({ error: "Invalid package" });
  }

  const pkg = CREDIT_PACKAGES[packageId];

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: pkg.priceCents,
            product_data: {
              name: `${pkg.credits} Credits`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        packageId,
      },
      success_url: `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    logger.error("Stripe checkout error:", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;

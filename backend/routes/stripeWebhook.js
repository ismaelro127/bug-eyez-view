import express from "express";
import Stripe from "stripe";

import { CREDIT_PACKAGES } from "../config/creditPackages.js";
import { mintCredits } from "../services/creditService.js";

const router = express.Router();

/**
 * Stripe init (safe)
 */
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    if (!stripe) {
      return res.status(503).send("Stripe disabled");
    }

    const sig = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      logger.error("❌ Stripe signature error:", err.message);
      return res.status(400).send("Invalid signature");
    }

    if (event.type !== "checkout.session.completed") {
      return res.json({ received: true });
    }

    const session = event.data.object;

    const userId = session.metadata?.userId;
    const packageId = session.metadata?.packageId;

    const paymentIntent = session.payment_intent;
    const paymentId =
      typeof paymentIntent === "string"
        ? paymentIntent
        : paymentIntent?.id;

    if (!userId || !packageId || !paymentId) {
      return res.status(400).send("Missing metadata");
    }

    if (!CREDIT_PACKAGES[packageId]) {
      return res.status(400).send("Invalid package");
    }

    const pkg = CREDIT_PACKAGES[packageId];

    if (session.amount_total !== pkg.priceCents) {
      return res.status(400).send("Amount mismatch");
    }

    try {
      await mintCredits({
        userId,
        amount: pkg.credits + (pkg.bonusCredits || 0),
        reason: "purchase",
        source: "stripe",
        refType: "stripe_payment",
        refId: paymentId,
        meta: {
          sessionId: session.id,
          amountPaid: session.amount_total,
        },
      });
    } catch (err) {
      logger.error("❌ Mint failed:", err);
      return res.status(500).send("Mint failed");
    }

    res.json({ ok: true });
  }
);

export default router;

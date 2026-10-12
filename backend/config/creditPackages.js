export const CREDIT_PACKAGES = {
  starter: {
    label: "Starter",
    priceCents: 499,
    credits: 500,
    bonusCredits: 0,
    currency: "usd",
    stripePriceId: process.env.STRIPE_PRICE_STARTER || "",
  },

  pro: {
    label: "Pro",
    priceCents: 999,
    credits: 1200,
    bonusCredits: 50,
    currency: "usd",
    stripePriceId: process.env.STRIPE_PRICE_PRO || "",
  },

  mega: {
    label: "Mega",
    priceCents: 1999,
    credits: 3000,
    bonusCredits: 200,
    currency: "usd",
    stripePriceId: process.env.STRIPE_PRICE_MEGA || "",
  },
};

export function isCreditPackageId(x) {
  return typeof x === "string" && x in CREDIT_PACKAGES;
}

export function creditsFor(pkg) {
  const p = CREDIT_PACKAGES[pkg];
  return p.credits + p.bonusCredits;
}

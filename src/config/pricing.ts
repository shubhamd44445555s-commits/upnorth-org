export const pricingTiers = [
  { id: 'free', name: 'Free', price: '$0', cadence: '/mo', summary: 'A simple way to be discovered up north.', features: ['Business name and category', 'Town and one photo', 'Short description'], cta: 'Get Started' },
  { id: 'enhanced', name: 'Enhanced', price: '$39', cadence: '/mo', summary: 'More detail, more visibility, and direct contact.', features: ['Everything in Free', 'Full photo gallery', 'Priority category placement', 'Phone and website links'], cta: 'Get Started' },
  { id: 'featured', name: 'Featured', price: '$149', cadence: '/mo', summary: 'Top-of-category placement for businesses people remember.', features: ['Everything in Enhanced', 'Homepage carousel placement', 'Top-of-category placement', 'Featured badge'], cta: 'Get Started' },
]

// TODO before launch: create real Products/Prices in dashboard.stripe.com and set these IDs.
export const stripeConfig = {
  secretKey: typeof process !== 'undefined' ? process.env?.STRIPE_SECRET_KEY : undefined,
  priceIds: {
    enhanced: typeof process !== 'undefined' ? process.env?.STRIPE_PRICE_ENHANCED : undefined,
    featured: typeof process !== 'undefined' ? process.env?.STRIPE_PRICE_FEATURED : undefined,
  },
}

export function createCheckoutPlaceholder(tierId) {
  const priceId = stripeConfig.priceIds[tierId]
  if (stripeConfig.secretKey && priceId) {
    // TODO: replace with stripe.checkout.sessions.create({ line_items: [{ price: priceId }] }).
    return { mode: 'ready', priceId }
  }
  return { mode: 'demo', mailto: 'mailto:business@upnorth.org?subject=UpNorth.org%20listing' }
}

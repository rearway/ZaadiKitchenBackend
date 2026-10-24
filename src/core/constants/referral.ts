/** Friend discount on their first plan, and the referrer's wallet reward. */
export const REFERRAL_FRIEND_DISCOUNT_PCT = 15
export const REFERRAL_REWARD_RATE_PCT = 10

export function referralFriendDiscountSar(priceSar: number): number {
  return Math.round(priceSar * (REFERRAL_FRIEND_DISCOUNT_PCT / 100))
}

export function referralRewardSar(priceSar: number): number {
  return Math.round(priceSar * (REFERRAL_REWARD_RATE_PCT / 100))
}

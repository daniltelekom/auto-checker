import { isSupabaseConfigured, supabase } from './supabase'

export type ListingHistoryResult = {
  daysOnMarket: number
  priceChanges: number
  avgMarketPrice: number | null | undefined
  isOverpriced: boolean
  isUnderpriced: boolean
}

export async function checkHistory(
  url: string,
  price: number | null
): Promise<ListingHistoryResult | null> {
  if (!url || !isSupabaseConfigured() || !supabase) return null

  if (price) {
    const { error: insertError } = await supabase
      .from('listing_history')
      .insert({ url, price })

    if (insertError) {
      console.error('[listingHistory] insert failed:', insertError)
    }
  }

  const { data, error } = await supabase
    .from('listing_history')
    .select('price, checked_at')
    .eq('url', url)
    .order('checked_at', { ascending: true })

  if (error) {
    console.error('[listingHistory] select failed:', error)
    return null
  }

  if (!data || data.length === 0) return null

  const firstCheck = new Date(data[0]!.checked_at)
  const daysOnMarket = Math.floor((Date.now() - firstCheck.getTime()) / 86400000)

  const prices = data.map((d) => d.price).filter(Boolean) as number[]
  const priceChanges =
    prices.length > 1 ? prices[prices.length - 1]! - prices[0]! : 0

  const avgMarketPrice =
    prices.length > 0
      ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
      : price

  return {
    daysOnMarket,
    priceChanges,
    avgMarketPrice,
    isOverpriced: price ? price > (avgMarketPrice ?? 0) * 1.15 : false,
    isUnderpriced: price ? price < (avgMarketPrice ?? 0) * 0.85 : false,
  }
}

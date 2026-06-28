import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import { ProxyAgent } from 'proxy-agent';

const PROXIES = [
  process.env.PROXY_1 || '',
  process.env.PROXY_2 || '',
  process.env.PROXY_3 || '',
  process.env.PROXY_4 || '',
  process.env.PROXY_5 || '',
  process.env.PROXY_6 || '',
].filter(p => p);

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

export interface ListingData {
  url: string;
  price: number | null;
  title: string;
  year: number | null;
  mileage: number | null;
  description: string;
  photos: string[];
  seller: string;
  phone: string | null;
  source: 'avito' | 'auto.ru' | 'drom' | 'unknown';
}

function getRandomProxyAgent(): ProxyAgent | undefined {
  if (PROXIES.length === 0) return undefined;
  const proxy = PROXIES[Math.floor(Math.random() * PROXIES.length)]!;
  return new ProxyAgent(proxy as ConstructorParameters<typeof ProxyAgent>[0]);
}

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]!;
}

async function fetchHtml(url: string): Promise<string> {
  const isAvito = url.includes('avito.ru');
  const isDrom = url.includes('drom.ru');

  try {
    const agent = getRandomProxyAgent();
    if (agent) {
      const response = await fetch(url, {
        agent: agent,
        headers: {
          'User-Agent': getRandomUserAgent(),
          'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Cache-Control': 'max-age=0',
          'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'Sec-Ch-Ua-Mobile': '?0',
          'Sec-Ch-Ua-Platform': '"Windows"',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Sec-Fetch-User': '?1',
          'Upgrade-Insecure-Requests': '1',
          ...(isAvito && {
            'Referer': 'https://www.avito.ru/',
          }),
          ...(isDrom && {
            'Referer': 'https://www.drom.ru/',
          }),
        },
      } as any);

      if (response.ok) {
        return await response.text();
      }
    }
  } catch (error) {
    console.log('Proxy failed, trying without proxy...');
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept-Language': 'ru-RU,ru;q=0.9',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.text();
}

function extractParams($: cheerio.CheerioAPI): Record<string, string> {
  const params: Record<string, string> = {};

  // Авито
  $('[data-marker="item-params"] li, .item-params li').each((_, el) => {
    const text = $(el).text().trim();
    const parts = text.split(/—|:/);
    if (parts.length >= 2 && parts[0]) {
      params[parts[0].trim()] = parts.slice(1).join('').trim();
    }
  });

  // Авто.ру
  $('.CardInfoBlock li, [data-marker="params-list"] li').each((_, el) => {
    const text = $(el).text().trim();
    const parts = text.split(/—|:/);
    if (parts.length >= 2 && parts[0]) {
      params[parts[0].trim()] = parts.slice(1).join('').trim();
    }
  });

  // Дром
  $('.b-info-list li, [data-name="param"]').each((_, el) => {
    const text = $(el).text().trim();
    const parts = text.split(/—|:/);
    if (parts.length >= 2 && parts[0]) {
      params[parts[0].trim()] = parts.slice(1).join('').trim();
    }
  });

  return params;
}

function extractPhotos($: cheerio.CheerioAPI): string[] {
  const photos: string[] = [];

  // Авито
  $('[data-marker="gallery-img"] img, .gallery-img img').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && src.startsWith('http')) photos.push(src);
  });

  // Авто.ру
  $('.CarouselImage img, [data-marker="gallery-img"] img').each((_, el) => {
    const src = $(el).attr('src');
    if (src && src.startsWith('http')) photos.push(src);
  });

  // Дром
  $('.b-gallery__item img, [data-name="photo"]').each((_, el) => {
    const src = $(el).attr('src') || $(el).attr('data-src');
    if (src && src.startsWith('http')) photos.push(src);
  });

  return [...new Set(photos)]; // убираем дубликаты
}

export async function parseAvito(url: string): Promise<ListingData | null> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    const titleText = $('title').text().toLowerCase();
    if (html.includes('captcha') || titleText.includes('403') || titleText.includes('captcha')) {
      console.log('Avito returned captcha/403 page, trying alternative approach...');
    }

    const priceText =
      $('[data-marker="item-price"]').text().trim() ||
      $('[data-marker="price"]').text().trim() ||
      $('[itemprop="price"]').text().trim() ||
      $('.price').text().trim();
    const price = parseInt(priceText.replace(/\D/g, '')) || null;

    const title =
      $('h1').text().trim() ||
      $('[data-marker="item-title"]').text().trim() ||
      $('[itemprop="name"]').text().trim();

    const description =
      $('[data-marker="item-description"]').text().trim() ||
      $('[data-marker="description"]').text().trim() ||
      $('[itemprop="description"]').text().trim();

    const params: Record<string, string> = {};
    $('[data-marker="item-params"] li, .item-params li, [data-marker="params-list"] li').each((_, el) => {
      const text = $(el).text().trim();
      const parts = text.split(/—|:/);
      if (parts.length >= 2 && parts[0]) {
        params[parts[0].trim()] = parts.slice(1).join('').trim();
      }
    });

    const year = params['Год выпуска'] ? parseInt(params['Год выпуска']) : null;
    const mileage = params['Пробег'] ? parseInt(params['Пробег'].replace(/\D/g, '')) : null;

    const photos: string[] = [];
    $('[data-marker="gallery-img"] img, .gallery-img img, [itemprop="image"]').each((_, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.startsWith('http')) photos.push(src);
    });

    const seller =
      $('[data-marker="seller-name"]').text().trim() ||
      $('[itemprop="seller"]').text().trim() ||
      'Частное лицо';

    if (title || description || price) {
      return {
        url, price, title, year, mileage,
        description: `${title}\n\n${description}\n\n${Object.entries(params).map(([k, v]) => `${k}: ${v}`).join('\n')}`,
        photos, seller, phone: null, source: 'avito',
      };
    }

    return null;
  } catch (error) {
    console.error('Avito parse error:', error);
    return null;
  }
}

export async function parseAutoRu(url: string): Promise<ListingData | null> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    if (html.includes('captcha') || $('title').text().includes('403')) {
      throw new Error('Blocked by Auto.ru');
    }

    const priceText = $('.OfferPriceCaption__price').text().trim() ||
                      $('[data-marker="price"]').text().trim();
    const price = parseInt(priceText.replace(/\D/g, '')) || null;

    const title = $('h1').text().trim() || $('.OfferTitle').text().trim();
    const description = $('.CardDescription__text').text().trim() ||
                        $('[data-marker="description"]').text().trim();

    const params = extractParams($);
    const year = params['Год выпуска'] ? parseInt(params['Год выпуска']) : null;
    const mileage = params['Пробег'] ? parseInt(params['Пробег'].replace(/\D/g, '')) : null;
    const photos = extractPhotos($);
    const seller = $('.OfferSellerName').text().trim() || 'Частное лицо';

    return {
      url, price, title, year, mileage,
      description: `${title}\n\n${description}\n\n${Object.entries(params).map(([k, v]) => `${k}: ${v}`).join('\n')}`,
      photos, seller, phone: null, source: 'auto.ru',
    };
  } catch (error) {
    console.error('AutoRu parse error:', error);
    return null;
  }
}

export async function parseDrom(url: string): Promise<ListingData | null> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    if (html.includes('captcha') || $('title').text().includes('403')) {
      throw new Error('Blocked by Drom');
    }

    const priceText = $('[data-name="price"]').text().trim() ||
                      $('.b-price').text().trim();
    const price = parseInt(priceText.replace(/\D/g, '')) || null;

    const title = $('h1').text().trim() || $('.b-title').text().trim();
    const description = $('.b-pageBlock_content').text().trim() ||
                        $('.description').text().trim();

    const params = extractParams($);
    const year = params['Год выпуска'] ? parseInt(params['Год выпуска']) : null;
    const mileage = params['Пробег'] ? parseInt(params['Пробег'].replace(/\D/g, '')) : null;
    const photos = extractPhotos($);
    const seller = $('.b-seller-name').text().trim() || 'Частное лицо';

    return {
      url, price, title, year, mileage,
      description: `${title}\n\n${description}\n\n${Object.entries(params).map(([k, v]) => `${k}: ${v}`).join('\n')}`,
      photos, seller, phone: null, source: 'drom',
    };
  } catch (error) {
    console.error('Drom parse error:', error);
    return null;
  }
}

export async function fetchListing(url: string): Promise<ListingData | null> {
  if (!url) return null;

  try {
    if (url.includes('avito.ru')) return await parseAvito(url);
    if (url.includes('auto.ru')) return await parseAutoRu(url);
    if (url.includes('drom.ru')) return await parseDrom(url);

    return null;
  } catch (error) {
    console.error('Fetch listing error:', error);
    return null;
  }
}

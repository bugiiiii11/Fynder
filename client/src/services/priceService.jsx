//client/src/services/priceService.jsx
import dummyMemes from '../data/dummyMemes';

class PriceService {
  constructor() {
    // Determine if we're in Telegram
    const isTelegram = !!window.Telegram?.WebApp;
    
    // Always use CoinGecko API in Telegram or production
    this.baseUrl = isTelegram || import.meta.env.VITE_ENV === 'production'
      ? 'https://api.coingecko.com/api/v3'
      : 'http://localhost:3001/api/coingecko';
    
    console.log('Price service base URL:', this.baseUrl);
    
    this.uniqueTokens = {
      'pepe': ['1', '2', '4'],
      'peanut-the-squirrel': ['3', '5', '6', '7', '9'],
      'popcat': ['8', '10', '11', '12', '13', '14'],
      'shiba-inu': ['15'],
      'bonk': ['16'],
      'dogwifcoin': ['17'],
      'floki': ['18'],
      'based-brett': ['19'],
      'goatseus-maximus': ['20']
    };
    
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache timeout
    this.retryDelay = 5000; // 5 seconds between retries
    this.maxRetries = 3;
  }
  
  async initializeData() {
    console.log('Starting price data initialization...');
    
    for (let retry = 0; retry < this.maxRetries; retry++) {
      try {
        const tokenIds = Object.keys(this.uniqueTokens).join(',');
        const isTelegram = !!window.Telegram?.WebApp;
        
        console.log('Fetching data for tokens:', tokenIds);
        console.log('Is Telegram WebApp:', isTelegram);

        const params = new URLSearchParams({
          ids: tokenIds,
          vs_currencies: 'usd',
          include_24hr_change: 'true',
          include_market_cap: 'true'
        });

        const url = `${this.baseUrl}/simple/price?${params}`;
        console.log('Fetching from:', url);

        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('Successfully received price data');

        this.updateCache(data);
        return true;

      } catch (error) {
        console.error(`Attempt ${retry + 1}/${this.maxRetries} failed:`, error);
        
        if (retry === this.maxRetries - 1) {
          console.log('All retries failed, loading fallback data');
          this.loadFallbackData();
          return false;
        }

        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  updateCache(data) {
    const now = Date.now();
    
    Object.entries(data).forEach(([tokenId, tokenData]) => {
      const formatted = {
        price: this.formatPrice(tokenData.usd),
        marketCap: this.formatMarketCap(tokenData.usd_market_cap),
        priceChange24h: this.formatPriceChange(tokenData.usd_24h_change),
        timestamp: now
      };

      this.uniqueTokens[tokenId]?.forEach(memeId => {
        this.cache.set(memeId, {
          data: formatted,
          timestamp: now
        });
      });
    });

    console.log('Cache updated at:', new Date(now).toLocaleTimeString());
  }

  loadFallbackData() {
    console.log('Loading fallback data from dummyMemes');
    const now = Date.now();
    
    dummyMemes.forEach(meme => {
      if (meme?.projectDetails) {
        this.cache.set(meme.id.toString(), {
          data: {
            price: meme.projectDetails.price,
            marketCap: meme.projectDetails.marketCap,
            priceChange24h: meme.projectDetails.priceChange24h || 0,
            timestamp: now,
            isFallback: true
          },
          timestamp: now
        });
      }
    });
  }

  getTokenDataByMemeId(memeId) {
    const cached = this.cache.get(memeId?.toString());
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    // If cache is expired or missing, get fallback data
    return this.getFallbackDataForMemeId(memeId);
  }

  getFallbackDataForMemeId(memeId) {
    const meme = dummyMemes.find(m => m.id === Number(memeId));
    
    if (meme?.projectDetails) {
      return {
        price: meme.projectDetails.price,
        marketCap: meme.projectDetails.marketCap,
        priceChange24h: Number(meme.projectDetails.priceChange24h) || 0,
        timestamp: Date.now(),
        isFallback: true
      };
    }

    return {
      price: '0.00',
      marketCap: '0',
      priceChange24h: 0,
      timestamp: Date.now(),
      isFallback: true
    };
  }

  formatPrice(price) {
    if (!price) return '0.00';
    const numPrice = typeof price === 'string' ? Number(price) : price;
    if (isNaN(numPrice)) return '0.00';
    if (numPrice < 0.0001) return numPrice.toFixed(8);
    if (numPrice < 0.01) return numPrice.toFixed(6);
    if (numPrice < 1) return numPrice.toFixed(4);
    return numPrice.toFixed(2);
  }

  formatPriceChange(change) {
    if (!change) return 0;
    return Number(Number(change).toFixed(2));
  }

  formatMarketCap(value) {
    if (!value) return '0';
    const num = Number(value);
    if (isNaN(num)) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return value.toFixed(2);
  }
}

const priceService = new PriceService();
export { priceService };
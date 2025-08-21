// frontend/src/utils/imageUtils.js - CLEAN VERSION - No Demo Logic

// CORS-friendly IPFS gateways (in order of reliability)
export const CORS_SAFE_GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cf-ipfs.com/ipfs/',
  'https://ipfs.infura.io/ipfs/'
];

// Fallback images for each category
export const FALLBACK_IMAGES = {
  'Rice Cultivation': 'https://images.unsplash.com/photo-1596422846543-75c6fc197f06?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&cs=tinysrgb',
  'Fruit Cultivation': 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&cs=tinysrgb',
  'Vegetable Cultivation': 'https://images.unsplash.com/photo-1596124579925-2beb6db8621b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&cs=tinysrgb',
  'Livestock': 'https://images.unsplash.com/photo-1534337621606-e3dcc5fdc4b4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&cs=tinysrgb',
  'Fisheries': 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&cs=tinysrgb',
  'Agroforestry': 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&cs=tinysrgb',
  'Poultry': 'https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&cs=tinysrgb',
  'Dairy Farming': 'https://images.unsplash.com/photo-1560493676-04071c5f467b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&cs=tinysrgb'
};

// Default fallback image
export const DEFAULT_FALLBACK = 'https://images.unsplash.com/photo-1596422846543-75c6fc197f06?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80&cs=tinysrgb';

/**
 * Test if an image URL is accessible without CORS issues
 * @param {string} url - Image URL to test
 * @returns {Promise<boolean>} - Whether the image loads successfully
 */
export const testImageLoad = (url) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    const timeout = setTimeout(() => {
      resolve(false);
    }, 5000); // 5 second timeout
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = url;
  });
};

/**
 * Check if IPFS hash is valid
 * @param {string} ipfsHash - IPFS hash to validate
 * @returns {boolean} - Whether the hash appears valid
 */
export const isValidIPFSHash = (ipfsHash) => {
  if (!ipfsHash || typeof ipfsHash !== 'string') return false;
  
  // Basic IPFS hash validation
  // Should start with Qm and be at least 46 characters for CIDv0
  // Or start with b and be longer for CIDv1
  if (ipfsHash.startsWith('Qm') && ipfsHash.length >= 46) return true;
  if (ipfsHash.startsWith('b') && ipfsHash.length >= 50) return true;
  if (ipfsHash.startsWith('f') && ipfsHash.length >= 50) return true;
  
  return false;
};

/**
 * Get CORS-safe image URL with fallbacks
 * @param {string} ipfsHash - IPFS hash of the image
 * @param {string} category - Project category for fallback
 * @returns {Promise<string>} - Working image URL
 */
export const getCORSSafeImageUrl = async (ipfsHash, category = 'Rice Cultivation') => {
  // If no IPFS hash or invalid hash, return category fallback immediately
  if (!isValidIPFSHash(ipfsHash)) {
    return FALLBACK_IMAGES[category] || DEFAULT_FALLBACK;
  }

  // Try CORS-safe IPFS gateways
  for (const gateway of CORS_SAFE_GATEWAYS) {
    const url = `${gateway}${ipfsHash}`;
    const isWorking = await testImageLoad(url);
    
    if (isWorking) {
      console.log(`Using IPFS gateway: ${gateway} for ${ipfsHash}`);
      return url;
    }
  }

  // If all IPFS gateways fail, return category fallback
  console.warn(`All IPFS gateways failed for ${ipfsHash}, using fallback`);
  return FALLBACK_IMAGES[category] || DEFAULT_FALLBACK;
};

/**
 * Get image URL synchronously for immediate use
 * @param {string} ipfsHash - IPFS hash
 * @param {string} category - Project category
 * @returns {string} - Immediate fallback URL or IPFS URL
 */
export const getImageUrlSync = (ipfsHash, category = 'Rice Cultivation') => {
  // For invalid hashes, return fallback immediately
  if (!isValidIPFSHash(ipfsHash)) {
    return FALLBACK_IMAGES[category] || DEFAULT_FALLBACK;
  }

  // For valid IPFS hashes, try the most reliable gateway first
  return `${CORS_SAFE_GATEWAYS[0]}${ipfsHash}`;
};

/**
 * Preload images to avoid loading delays
 * @param {Array<string>} urls - Array of image URLs to preload
 */
export const preloadImages = (urls) => {
  urls.forEach(url => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    link.as = 'image';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  });
};

/**
 * Enhanced image loading with retry logic
 */
export class ImageLoader {
  constructor() {
    this.cache = new Map();
    this.loading = new Set();
  }

  async loadImage(ipfsHash, category) {
    const cacheKey = `${ipfsHash}-${category}`;
    
    // Return cached result
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // Prevent multiple simultaneous loads
    if (this.loading.has(cacheKey)) {
      return new Promise((resolve) => {
        const checkCache = () => {
          if (this.cache.has(cacheKey)) {
            resolve(this.cache.get(cacheKey));
          } else {
            setTimeout(checkCache, 100);
          }
        };
        checkCache();
      });
    }

    this.loading.add(cacheKey);

    try {
      const url = await getCORSSafeImageUrl(ipfsHash, category);
      this.cache.set(cacheKey, url);
      return url;
    } catch (error) {
      const fallback = FALLBACK_IMAGES[category] || DEFAULT_FALLBACK;
      this.cache.set(cacheKey, fallback);
      return fallback;
    } finally {
      this.loading.delete(cacheKey);
    }
  }

  clearCache() {
    this.cache.clear();
  }
}

// Global image loader instance
export const imageLoader = new ImageLoader();
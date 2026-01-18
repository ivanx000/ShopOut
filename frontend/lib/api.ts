// API client for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Session cache utilities
const CACHE_PREFIX = 'api_cache_';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

function getCacheKey(endpoint: string, params: any): string {
  return `${CACHE_PREFIX}${endpoint}_${JSON.stringify(params)}`;
}

function getFromCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(key);
    if (!cached) return null;
    
    const entry: CacheEntry<T> = JSON.parse(cached);
    
    // Check if cache is still valid (within 24 hours)
    if (Date.now() - entry.timestamp > CACHE_EXPIRY) {
      sessionStorage.removeItem(key);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.error('Error reading from cache:', error);
    return null;
  }
}

function saveToCache<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return;
  
  try {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now()
    };
    sessionStorage.setItem(key, JSON.stringify(entry));
  } catch (error) {
    console.error('Error saving to cache:', error);
  }
}

export interface Product {
  name: string;
  reason: string;
  category: string;
}

export interface RecommendationResponse {
  vibe_analysis: string;
  products: Product[];
  user_id?: string;
  mode?: string;
}

// User ID management
function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('user_id');
}

function saveUserId(userId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('user_id', userId);
  console.log('Saved user_id to localStorage:', userId);
}

export async function getRecommendations(vibe: string, userPreference?: string): Promise<RecommendationResponse> {
  const userId = getUserId();
  const cacheKey = getCacheKey('recommend', { vibe, userId });
  
  // Check cache first
  const cached = getFromCache<RecommendationResponse>(cacheKey);
  if (cached) {
    console.log('Returning cached recommendations for vibe:', vibe);
    return cached;
  }
  
  console.log(`Making API call to ${API_BASE_URL}/recommend with vibe:`, vibe, 'user_id:', userId);
  
  const requestBody: any = { vibe };
  if (userId) requestBody.user_id = userId;
  if (userPreference) requestBody.user_preference = userPreference;
  
  const response = await fetch(`${API_BASE_URL}/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include', // Include cookies
    body: JSON.stringify(requestBody),
  });

  console.log("API response status:", response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get recommendations' }));
    console.error("API error:", error);
    throw new Error(error.detail || 'Failed to get recommendations');
  }

  const data = await response.json();
  console.log("API response data:", data);
  
  // Save user_id if returned
  if (data.user_id) {
    saveUserId(data.user_id);
  }
  
  // Save to cache
  saveToCache(cacheKey, data);
  
  return data;
}

export interface SearchProduct {
  title: string;
  price: number;
  currency: string;
  url: string;
  image: string;
  platform: string;
  rating?: string;
  condition?: string;
  source?: string;
  reviews?: string;
}

export interface ProductSearchResponse {
  success: boolean;
  search_term: string;
  total_results: number;
  products: SearchProduct[];
}

export async function searchProducts(productName: string, maxResults: number = 10): Promise<ProductSearchResponse> {
  const cacheKey = getCacheKey('search-products', { product_name: productName, max_results: maxResults });
  
  // Check cache first
  const cached = getFromCache<ProductSearchResponse>(cacheKey);
  if (cached) {
    console.log('Returning cached product search for:', productName);
    return cached;
  }
  
  console.log(`Searching for products: ${productName}`);
  
  const response = await fetch(`${API_BASE_URL}/search-products`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ product_name: productName, max_results: maxResults }),
  });

  console.log("Product search response status:", response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to search products' }));
    console.error("Product search error:", error);
    throw new Error(error.detail || 'Failed to search products');
  }

  const data = await response.json();
  console.log("Product search data:", data);
  
  // Save to cache
  saveToCache(cacheKey, data);
  
  return data;
}

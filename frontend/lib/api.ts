// API client for backend communication

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Product {
  name: string;
  reason: string;
  category: string;
}

export interface RecommendationResponse {
  vibe_analysis: string;
  products: Product[];
}

export async function getRecommendations(vibe: string): Promise<RecommendationResponse> {
  console.log(`Making API call to ${API_BASE_URL}/recommend with vibe:`, vibe);
  
  const response = await fetch(`${API_BASE_URL}/recommend`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ vibe }),
  });

  console.log("API response status:", response.status);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to get recommendations' }));
    console.error("API error:", error);
    throw new Error(error.detail || 'Failed to get recommendations');
  }

  const data = await response.json();
  console.log("API response data:", data);
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
  return data;
}

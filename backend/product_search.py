"""
Multi-Platform Product Search Aggregator
Searches across Amazon, eBay, Google Shopping, and more
"""

import requests
import json
import hashlib
import os
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed


class ProductSearchAggregator:
    def __init__(self, cache_dir: str = "cache", cache_hours: int = 24):
        # API keys (set these as environment variables or pass them in)
        self.ebay_app_id = os.getenv("EBAY_APP_ID")
        self.rapidapi_key = os.getenv("RAPIDAPI_KEY")
        self.serpapi_key = os.getenv("SERPAPI_KEY")
        
        # Cache settings
        self.cache_dir = cache_dir
        self.cache_hours = cache_hours
        
        # Create cache directory if it doesn't exist
        if not os.path.exists(self.cache_dir):
            os.makedirs(self.cache_dir)
            print(f"📁 Created cache directory: {self.cache_dir}")
        
    def _get_cache_key(self, keyword: str, max_results: int) -> str:
        """Generate a unique cache key for the search"""
        cache_string = f"{keyword.lower()}_{max_results}"
        return hashlib.md5(cache_string.encode()).hexdigest()
    
    def _get_cache_path(self, keyword: str, max_results: int) -> str:
        """Get the file path for cached results"""
        cache_key = self._get_cache_key(keyword, max_results)
        return os.path.join(self.cache_dir, f"{cache_key}.json")
    
    def _load_from_cache(self, keyword: str, max_results: int) -> Optional[List[Dict]]:
        """Load results from cache if available and not expired"""
        cache_path = self._get_cache_path(keyword, max_results)
        
        if not os.path.exists(cache_path):
            return None
        
        try:
            with open(cache_path, 'r') as f:
                cached_data = json.load(f)
            
            # Check if cache is expired
            cached_time = datetime.fromisoformat(cached_data['timestamp'])
            expiry_time = cached_time + timedelta(hours=self.cache_hours)
            
            if datetime.now() > expiry_time:
                print(f"⏰ Cache expired for '{keyword}' (cached {self.cache_hours}h ago)")
                return None
            
            print(f"💾 Loaded {len(cached_data['results'])} results from cache (saved {(datetime.now() - cached_time).seconds // 60} minutes ago)")
            return cached_data['results']
            
        except Exception as e:
            print(f"⚠ Error loading cache: {str(e)}")
            return None
    
    def _save_to_cache(self, keyword: str, max_results: int, results: List[Dict]):
        """Save results to cache"""
        cache_path = self._get_cache_path(keyword, max_results)
        
        try:
            cache_data = {
                'keyword': keyword,
                'max_results': max_results,
                'timestamp': datetime.now().isoformat(),
                'results': results
            }
            
            with open(cache_path, 'w') as f:
                json.dump(cache_data, f, indent=2)
            
            print(f"💾 Cached {len(results)} results for '{keyword}'")
            
        except Exception as e:
            print(f"⚠ Error saving to cache: {str(e)}")
    
    def search_all(self, keyword: str, max_results: int = 10, use_cache: bool = True) -> List[Dict]:
        """Search across all platforms and aggregate results"""
        # Try to load from cache first
        if use_cache:
            cached_results = self._load_from_cache(keyword, max_results)
            if cached_results is not None:
                return cached_results
        
        results = []
        
        # Use threading to search platforms in parallel
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = {
                executor.submit(self.search_ebay, keyword, max_results): "eBay",
                executor.submit(self.search_amazon_rapidapi, keyword, max_results): "Amazon",
                executor.submit(self.search_google_shopping, keyword, max_results): "Google Shopping",
            }
            
            for future in as_completed(futures):
                platform = futures[future]
                try:
                    platform_results = future.result()
                    results.extend(platform_results)
                    print(f"✓ Found {len(platform_results)} results from {platform}")
                except Exception as e:
                    print(f"✗ Error searching {platform}: {str(e)}")
        
        # Save to cache
        if use_cache and results:
            self._save_to_cache(keyword, max_results, results)
        
        return results
    
    def search_ebay(self, keyword: str, max_results: int = 10) -> List[Dict]:
        """Search eBay using their Finding API (free tier available)"""
        if not self.ebay_app_id:
            print("⚠ eBay API key not set, skipping...")
            return []
        
        url = "https://svcs.ebay.com/services/search/FindingService/v1"
        params = {
            "OPERATION-NAME": "findItemsByKeywords",
            "SERVICE-VERSION": "1.0.0",
            "SECURITY-APPNAME": self.ebay_app_id,
            "RESPONSE-DATA-FORMAT": "JSON",
            "keywords": keyword,
            "paginationInput.entriesPerPage": max_results,
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        results = []
        items = data.get("findItemsByKeywordsResponse", [{}])[0].get("searchResult", [{}])[0].get("item", [])
        
        for item in items:
            results.append({
                "title": item.get("title", [""])[0],
                "price": float(item.get("sellingStatus", [{}])[0].get("currentPrice", [{}])[0].get("__value__", 0)),
                "currency": item.get("sellingStatus", [{}])[0].get("currentPrice", [{}])[0].get("@currencyId", "USD"),
                "url": item.get("viewItemURL", [""])[0],
                "image": item.get("galleryURL", [""])[0],
                "platform": "eBay",
                "condition": item.get("condition", [{}])[0].get("conditionDisplayName", [""])[0],
            })
        
        return results
    
    def search_amazon_rapidapi(self, keyword: str, max_results: int = 10) -> List[Dict]:
        """Search Amazon using RapidAPI's Real-Time Product Search"""
        if not self.rapidapi_key:
            print("⚠ RapidAPI key not set, skipping Amazon...")
            return []
        
        url = "https://real-time-product-search.p.rapidapi.com/search"
        headers = {
            "X-RapidAPI-Key": self.rapidapi_key,
            "X-RapidAPI-Host": "real-time-product-search.p.rapidapi.com"
        }
        params = {
            "q": keyword,
            "country": "us",
            "language": "en",
            "limit": max_results
        }
        
        response = requests.get(url, headers=headers, params=params)
        data = response.json()
        
        results = []
        for item in data.get("data", []):
            results.append({
                "title": item.get("product_title", ""),
                "price": float(item.get("product_price", "0").replace("$", "").replace(",", "")),
                "currency": "USD",
                "url": item.get("product_url", ""),
                "image": item.get("product_photo", ""),
                "platform": "Amazon",
                "rating": item.get("product_star_rating", ""),
            })
        
        return results
    
    def search_google_shopping(self, keyword: str, max_results: int = 10) -> List[Dict]:
        """Search Google Shopping using SerpAPI"""
        if not self.serpapi_key:
            print("⚠ SerpAPI key not set, skipping Google Shopping...")
            return []
        
        url = "https://serpapi.com/search"
        params = {
            "engine": "google_shopping",
            "q": keyword,
            "api_key": self.serpapi_key,
            "num": max_results,
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        results = []
        for item in data.get("shopping_results", []):
            price_str = item.get("price", "$0").replace("$", "").replace(",", "")
            try:
                price = float(price_str)
            except:
                price = 0.0
            
            results.append({
                "title": item.get("title", ""),
                "price": price,
                "currency": "USD",
                "url": item.get("product_link", ""),
                "image": item.get("thumbnail", ""),
                "platform": "Google Shopping",
                "source": item.get("source", ""),
                "rating": item.get("rating", ""),
                "reviews": item.get("reviews", ""),
            })
        
        return results

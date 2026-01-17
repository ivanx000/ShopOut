import os
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.generativeai as genai
from dotenv import load_dotenv
from product_search import ProductSearchAggregator
from typing import List, Dict

# 1. Load Environment Variables
load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("GEMINI_API_KEY not found in .env file")

# 2. Configure Gemini
genai.configure(api_key=api_key)
# Try different models to avoid rate limits
# gemini-pro is the standard model with separate quota limits
model = genai.GenerativeModel('gemini-2.5-flash-lite')
print("Using model: gemini-pro")

app = FastAPI(title="Vibe-to-Product API")

# 3. Setup CORS
# This allows your Next.js frontend (port 3000) to talk to this API (port 8000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Define Data Models
class VibeRequest(BaseModel):
    # Added basic validation: must be at least 3 characters
    vibe: str = Field(..., min_length=3, example="I want to feel more confident at work")

@app.get("/")
async def root():
    return {
        "message": "Vibe-to-Product API is online",
        "endpoints": {
            "/recommend": "POST - Get AI product recommendations based on vibe",
            "/search-products": "POST - Search for specific products across platforms"
        }
    }

class ProductSearchRequest(BaseModel):
    product_name: str = Field(..., min_length=1, description="Product name to search for")
    max_results: int = Field(default=10, ge=1, le=50, description="Maximum number of results")

# Initialize product search aggregator
product_searcher = ProductSearchAggregator(cache_dir="cache", cache_hours=24)

@app.post("/recommend")
async def get_recommendations(request: VibeRequest):
    try:
        # 5. Professional System Instruction
        system_instruction = (
            "You are an expert lifestyle curator. Your job is to translate a user's 'vibe' "
            "into specific product recommendations. Focus on the emotional and functional "
            "needs of the vibe. Provide exactly 5 diverse product suggestions."
        )
        
        # 6. Structured Prompt
        prompt = f"""
        {system_instruction}
        
        User Vibe: "{request.vibe}"
        
        Return ONLY a JSON object with this structure:
        {{
          "vibe_analysis": "A brief summary of the detected mood",
          "products": [
            {{
              "name": "Product Name",
              "reason": "Why this fits the vibe",
              "category": "e.g., Home, Fashion, Tech"
            }}
          ]
        }}
        """
        
        # 7. Generate Content (request JSON format in the prompt instead)
        response = model.generate_content(prompt)
        
        # Check if response has text
        if not hasattr(response, 'text') or not response.text:
            print(f"ERROR: Response has no text attribute. Response: {response}")
            raise HTTPException(status_code=500, detail="AI returned an empty response.")
        
        # Parse the AI string into a Python dict to return as JSON
        response_text = response.text.strip()
        
        # Sometimes the response might have markdown code blocks, remove them
        if response_text.startswith("```json"):
            response_text = response_text[7:]  # Remove ```json
        if response_text.startswith("```"):
            response_text = response_text[3:]  # Remove ```
        if response_text.endswith("```"):
            response_text = response_text[:-3]  # Remove closing ```
        response_text = response_text.strip()
        
        print(f"DEBUG: Response text (first 300 chars): {response_text[:300]}...")  # Print first 300 chars for debugging
        result_data = json.loads(response_text)
        return result_data

    except json.JSONDecodeError as e:
        print(f"JSON Parse ERROR: {str(e)}")
        if 'response' in locals() and hasattr(response, 'text'):
            print(f"Response text: {response.text}")
        else:
            print("No response available")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"The AI failed to curate your vibe: {str(e)}")

@app.post("/search-products")
async def search_products(request: ProductSearchRequest):
    """
    Search for specific products across multiple platforms (eBay, Amazon, Google Shopping).
    Returns actual products with prices, images, and links.
    """
    try:
        print(f"🔍 Searching for products: {request.product_name}")
        
        # Search across platforms
        results = product_searcher.search_all(
            keyword=request.product_name,
            max_results=request.max_results,
            use_cache=True
        )
        
        # Limit results to the requested max (in case platforms return more)
        limited_results = results[:request.max_results]
        
        return {
            "success": True,
            "search_term": request.product_name,
            "total_results": len(limited_results),
            "products": limited_results
        }
        
    except Exception as e:
        print(f"Error in search_products: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to search products: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

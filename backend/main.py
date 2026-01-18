import os
import json
import uuid
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import google.generativeai as genai
from dotenv import load_dotenv
from product_search import ProductSearchAggregator
from user_memory import UserMemoryManager
from ai_logger import AILogger
from typing import List, Dict, Optional

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('backend.log'),
        logging.StreamHandler()  # Also keep console output
    ]
)
logger = logging.getLogger(__name__)

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
logger.info("Using model: gemini-2.5-flash-lite")

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
    user_preference: Optional[str] = Field(None, example="eco-friendly products, budget under $50, prefer minimal design")
    user_id: Optional[str] = Field(None, example="user_123", description="User ID for persistent memory. If not provided, a new one will be generated.")

class SuggestVibeRequest(BaseModel):
    user_id: str = Field(..., example="user_123", description="User ID to analyze history for suggestions")

@app.get("/")
async def root():
    stats = memory_manager.get_stats()
    return {
        "message": "Vibe-to-Product API is online",
        "endpoints": {
            "/recommend": "POST - Get AI product recommendations based on vibe (with memory & smart routing)",
            "/search-products": "POST - Search for specific products across platforms",
            "/suggest-vibe": "POST - Get personalized vibe suggestions based on user history",
            "/user/{user_id}/history": "GET - Get user's recommendation history",
            "/logs/recent": "GET - Get recent AI decision logs",
            "/stats": "GET - Get memory database statistics"
        },
        "memory_stats": stats
    }

@app.get("/user/{user_id}/history")
async def get_user_history(user_id: str, limit: int = 10):
    """Get a user's recommendation history"""
    try:
        history = memory_manager.get_user_history(user_id, limit=limit)
        return {
            "user_id": user_id,
            "total_interactions": len(history),
            "history": history
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/stats")
async def get_stats():
    """Get database statistics"""
    return memory_manager.get_stats()

@app.get("/logs/recent")
async def get_recent_logs(limit: int = 20):
    """Get recent AI decision logs"""
    logs = ai_logger.get_recent_logs(limit=limit)
    return {
        "total": len(logs),
        "logs": logs
    }

@app.get("/logs/user/{user_id}")
async def get_user_logs(user_id: str):
    """Get all AI decision logs for a specific user"""
    logs = ai_logger.get_logs_for_user(user_id)
    return {
        "user_id": user_id,
        "total": len(logs),
        "logs": logs
    }

class ProductSearchRequest(BaseModel):
    product_name: str = Field(..., min_length=1, description="Product name to search for")
    max_results: int = Field(default=10, ge=1, le=50, description="Maximum number of results")

# Initialize product search aggregator
product_searcher = ProductSearchAggregator(cache_dir="cache", cache_hours=24)

# Initialize user memory manager
memory_manager = UserMemoryManager(db_path="user_memory.db")

# Initialize AI logger
ai_logger = AILogger(log_file="ai_responses.jsonl")

@app.post("/recommend")
async def get_recommendations(request: VibeRequest, http_request: Request, response: Response):
    try:
        # Handle user_id - check cookie first, then request, then generate new
        cookie_user_id = http_request.cookies.get("user_id")
        user_id = request.user_id or cookie_user_id or f"anon_{uuid.uuid4().hex[:8]}"
        
        # Set cookie if it's a new user or cookie doesn't exist
        if not cookie_user_id or cookie_user_id != user_id:
            response.set_cookie(
                key="user_id",
                value=user_id,
                max_age=30*24*60*60,  # 30 days
                httponly=False,  # Allow JavaScript access
                samesite="lax"
            )
        
        logger.info(f"👤 Processing request for user: {user_id} (cookie: {cookie_user_id}, request: {request.user_id})")
        
        # Load user history
        user_context = memory_manager.build_context_prompt(user_id)
        history = memory_manager.get_user_history(user_id, limit=5)
        
        # Log memory insights
        if history:
            logger.info(f"📚 Loading memory for {user_id}: Found {len(history)} past interactions")
            # Summarize what we know about the user
            past_vibes = [h['vibe_input'] for h in history[:3]]
            logger.info(f"💭 User's recent vibes: {', '.join(past_vibes)}")
            
            # Check for preference patterns
            preferences = [h['user_preference'] for h in history if h.get('user_preference')]
            if preferences:
                logger.info(f"⚙️ User has stated preferences: {preferences[0]}")
        else:
            logger.info(f"🆕 New user {user_id}: No history found, starting fresh")
        
        # STEP 1: Let AI decide if user is clear or unsure
        mood_detection_prompt = f"""
        Analyze this user input and determine if they have a clear vibe/intention or if they're unsure/vague.
        
        User input: "{request.vibe}"
        
        Clear vibe examples: "I want to feel cozy", "I need more confidence at work", "Help me be productive"
        Unsure/vague examples: "I don't know", "surprise me", "what should I get?", "not sure", "help me decide", "I'm bored", "just browsing"
        
        Return ONLY a JSON object:
        {{
          "is_clear": true/false,
          "reason": "Brief explanation"
        }}
        """
        
        mood_response = model.generate_content(mood_detection_prompt)
        mood_text = mood_response.text.strip()
        
        # Log the raw AI response
        logger.info(f"[MOOD DETECTION] Raw AI response: {mood_text}")
        
        # Clean markdown
        if mood_text.startswith("```json"):
            mood_text = mood_text[7:]
        if mood_text.startswith("```"):
            mood_text = mood_text[3:]
        if mood_text.endswith("```"):
            mood_text = mood_text[:-3]
        mood_text = mood_text.strip()
        
        mood_data = json.loads(mood_text)
        is_clear = mood_data.get("is_clear", True)
        
        logger.info(f"🤔 User mood clarity: {is_clear} - {mood_data.get('reason', 'No reason')}")
        
        # Log the mood detection decision
        ai_logger.log_decision(
            user_id=user_id,
            user_input=request.vibe,
            decision_type="mood_detection",
            ai_response=mood_data,
            additional_context={
                "has_history": len(history) > 0,
                "history_count": len(history),
                "user_preference": request.user_preference
            }
        )
        
        # STEP 2: Route based on clarity
        if not is_clear and history:
            # User is unsure AND has history → Suggest vibes based on history
            logger.info("🔮 User is unsure - generating suggestions from history")
            logger.info(f"🧠 AI Reasoning: User expressed uncertainty. Analyzing {len(history)} past interactions to identify patterns and suggest complementary vibes that match their established preferences.")
            return await _generate_suggestions_from_history(user_id, history, request)
        
        elif not is_clear and not history:
            # User is unsure but NO history → Treat as general recommendation request
            logger.info("💭 User is unsure with no history - treating as general recommendation")
            logger.info("🧠 AI Reasoning: User is uncertain and has no history. Will generate recommendations based on their input and help establish their preferences.")
            # Rewrite vibe to be more actionable for the AI
            request.vibe = f"Suggest products that might interest someone exploring lifestyle improvements"
            return await _generate_normal_recommendations(request, user_id, user_context)
        
        else:
            # User has clear vibe → Normal recommendation flow
            logger.info("✨ User has clear vibe - generating recommendations")
            if history:
                logger.info(f"🧠 AI Reasoning: User has clear intent: '{request.vibe}'. Leveraging {len(history)} past interactions to personalize recommendations and avoid repetition.")
            else:
                logger.info(f"🧠 AI Reasoning: User has clear intent: '{request.vibe}'. No history available, generating fresh recommendations.")
            return await _generate_normal_recommendations(request, user_id, user_context)
        
    except json.JSONDecodeError as e:
        logger.error(f"JSON Parse ERROR: {str(e)}")
        if 'mood_response' in locals() and hasattr(mood_response, 'text'):
            logger.error(f"Response text: {mood_response.text}")
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
    except Exception as e:
        logger.error(f"ERROR: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"The AI failed to process your request: {str(e)}")


async def _generate_normal_recommendations(request: VibeRequest, user_id: str, user_context: str):
    """Generate normal product recommendations based on clear vibe"""
    # Professional System Instruction
    system_instruction = (
        "You are an expert lifestyle curator. Your job is to translate a user's 'vibe' "
        "into specific product recommendations. Focus on the emotional and functional "
        "needs of the vibe. Provide exactly 5 diverse product suggestions."
    )
    
    # Structured Prompt with optional user preferences and history
    user_pref_section = ""
    if request.user_preference:
        user_pref_section = f"\n\nUser Preferences: \"{request.user_preference}\"\nIMPORTANT: Consider these preferences when making recommendations."
    
    # Add reasoning instruction if user has history
    reasoning_instruction = ""
    if user_context:
        reasoning_instruction = "\n\nANALYSIS INSTRUCTION: Review the user's history above. Identify patterns in their past preferences and emotional states. Use this to:\n1. Avoid recommending similar products they've already seen\n2. Ensure recommendations align with their established taste\n3. Consider complementary products that enhance their previous choices"
    
    prompt = f"""
    {system_instruction}
    {user_context}
    {reasoning_instruction}
    
    User Vibe: "{request.vibe}"{user_pref_section}
    
    Return ONLY a valid JSON object (no markdown, no code blocks, no extra text).
    Follow this EXACT structure:
    {{
      "vibe_analysis": "A brief summary of the detected mood",
      "products": [
        {{
          "name": "Product Name (max 20 chars)",
          "reason": "Why this fits (max 40 chars)",
          "category": "Category Name"
        }}
      ]
    }}
    
    CRITICAL REQUIREMENTS:
    - Return EXACTLY 5 products in the products array
    - Product names: 20 characters or less
    - Reasons: 40 characters or less
    - Categories: Single word or short phrase (e.g., "Home", "Tech", "Fashion", "Food & Beverage")
    - NO markdown code blocks (no ```json or ```)
    - ONLY the JSON object, nothing else
    """
    
    # Generate Content
    response = model.generate_content(prompt)
    
    # Check if response has text
    if not hasattr(response, 'text') or not response.text:
        logger.error(f"ERROR: Response has no text attribute. Response: {response}")
        raise HTTPException(status_code=500, detail="AI returned an empty response.")
    
    # Parse the AI string into a Python dict to return as JSON
    response_text = response.text.strip()
    
    # Log the raw AI response
    logger.info(f"[RECOMMENDATION] Raw AI response: {response_text}")
    
    # Sometimes the response might have markdown code blocks, remove them
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()
    
    logger.debug(f"Response text (first 300 chars): {response_text[:300]}...")
    result_data = json.loads(response_text)
    
    # Log the recommendation
    ai_logger.log_decision(
        user_id=user_id,
        user_input=request.vibe,
        decision_type="recommendation",
        ai_response=result_data,
        additional_context={
            "user_preference": request.user_preference,
            "products_count": len(result_data.get('products', []))
        }
    )
    
    # Save interaction to memory
    memory_manager.save_interaction(
        user_id=user_id,
        vibe_input=request.vibe,
        user_preference=request.user_preference,
        recommendations=result_data.get('products', []),
        vibe_analysis=result_data.get('vibe_analysis', '')
    )
    
    # Include user_id and mode in response
    result_data['user_id'] = user_id
    result_data['mode'] = 'recommendations'
    
    return result_data


async def _generate_suggestions_from_history(user_id: str, history: List[Dict], request: VibeRequest):
    """Generate vibe suggestions based on user history when they're unsure"""
    # Build context from history
    history_context = "User's past interactions:\n"
    
    # Analyze patterns for logging
    categories_seen = set()
    vibes_seen = []
    
    for i, interaction in enumerate(history, 1):
        history_context += f"{i}. Vibe: \"{interaction['vibe_input']}\"\n"
        vibes_seen.append(interaction['vibe_input'])
        
        if interaction['user_preference']:
            history_context += f"   Preferences: {interaction['user_preference']}\n"
        if interaction['vibe_analysis']:
            history_context += f"   Analysis: {interaction['vibe_analysis']}\n"
        products = interaction['recommendations'][:3]
        product_names = [p.get('name', 'Unknown') for p in products]
        history_context += f"   Recommended: {', '.join(product_names)}\n\n"
        
        # Track categories
        for p in products:
            if p.get('category'):
                categories_seen.add(p['category'])
    
    # Log the analysis
    logger.info(f"📊 Historical Analysis:")
    logger.info(f"   - Past vibes explored: {', '.join(vibes_seen)}")
    logger.info(f"   - Product categories of interest: {', '.join(categories_seen)}")
    logger.info(f"🧠 AI Strategy: User history suggests interest in {', '.join(list(categories_seen)[:3])} and emotional states like {', '.join(vibes_seen[:2])}. Will suggest complementary vibes that align with established patterns while introducing variety.")
    
    # Create prompt for suggestions
    suggestion_prompt = f"""
    You are an expert lifestyle curator. The user said: "{request.vibe}"
    
    USER STATUS: The user is unsure about what they want.
    
    YOUR TASK: Analyze their history below and suggest what they might enjoy next.
    
    {history_context}
    
    ANALYSIS INSTRUCTION:
    1. Identify patterns: What emotional states have they explored? (e.g., cozy, productive, energized)
    2. Note preferred categories: What types of products do they gravitate toward? (e.g., Home, Tech, Fashion)
    3. Recognize their style: Budget-conscious? Eco-friendly? Minimal design?
    4. Suggest complementary vibes: What new emotional states would enhance their lifestyle based on their history?
    5. Avoid repetition: Don't suggest the exact same vibes they've already explored
    
    REASONING: Based on the patterns above, user history suggests interest in {', '.join(list(categories_seen)[:3]) if categories_seen else 'various categories'} and emotional states like {', '.join(vibes_seen[:2]) if vibes_seen else 'comfort and productivity'}. Continue with similar themes while introducing complementary variety.
    
    Now suggest 3 possible vibes they might be interested in exploring, with 2-3 product ideas for each.
    
    Return ONLY a valid JSON object (no markdown, no code blocks, no extra text).
    Follow this EXACT structure:
    {{
      "analysis": "Brief summary of their patterns",
      "suggested_vibes": [
        {{
          "vibe": "Suggested vibe description",
          "reason": "Why this would appeal",
          "sample_products": ["Product 1", "Product 2", "Product 3"]
        }}
      ]
    }}
    
    CRITICAL REQUIREMENTS:
    - Return EXACTLY 3 suggested vibes
    - Each vibe must have 2-3 sample products
    - Sample product names: 20 characters or less
    - NO markdown code blocks (no ```json or ```)
    - ONLY the JSON object, nothing else
    """
    
    # Generate suggestions
    response = model.generate_content(suggestion_prompt)
    
    if not hasattr(response, 'text') or not response.text:
        raise HTTPException(status_code=500, detail="AI returned an empty response.")
    
    response_text = response.text.strip()
    
    # Log the raw AI response
    logger.info(f"[SUGGESTION] Raw AI response: {response_text}")
    
    # Clean markdown code blocks
    if response_text.startswith("```json"):
        response_text = response_text[7:]
    if response_text.startswith("```"):
        response_text = response_text[3:]
    if response_text.endswith("```"):
        response_text = response_text[:-3]
    response_text = response_text.strip()
    
    result_data = json.loads(response_text)
    result_data['user_id'] = user_id
    result_data['mode'] = 'suggestions'
    result_data['based_on_interactions'] = len(history)
    result_data['original_input'] = request.vibe
    
    # Convert suggested_vibes to products format for frontend compatibility
    if 'suggested_vibes' in result_data:
        products = []
        for vibe in result_data['suggested_vibes'][:3]:  # Max 3 vibes
            for i, product_name in enumerate(vibe.get('sample_products', [])[:2]):  # 2 products per vibe
                products.append({
                    'name': product_name[:20],  # Truncate to 20 chars
                    'reason': vibe.get('vibe', '')[:40],  # Use vibe as reason, truncate to 40
                    'category': 'Suggested'
                })
                if len(products) >= 5:  # Stop at 5 products total
                    break
            if len(products) >= 5:
                break
        
        # Pad to 5 if needed
        while len(products) < 5:
            products.append({
                'name': 'Explore More',
                'reason': 'Discover new possibilities',
                'category': 'Lifestyle'
            })
        
        result_data['products'] = products
    
    # Log the suggestions
    ai_logger.log_decision(
        user_id=user_id,
        user_input=request.vibe,
        decision_type="suggestion",
        ai_response=result_data,
        additional_context={
            "history_count": len(history),
            "suggested_vibes_count": len(result_data.get('suggested_vibes', []))
        }
    )
    
    return result_data

@app.post("/search-products")
async def search_products(request: ProductSearchRequest):
    """
    Search for specific products across multiple platforms (eBay, Amazon, Google Shopping).
    Returns actual products with prices, images, and links.
    """
    try:
        logger.info(f"🔍 Searching for products: {request.product_name}")
        
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
        logger.error(f"Error in search_products: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to search products: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

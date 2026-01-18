# ShopOut - Shop For Outcomes

> Transform your aspirations into curated product recommendations with AI-powered personalization and 3D visualization.

## 🎯 Overview
[View Demo](https://youtu.be/gfl9y90w_Eg?si=eszwlpBvqV55NjfR)

E-commerce assumes identity is static — you’re a ‘type of customer,’ and sometimes you are, knowing exactly what you want. But people often shop during moments of transition, novelty, and goal setting: moving, changing jobs, picking up hobbies, and building new habits, when they might not know exactly what they need. Instead of searching for specific items, describe what you want to achieve — whether it's "feeling more settled in my apartment" or "hosting the best dinner parties" — and get personalized product suggestions from ShopOut with beautiful 3D product visuals. Powered by Google's Gemini AI.

### Key Features

- **🧠 Natural Language Understanding**: Describe your goals in plain language
- **🎨 3D Product Visualization**: Interactive 3D models powered by Three.js and React Three Fiber
- **📚 Persistent User Memory**: Learns from your preferences and interaction history
- **🔍 Multi-Platform Search**: Aggregates products from Amazon, eBay, Google Shopping, and more
- **🤖 AI-Powered Recommendations**: Leverages Gemini 2.5 Flash Lite for intelligent product matching
- **📊 Cached Responses**: Smart caching system to optimize API usage and performance

### Future Plans
- 3D Model Library/Generation: Scale the collection to have a 3D model show up for any recommended product!
- Merchant-facing dashboard: For analytics, including what inputs prompt their products, revenue from ShopOut, adjacent products, and more
- User input filters
  
## 🏗️ Architecture

### Backend (FastAPI + Python)
- **FastAPI** REST API with CORS support
- **Google Gemini AI** for natural language processing and recommendations
- **SQLite** database for user memory and interaction history
- **Multi-platform product search** with intelligent caching
- **Structured logging** for AI decision tracking

### Frontend (Next.js + TypeScript)
- **Next.js 16** with App Router
- **React Three Fiber** for 3D rendering
- **Tailwind CSS** for styling
- **TypeScript** for type safety

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- Google Gemini API key
- SerpAPI keys for extended product search

### Backend Setup

1. **Navigate to the backend directory:**
   ```bash
   cd backend
   ```

2. **Create a virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables:**
   Create a `.env` file in the `backend` directory:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   SERPAPI_KEY=your_serpapi_key_here   
   ```

5. **Run the backend server:**
   ```bash
   uvicorn main:app --reload --port 8000
   ```

   The API will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to the frontend directory:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build for production:**
   ```bash
   npm run build
   npm start
   ```

## 📡 API Endpoints

### Frontend-Used Endpoints

- **`POST /recommend`** - Get AI product recommendations based on vibe (with smart routing)
  - If user has clear vibe → generates product recommendations
  - If user is unsure + has history → suggests vibes based on patterns
  - If user is unsure + no history → general recommendations


- **`POST /search-products`** - Search for specific products on Google Shopping


### Additional Endpoints (for monitoring/debugging)

- **`GET /`** - Root endpoint with API status and memory statistics
- **`GET /user/{user_id}/history`** - Retrieve user's recommendation history (limit: 10)
- **`GET /stats`** - Get memory database statistics
- **`GET /logs/recent`** - View recent AI decision logs (limit: 20)
- **`GET /logs/user/{user_id}`** - Get all AI decision logs for a specific user

## 🎨 Features Deep Dive

### User Memory System
The application maintains a persistent memory of:
- Interaction history like past vibes and records
- Generated recommendations and their metadata

### AI-Powered Recommendations
- Context-aware suggestions based on user goals
- Learns from past interactions
- Considers explicit preferences (vibe, prompts, values)
- Generates creative product combinations

### 3D Visualization
- Interactive 3D product models
- Smooth animations and transitions
- Responsive camera controls
- Custom 3D models for various product types

## 🛠️ Tech Stack

### Backend
- **FastAPI** - Modern, fast web framework
- **Google Generative AI** - Gemini 2.5 Flash Lite
- **SQLite** - Lightweight database for user memory
- **Pydantic** - Data validation
- **python-dotenv** - Environment management
- **requests** - HTTP client for product APIs

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Three.js** - 3D graphics library
- **React Three Fiber** - React renderer for Three.js
- **@react-three/drei** - Helper components
- **Tailwind CSS** - Utility-first CSS framework

## 📁 Project Structure

```
UofTHacks13/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── product_search.py       # Multi-platform product search
│   ├── user_memory.py          # User memory management
│   ├── ai_logger.py            # AI decision logging
│   ├── requirements.txt        # Python dependencies
│   ├── cache/                  # Product search cache
│   └── __pycache__/
├── frontend/
│   ├── app/
│   │   ├── page.tsx            # Landing page
│   │   ├── layout.tsx          # Root layout
│   │   ├── globals.css         # Global styles
│   │   ├── 3d-demo/            # 3D visualization demo
│   │   ├── loading_page/       # Loading state
│   │   ├── prompt_results/     # Results display
│   │   └── suggested_products/ # Product cards
│   ├── components/
│   │   ├── 3d/                 # 3D components (Scene, Models)
│   │   └── suggested_product_card/
│   ├── lib/
│   │   └── api.ts              # API client
│   ├── public/
│   │   └── models/             # 3D model files
│   ├── package.json
│   ├── tsconfig.json
│   └── next.config.ts
├── README.md
└── LICENSE
```

## 🎓 Use Cases

- **Lifestyle Shopping**: "I want to feel more settled in my apartment"
- **Hobby Development**: "I want to get back into creative habits"
- **Social Goals**: "I want to host the best dinner parties"
- **Personal Growth**: "I want to feel more confident at work"
- **Home Improvement**: "I want to create a cozy reading nook"

## 🐛 Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Kill process on port 8000
lsof -ti:8000 | xargs kill -9
```

**Missing API keys:**
- Ensure `.env` file exists in `backend/` directory
- Verify `GEMINI_API_KEY` and `SERPAPI_KEY` is set correctly

### Frontend Issues

**Module not found errors:**
```bash
rm -rf node_modules package-lock.json
npm install
```

**3D models not loading:**
- Verify model files exist in `public/models/`
- Check browser console for CORS or path errors

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 🏆 Built For

**UofTHacks 13** - University of Toronto Hackathon

## 👥 Contributing
Ivan Xie\
Michael Salib\
Grace-Keyi Wang\
Zusheng Lu 

--

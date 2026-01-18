"""
User Memory Management System
Stores user preferences, interaction history, and builds context for recommendations
"""

import sqlite3
import json
from datetime import datetime
from typing import Dict, List, Optional
from contextlib import contextmanager


class UserMemoryManager:
    def __init__(self, db_path: str = "user_memory.db"):
        self.db_path = db_path
        self._initialize_database()
    
    @contextmanager
    def _get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def _initialize_database(self):
        """Create tables if they don't exist"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    user_id TEXT PRIMARY KEY,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    preferences_summary TEXT,
                    last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # Interaction history table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS interactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id TEXT NOT NULL,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    vibe_input TEXT NOT NULL,
                    user_preference TEXT,
                    recommendations TEXT NOT NULL,
                    vibe_analysis TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(user_id)
                )
            """)
            
            # Index for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_interactions 
                ON interactions(user_id, timestamp DESC)
            """)
            
            print(f"✅ Database initialized: {self.db_path}")
    
    def get_or_create_user(self, user_id: str) -> Dict:
        """Get user profile or create if doesn't exist"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Try to get user
            cursor.execute(
                "SELECT * FROM users WHERE user_id = ?",
                (user_id,)
            )
            user = cursor.fetchone()
            
            if user:
                return dict(user)
            
            # Create new user
            cursor.execute(
                "INSERT INTO users (user_id) VALUES (?)",
                (user_id,)
            )
            
            print(f"👤 Created new user: {user_id}")
            
            # Return the new user
            cursor.execute(
                "SELECT * FROM users WHERE user_id = ?",
                (user_id,)
            )
            return dict(cursor.fetchone())
    
    def get_user_history(self, user_id: str, limit: int = 5) -> List[Dict]:
        """Get recent interaction history for a user"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    timestamp,
                    vibe_input,
                    user_preference,
                    recommendations,
                    vibe_analysis
                FROM interactions
                WHERE user_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (user_id, limit))
            
            interactions = []
            for row in cursor.fetchall():
                interactions.append({
                    'timestamp': row['timestamp'],
                    'vibe_input': row['vibe_input'],
                    'user_preference': row['user_preference'],
                    'recommendations': json.loads(row['recommendations']),
                    'vibe_analysis': row['vibe_analysis']
                })
            
            return interactions
    
    def save_interaction(
        self,
        user_id: str,
        vibe_input: str,
        user_preference: Optional[str],
        recommendations: List[Dict],
        vibe_analysis: str
    ):
        """Save a new interaction to history"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Ensure user exists
            self.get_or_create_user(user_id)
            
            # Save interaction
            cursor.execute("""
                INSERT INTO interactions 
                (user_id, vibe_input, user_preference, recommendations, vibe_analysis)
                VALUES (?, ?, ?, ?, ?)
            """, (
                user_id,
                vibe_input,
                user_preference,
                json.dumps(recommendations),
                vibe_analysis
            ))
            
            # Update last_active
            cursor.execute("""
                UPDATE users 
                SET last_active = CURRENT_TIMESTAMP
                WHERE user_id = ?
            """, (user_id,))
            
            print(f"💾 Saved interaction for user: {user_id}")
    
    def update_preferences_summary(self, user_id: str, summary: str):
        """Update the user's preference summary"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE users 
                SET preferences_summary = ?
                WHERE user_id = ?
            """, (summary, user_id))
    
    def build_context_prompt(self, user_id: str) -> str:
        """Build a context string from user history for the AI prompt"""
        history = self.get_user_history(user_id, limit=5)
        
        if not history:
            return ""
        
        context_parts = ["\n--- USER HISTORY CONTEXT ---"]
        context_parts.append(f"This user has {len(history)} past interaction(s):")
        
        for i, interaction in enumerate(history, 1):
            context_parts.append(f"\n{i}. Previous vibe: \"{interaction['vibe_input']}\"")
            if interaction['user_preference']:
                context_parts.append(f"   Preferences: {interaction['user_preference']}")
            if interaction['vibe_analysis']:
                context_parts.append(f"   Analysis: {interaction['vibe_analysis']}")
            
            # Show recommended products
            products = interaction['recommendations']
            if products:
                product_names = [p.get('name', 'Unknown') for p in products[:3]]
                context_parts.append(f"   Recommended: {', '.join(product_names)}")
        
        context_parts.append("\nUse this history to personalize recommendations and avoid repetition.")
        context_parts.append("--- END HISTORY ---\n")
        
        return "\n".join(context_parts)
    
    def get_stats(self) -> Dict:
        """Get database statistics"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT COUNT(*) as count FROM users")
            user_count = cursor.fetchone()['count']
            
            cursor.execute("SELECT COUNT(*) as count FROM interactions")
            interaction_count = cursor.fetchone()['count']
            
            return {
                'total_users': user_count,
                'total_interactions': interaction_count
            }

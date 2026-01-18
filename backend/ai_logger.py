"""
AI Response Logger
Logs all AI decisions and responses for debugging and analysis
"""

import json
import os
from datetime import datetime
from typing import Dict, Any


class AILogger:
    def __init__(self, log_file: str = "ai_responses.jsonl"):
        self.log_file = log_file
        print(f"📝 AI Logger initialized: {log_file}")
    
    def log_decision(
        self,
        user_id: str,
        user_input: str,
        decision_type: str,
        ai_response: Dict[Any, Any],
        additional_context: Dict[Any, Any] = None
    ):
        """
        Log an AI decision or response
        
        Args:
            user_id: The user making the request
            user_input: What the user said
            decision_type: 'mood_detection', 'recommendation', 'suggestion', etc.
            ai_response: The parsed AI response
            additional_context: Any extra info (history count, preferences, etc.)
        """
        log_entry = {
            "timestamp": datetime.now().isoformat(),
            "user_id": user_id,
            "user_input": user_input,
            "decision_type": decision_type,
            "ai_response": ai_response,
            "context": additional_context or {}
        }
        
        # Append to JSONL file (one JSON object per line)
        try:
            with open(self.log_file, 'a') as f:
                f.write(json.dumps(log_entry) + '\n')
            print(f"📝 Logged {decision_type} for user {user_id}")
        except Exception as e:
            print(f"⚠️ Failed to log: {str(e)}")
    
    def get_recent_logs(self, limit: int = 10) -> list:
        """Get the most recent log entries"""
        if not os.path.exists(self.log_file):
            return []
        
        try:
            with open(self.log_file, 'r') as f:
                lines = f.readlines()
                recent_lines = lines[-limit:]
                return [json.loads(line) for line in recent_lines]
        except Exception as e:
            print(f"⚠️ Failed to read logs: {str(e)}")
            return []
    
    def get_logs_for_user(self, user_id: str) -> list:
        """Get all logs for a specific user"""
        if not os.path.exists(self.log_file):
            return []
        
        try:
            with open(self.log_file, 'r') as f:
                logs = []
                for line in f:
                    entry = json.loads(line)
                    if entry.get('user_id') == user_id:
                        logs.append(entry)
                return logs
        except Exception as e:
            print(f"⚠️ Failed to read user logs: {str(e)}")
            return []
    
    def clear_logs(self):
        """Clear all logs (use with caution!)"""
        try:
            if os.path.exists(self.log_file):
                os.remove(self.log_file)
                print(f"🗑️ Cleared logs: {self.log_file}")
        except Exception as e:
            print(f"⚠️ Failed to clear logs: {str(e)}")

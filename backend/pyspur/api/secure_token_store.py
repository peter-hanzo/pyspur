import os
import uuid
from pathlib import Path
from typing import Dict, Optional

from cryptography.fernet import Fernet
from fastapi import HTTPException


class SecureTokenStore:
    """A secure storage for agent-specific tokens.

    This class provides an interface to securely store and retrieve
    tokens associated with specific agents, using encryption.
    """

    def __init__(self):
        # Load or generate encryption key
        self.encryption_key = os.getenv("TOKEN_ENCRYPTION_KEY")
        if not self.encryption_key:
            # Generate a key and store it in the environment
            self.encryption_key = Fernet.generate_key().decode()
            os.environ["TOKEN_ENCRYPTION_KEY"] = self.encryption_key

        # Initialize Fernet cipher for encryption/decryption
        self.cipher = Fernet(self.encryption_key.encode())

        # Ensure the token storage directory exists
        storage_dir = Path("./secure_tokens")
        storage_dir.mkdir(exist_ok=True)
        self.storage_path = storage_dir / "agent_tokens.enc"

        # Initialize or load the token store
        self.tokens: Dict[str, Dict[str, str]] = {}
        self._load_tokens()

    def _load_tokens(self):
        """Load encrypted tokens from storage."""
        if self.storage_path.exists():
            try:
                encrypted_data = self.storage_path.read_bytes()
                decrypted_data = self.cipher.decrypt(encrypted_data).decode()
                import json

                self.tokens = json.loads(decrypted_data)
            except Exception as e:
                print(f"Error loading tokens: {str(e)}")
                self.tokens = {}

    def _save_tokens(self):
        """Save encrypted tokens to storage."""
        try:
            import json

            data = json.dumps(self.tokens)
            encrypted_data = self.cipher.encrypt(data.encode())
            self.storage_path.write_bytes(encrypted_data)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to save tokens: {str(e)}")

    def create_token_id(self, agent_id: int) -> str:
        """Generate a unique token ID for an agent."""
        token_id = str(uuid.uuid4())
        if str(agent_id) not in self.tokens:
            self.tokens[str(agent_id)] = {}
        self.tokens[str(agent_id)]["token_id"] = token_id
        self._save_tokens()
        return token_id

    def store_token(self, agent_id: int, token_type: str, token: str) -> str:
        """Store a token for a specific agent and token type."""
        # Ensure agent exists in store
        agent_id_str = str(agent_id)
        if agent_id_str not in self.tokens:
            self.tokens[agent_id_str] = {}

        # Store the token
        self.tokens[agent_id_str][token_type] = token
        self._save_tokens()

        # Return a masked version for display
        return self._mask_token(token)

    def get_token(self, agent_id: int, token_type: str) -> Optional[str]:
        """Retrieve a token for a specific agent and token type."""
        agent_id_str = str(agent_id)
        if agent_id_str in self.tokens and token_type in self.tokens[agent_id_str]:
            return self.tokens[agent_id_str][token_type]
        return None

    def delete_token(self, agent_id: int, token_type: str) -> bool:
        """Delete a token for a specific agent and token type."""
        agent_id_str = str(agent_id)
        if agent_id_str in self.tokens and token_type in self.tokens[agent_id_str]:
            del self.tokens[agent_id_str][token_type]
            if not self.tokens[agent_id_str]:  # If no tokens left for this agent
                del self.tokens[agent_id_str]
            self._save_tokens()
            return True
        return False

    def _mask_token(self, token: str) -> str:
        """Create a masked version of the token for display."""
        if len(token) <= 8:
            return "*" * len(token)
        return token[:4] + "*" * (len(token) - 8) + token[-4:]


# Singleton instance
_token_store = None


def get_token_store() -> SecureTokenStore:
    """Get the singleton token store instance."""
    global _token_store
    if _token_store is None:
        _token_store = SecureTokenStore()
    return _token_store

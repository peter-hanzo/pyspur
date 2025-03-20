import logging
import os
import threading
from typing import Callable, Dict, Optional

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler

from ...api.secure_token_store import get_token_store
from ...database import get_db
from ...models.slack_agent_model import SlackAgentModel
from ...schemas.slack_schemas import WorkflowTriggerRequest

logger = logging.getLogger("pyspur")


class SocketModeClient:
    """Client for handling Slack Socket Mode connections.
    This manages real-time event processing from Slack.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(SocketModeClient, cls).__new__(cls)
                cls._instance._initialized = False
            return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # Initialize state
        self._socket_mode_handlers: Dict[int, SocketModeHandler] = {}
        self._apps: Dict[int, App] = {}
        self._initialized = True
        self._workflow_trigger_callback: Optional[Callable] = None

        logger.info("SocketModeClient initialized")

    def set_workflow_trigger_callback(self, callback: Callable):
        """Set the callback function to be called when a workflow should be triggered"""
        self._workflow_trigger_callback = callback

    def _create_app_handlers(self, agent_id: int, token: str, signing_secret: str):
        """Create Slack app and socket handler for a specific agent"""
        # Initialize the Slack app for this agent
        app = App(token=token, signing_secret=signing_secret, logger=logger)

        # Register event handlers
        self._register_event_handlers(app, agent_id)

        # Return just the app since we'll create the socket handler later with the app token
        return app, None

    def _register_event_handlers(self, app: App, agent_id: int):
        """Register event handlers for the Slack app"""

        @app.event("app_mention")
        def handle_app_mention(event, say, body, logger):
            logger.info(f"Agent {agent_id} received mention: {event}")
            self._process_event(agent_id, "app_mention", event, body, say)

        @app.event("message")
        def handle_message(event, say, body, logger):
            # Skip bot messages to avoid loops
            if event.get("bot_id") or event.get("user") == "USLACKBOT":
                return

            logger.info(f"Agent {agent_id} received message: {event}")

            # Determine if this is a direct message or channel message
            channel_type = event.get("channel_type", "")
            event_type = "message"

            self._process_event(agent_id, event_type, event, body, say)

    def _process_event(self, agent_id: int, event_type: str, event: Dict, body: Dict, say):
        """Process a Slack event and trigger workflows if appropriate"""
        if not self._workflow_trigger_callback:
            logger.error("No workflow trigger callback set")
            return

        # Get a database session
        db = next(get_db())

        try:
            # Get the agent to verify it exists and is active
            agent = (
                db.query(SlackAgentModel)
                .filter(
                    SlackAgentModel.id == agent_id,
                    SlackAgentModel.is_active.is_(True),
                    SlackAgentModel.trigger_enabled.is_(True),
                )
                .first()
            )

            if not agent:
                logger.warning(f"Agent {agent_id} not found or not active")
                return

            # Extract relevant information from the event
            text = event.get("text", "")
            channel_id = event.get("channel", "")
            user_id = event.get("user", "")
            team_id = body.get("team_id", "")

            # Create a trigger request
            trigger_request = WorkflowTriggerRequest(
                text=text,
                channel_id=channel_id,
                user_id=user_id,
                team_id=team_id,
                event_type=event_type,
                event_data=event,
            )

            # Call the workflow trigger callback
            self._workflow_trigger_callback(trigger_request, agent_id, say)

        except Exception as e:
            logger.error(f"Error processing event for agent {agent_id}: {e}")
        finally:
            db.close()

    def start_socket_mode(self, agent_id: int):
        """Start Socket Mode for a specific agent"""
        logger.info(f"Starting Socket Mode for agent {agent_id}")

        db = next(get_db())

        try:
            # Get the agent
            agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()

            if not agent:
                logger.error(f"Agent {agent_id} not found")
                return False

            if not agent.has_bot_token:
                logger.error(f"Agent {agent_id} doesn't have a bot token")
                return False

            # Get the bot token from the token store
            token_store = get_token_store()
            bot_token = token_store.get_token(agent_id, "bot_token")

            if not bot_token:
                logger.error(f"Could not retrieve bot token for agent {agent_id}")
                return False

            # Get the signing secret from environment variables
            signing_secret = os.getenv("SLACK_SIGNING_SECRET", "")

            if not signing_secret:
                logger.error("SLACK_SIGNING_SECRET not configured")
                return False

            # Get the app-level token for Socket Mode - try agent token first, then fall back to environment
            app_token = None

            # If agent has an app token configured, use that
            if agent.has_app_token:
                app_token = token_store.get_token(agent_id, "app_token")
                logger.info(f"Using agent-specific app token for agent {agent_id}")

            # Fall back to global environment variable if no agent token
            if not app_token:
                app_token = os.getenv("SLACK_APP_TOKEN", "")
                logger.info("Using global SLACK_APP_TOKEN from environment")

            if not app_token:
                logger.error("No app token found - required for Socket Mode")
                return False

            if not app_token.startswith("xapp-"):
                logger.error("App token must be an app-level token that starts with 'xapp-'")
                return False

            # Check if a handler already exists for this agent
            if agent_id in self._socket_mode_handlers:
                logger.info(f"Socket Mode handler already exists for agent {agent_id}")
                return True

            # Create app and socket handler
            app, _ = self._create_app_handlers(agent_id, bot_token, signing_secret)

            # Use app token for Socket Mode instead of bot token
            handler = SocketModeHandler(app=app, app_token=app_token)

            # Start the socket mode handler in a background thread
            thread = threading.Thread(target=handler.start, daemon=True)
            thread.start()

            # Store the handler and app
            self._socket_mode_handlers[agent_id] = handler
            self._apps[agent_id] = app

            logger.info(f"Socket Mode started for agent {agent_id}")
            return True

        except Exception as e:
            logger.error(f"Error starting Socket Mode for agent {agent_id}: {e}")
            return False
        finally:
            db.close()

    def stop_socket_mode(self, agent_id: int):
        """Stop Socket Mode for a specific agent"""
        logger.info(f"Stopping Socket Mode for agent {agent_id}")

        if agent_id not in self._socket_mode_handlers:
            logger.warning(f"No Socket Mode handler found for agent {agent_id}")
            return False

        try:
            # Close the socket mode handler
            handler = self._socket_mode_handlers[agent_id]
            handler.close()

            # Remove from dictionaries
            del self._socket_mode_handlers[agent_id]
            del self._apps[agent_id]

            logger.info(f"Socket Mode stopped for agent {agent_id}")
            return True
        except Exception as e:
            logger.error(f"Error stopping Socket Mode for agent {agent_id}: {e}")
            return False

    def is_running(self, agent_id: int) -> bool:
        """Check if Socket Mode is running for a specific agent"""
        return agent_id in self._socket_mode_handlers

    def stop_all(self):
        """Stop all Socket Mode handlers"""
        logger.info("Stopping all Socket Mode handlers")

        agent_ids = list(self._socket_mode_handlers.keys())
        for agent_id in agent_ids:
            self.stop_socket_mode(agent_id)


# Singleton instance accessor
def get_socket_mode_client() -> SocketModeClient:
    """Get the singleton SocketModeClient instance"""
    return SocketModeClient()

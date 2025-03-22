import asyncio
import logging
import os
import threading
import traceback
from datetime import datetime
from typing import Any, Callable, Dict, Optional

from slack_bolt import App
from slack_bolt.adapter.socket_mode import SocketModeHandler
from slack_bolt.oauth.oauth_settings import OAuthSettings
from slack_sdk.oauth.installation_store import FileInstallationStore
from slack_sdk.oauth.installation_store.models.installation import Installation
from slack_sdk.oauth.state_store import FileOAuthStateStore

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
        self._workflow_trigger_callback: Optional[Callable[..., Any]] = None

        # Create a base directory for installation data
        os.makedirs("/tmp/slack-installation-store", exist_ok=True)

        logger.info("SocketModeClient initialized")

    def set_workflow_trigger_callback(self, callback: Callable[..., Any]):
        """Set the callback function to be called when a workflow should be triggered

        The callback can be either a regular function or an async coroutine function.
        If it's a coroutine function, it will be properly awaited when called.
        """
        self._workflow_trigger_callback = callback
        # Log whether the callback is a coroutine function
        is_async = asyncio.iscoroutinefunction(callback)
        logger.info(f"Setting workflow trigger callback. Is async: {is_async}")

    def _register_event_handlers(self, app: App, agent_id: int):
        """Register event handlers for the Slack app"""

        @app.event("app_mention")
        def handle_app_mention(
            event: Dict[str, Any],
            say: Callable,
            body: Dict[str, Any],
            logger: logging.Logger,
            client,
        ):
            """Handle app mention events from Slack"""
            logger.info(f"Agent {agent_id} received mention: {event}")
            self._process_event(agent_id, "app_mention", event, body, say, client)

        @app.event("message")
        def handle_message(
            event: Dict[str, Any],
            say: Callable,
            body: Dict[str, Any],
            logger: logging.Logger,
            client,
        ):
            """Handle message events from Slack"""
            # Skip bot messages to avoid loops
            if event.get("bot_id") or event.get("user") == "USLACKBOT":
                return

            logger.info(f"Agent {agent_id} received message: {event}")
            self._process_event(agent_id, "message", event, body, say, client)

        # Add error handler for app
        @app.error
        def handle_errors(error: Exception, logger: logging.Logger):
            """Handle any errors that occur during event processing"""
            logger.error(f"Error in Slack app for agent {agent_id}: {error}")

            # Log detailed error information for debugging
            logger.error(f"Error details: {traceback.format_exc()}")

    def _process_event(
        self,
        agent_id: int,
        event_type: str,
        event: Dict[str, Any],
        body: Dict[str, Any],
        say: Callable,
        client=None,
    ):
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
            # Check if the callback is a coroutine function
            callback_result = self._workflow_trigger_callback(
                trigger_request, agent_id, say, client
            )

            # If it's a coroutine, we need to run it in an event loop
            if asyncio.iscoroutine(callback_result):
                try:
                    # Try to get the current event loop
                    try:
                        loop = asyncio.get_event_loop()
                    except RuntimeError:
                        # If there's no event loop in this thread, create a new one
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)

                    # Run the coroutine
                    if loop.is_running():
                        # We're in an event loop but in a non-async context
                        # Schedule the coroutine to run soon
                        future = asyncio.run_coroutine_threadsafe(callback_result, loop)
                        # Optionally wait for it to complete with a timeout
                        # future.result(timeout=10)
                    else:
                        # We can run the coroutine directly
                        loop.run_until_complete(callback_result)
                except Exception as e:
                    logger.error(f"Error executing coroutine: {e}")
                    logger.error(f"Coroutine error details: {traceback.format_exc()}")

        except Exception as e:
            logger.error(f"Error processing event for agent {agent_id}: {e}")
            logger.error(f"Error details: {traceback.format_exc()}")
        finally:
            db.close()

    def start_socket_mode(self, agent_id: int) -> bool:
        """Start socket mode for a Slack agent"""
        logger.info(f"Starting socket mode for agent {agent_id}")

        # Get a database session
        db = next(get_db())

        try:
            # Get the agent
            agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()

            if not agent:
                logger.error(f"Agent {agent_id} not found")
                return False

            # Get the tokens from the agent
            bot_token = getattr(agent, "slack_bot_token", None)
            app_token = getattr(agent, "slack_app_token", None)

            # Initialize token store once to avoid redundant imports
            from ...api.secure_token_store import get_token_store

            token_store = get_token_store()

            # Try to get tokens from secure token store if not available on agent
            if not bot_token:
                bot_token = token_store.get_token(agent_id, "bot_token")

            if not app_token:
                app_token = token_store.get_token(agent_id, "app_token")

            # For Socket Mode, signing secret is optional
            signing_secret = getattr(
                agent, "slack_signing_secret", os.environ.get("SLACK_SIGNING_SECRET")
            )

            if not bot_token or not bot_token.startswith("xoxb-"):
                logger.error(f"Invalid bot token format for agent {agent_id}")
                return False

            if not app_token or not app_token.startswith("xapp-"):
                logger.error(f"Invalid app token format for agent {agent_id}")
                return False

            try:
                # Create unique installation store path for this agent
                installation_store_path = f"/tmp/slack-installation-store/{agent_id}"
                os.makedirs(installation_store_path, exist_ok=True)

                # Create installation store
                installation_store = FileInstallationStore(base_dir=installation_store_path)

                # Create OAuth settings with installation store
                oauth_settings = OAuthSettings(
                    client_id=os.environ.get("SLACK_CLIENT_ID", ""),
                    client_secret=os.environ.get("SLACK_CLIENT_SECRET", ""),
                    scopes=["chat:write", "app_mentions:read", "channels:history", "channels:read"],
                    installation_store=installation_store,
                    state_store=FileOAuthStateStore(
                        base_dir=installation_store_path, expiration_seconds=600
                    ),
                )

                # Create the app with OAuth settings
                app = App(
                    token=bot_token, signing_secret=signing_secret, oauth_settings=oauth_settings
                )

                # Manually store the installation data for this workspace
                # Get bot info to retrieve the bot_id, bot_user_id, and team_id
                bot_info_response = app.client.auth_test()
                if not bot_info_response["ok"]:
                    logger.error(f"Failed to get bot info: {bot_info_response['error']}")
                    return False

                team_id = bot_info_response["team_id"]
                bot_user_id = bot_info_response["user_id"]

                # Create and store installation data
                installation = Installation(
                    app_id=os.environ.get("SLACK_APP_ID", bot_info_response.get("bot_id", "")),
                    enterprise_id=None,
                    team_id=team_id,
                    user_id=bot_user_id,
                    bot_token=bot_token,
                    bot_id=bot_info_response.get("bot_id", ""),
                    bot_user_id=bot_user_id,
                    bot_scopes=[
                        "chat:write",
                        "app_mentions:read",
                        "channels:history",
                        "channels:read",
                    ],
                    installed_at=datetime.now().timestamp(),
                )

                # Store the installation data
                installation_store.save(installation)
                logger.info(f"Stored installation data for team_id: {team_id}")

                # Register event handlers
                self._register_event_handlers(app, agent_id)

                # Start socket mode
                logger.info(f"Starting socket mode with app token for agent {agent_id}")
                socket_handler = SocketModeHandler(app=app, app_token=app_token)
                socket_handler.start()

                # Store the handler reference for later stop
                self._socket_mode_handlers[agent_id] = socket_handler
                self._apps[agent_id] = app
                logger.info(f"Socket mode started successfully for agent {agent_id}")
                return True

            except Exception as e:
                # Handle exception from socket mode initialization
                logger.error(f"Error starting socket mode for agent {agent_id}: {e}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                return False
        except Exception as e:
            logger.error(f"Error in socket mode setup for agent {agent_id}: {e}")
            logger.error(f"Traceback: {traceback.format_exc()}")
            return False
        finally:
            db.close()

    def stop_socket_mode(self, agent_id: int) -> bool:
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

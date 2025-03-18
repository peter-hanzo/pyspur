import os
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional, cast

import requests
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.run_model import RunModel
from ..models.slack_agent_model import SlackAgentModel
from ..models.workflow_model import WorkflowModel
from ..schemas.run_schemas import StartRunRequestSchema
from ..schemas.slack_schemas import (
    AgentTokenRequest,
    AgentTokenResponse,
    SlackAgentCreate,
    SlackAgentResponse,
    SlackAgentUpdate,
    SlackMessage,
    SlackMessageResponse,
    SlackOAuthResponse,
    SlackTriggerConfig,
    WorkflowAssociation,
    WorkflowTriggerRequest,
    WorkflowTriggerResult,
    WorkflowTriggersResponse,
)
from . import key_management
from .secure_token_store import get_token_store
from .workflow_run import run_workflow_non_blocking

router = APIRouter()

# OAuth configuration
SLACK_CLIENT_ID = os.getenv("SLACK_CLIENT_ID", "")
SLACK_CLIENT_SECRET = os.getenv("SLACK_CLIENT_SECRET", "")
SLACK_REDIRECT_URI = os.getenv(
    "SLACK_REDIRECT_URI", "http://localhost:8000/api/slack/oauth/callback"
)

# Request timeout (in seconds)
REQUEST_TIMEOUT = 10

# Slack API endpoints
SLACK_OAUTH_URL = "https://slack.com/oauth/v2/authorize"
SLACK_TOKEN_URL = "https://slack.com/api/oauth.v2.access"
SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage"


def validate_redirect_uri() -> None:
    """Validate the redirect URI to ensure it's not the default localhost URL in production"""
    if SLACK_REDIRECT_URI == "http://localhost:8000/api/slack/oauth/callback":
        # Check if we're in a production environment
        if os.getenv("ENVIRONMENT", "").lower() == "production":
            raise ValueError(
                "SLACK_REDIRECT_URI is set to localhost but the environment is production. "
                "Please configure a proper redirect URI."
            )


@router.get("/config/status")
async def get_slack_config_status():
    """Check if Slack configuration is complete and return the status"""
    # Check if the required environment variables are set
    client_id = os.getenv("SLACK_CLIENT_ID", "")
    client_secret = os.getenv("SLACK_CLIENT_SECRET", "")

    # Return the configuration status
    return {
        "configured": bool(client_id and client_secret),
        "missing_keys": [
            key
            for key, value in {
                "SLACK_CLIENT_ID": client_id,
                "SLACK_CLIENT_SECRET": client_secret,
            }.items()
            if not value
        ],
    }


@router.get("/required-keys")
async def get_slack_required_keys():
    """Get information about the required Slack API keys and their current status"""
    # Get current values (masked for security)
    client_id = os.getenv("SLACK_CLIENT_ID", "")
    client_secret = os.getenv("SLACK_CLIENT_SECRET", "")
    bot_token = os.getenv("SLACK_BOT_TOKEN", "")

    # Function to mask key values for display
    def mask_value(value: str) -> str:
        if not value:
            return ""
        if len(value) <= 8:
            return "*" * len(value)
        return value[:4] + "*" * (len(value) - 8) + value[-4:]

    # Prepare the response with key information
    keys_info = [
        {
            "name": "SLACK_CLIENT_ID",
            "description": "Client ID from your Slack App's Basic Information page",
            "configured": bool(client_id),
            "masked_value": mask_value(client_id),
            "required": True,
            "purpose": "Used for initial OAuth authentication",
            "help_url": "https://api.slack.com/authentication/basics",
        },
        {
            "name": "SLACK_CLIENT_SECRET",
            "description": "Client Secret from your Slack App's Basic Information page",
            "configured": bool(client_secret),
            "masked_value": mask_value(client_secret),
            "required": True,
            "purpose": "Used along with Client ID for OAuth authentication",
            "help_url": "https://api.slack.com/authentication/basics",
        },
        {
            "name": "SLACK_BOT_TOKEN",
            "description": "Bot User OAuth Token (starts with xoxb-)",
            "configured": bool(bot_token),
            "masked_value": mask_value(bot_token),
            "required": False,
            "purpose": "Obtained after successful authentication, used for API operations",
            "help_url": "https://api.slack.com/authentication/token-types",
        },
    ]

    # Determine overall status
    all_required_configured = all(key["configured"] for key in keys_info if key["required"])

    return {
        "configured": all_required_configured,
        "keys": keys_info,
        "redirect_uri": SLACK_REDIRECT_URI,
        "scopes_needed": "channels:read,chat:write,team:read,app_mentions:read,im:read,im:history",
    }


@router.get("/oauth/authorize")
async def authorize_slack():
    """Generate the Slack OAuth authorization URL"""
    # Check for missing credentials and provide detailed feedback
    missing_keys = []
    if not SLACK_CLIENT_ID:
        missing_keys.append("SLACK_CLIENT_ID")
    if not SLACK_CLIENT_SECRET:
        missing_keys.append("SLACK_CLIENT_SECRET")

    if missing_keys:
        missing_keys_str = ", ".join(missing_keys)
        raise HTTPException(
            status_code=400,
            detail={
                "error": "missing_credentials",
                "message": f"Slack credentials not configured: {missing_keys_str}",
                "missing_keys": missing_keys,
            },
        )

    try:
        validate_redirect_uri()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    from urllib.parse import urlencode

    # Updated scopes to include app_mentions:read for mention triggers
    params = {
        "client_id": SLACK_CLIENT_ID,
        "scope": "channels:read,chat:write,team:read,app_mentions:read,im:read,im:history",
        "redirect_uri": SLACK_REDIRECT_URI,
    }

    auth_url = f"{SLACK_OAUTH_URL}?{urlencode(params)}"
    return {"auth_url": auth_url}


@router.get("/oauth/callback", response_model=SlackOAuthResponse)
async def slack_oauth_callback(code: str, request: Request, db: Session = Depends(get_db)):
    """Handle the Slack OAuth callback and store the tokens"""
    if not SLACK_CLIENT_ID or not SLACK_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Slack API credentials are not configured")

    try:
        validate_redirect_uri()
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # Exchange the authorization code for access tokens
    try:
        response = requests.post(
            SLACK_TOKEN_URL,
            data={
                "client_id": SLACK_CLIENT_ID,
                "client_secret": SLACK_CLIENT_SECRET,
                "code": code,
                "redirect_uri": SLACK_REDIRECT_URI,
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        token_data = response.json()

        if not token_data.get("ok", False):
            raise HTTPException(status_code=400, detail=f"Slack error: {token_data.get('error')}")

        # Store the tokens securely
        bot_token = token_data.get("access_token")
        if not bot_token:
            raise HTTPException(status_code=400, detail="Bot token not found in OAuth response")

        try:
            key_management.set_env_variable("SLACK_BOT_TOKEN", bot_token)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to store token: {str(e)}")

        # Extract team information
        team_id = token_data.get("team", {}).get("id")
        team_name = token_data.get("team", {}).get("name")

        if not team_id or not team_name:
            raise HTTPException(
                status_code=400, detail="Team information not found in OAuth response"
            )

        # Create a default agent for this workspace
        agent = SlackAgentModel(
            name=f"{team_name} Agent",
            slack_team_id=team_id,
            slack_team_name=team_name,
        )
        db.add(agent)
        db.commit()
        db.refresh(agent)

        return SlackOAuthResponse(
            success=True,
            message="Slack authentication successful",
            team_name=team_name,
        )

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Slack: {str(e)}")


@router.get("/agents", response_model=List[SlackAgentResponse])
async def get_agents(db: Session = Depends(get_db)):
    """Get all configured Slack agents"""
    agents = db.query(SlackAgentModel).all()

    agent_responses = []
    for agent in agents:
        agent_dict = {
            "id": agent.id,
            "name": agent.name,
            "slack_team_id": agent.slack_team_id,
            "slack_team_name": agent.slack_team_name,
            "slack_channel_id": agent.slack_channel_id,
            "slack_channel_name": agent.slack_channel_name,
            "is_active": bool(agent.is_active),
            "workflow_id": agent.workflow_id,
            "trigger_on_mention": bool(agent.trigger_on_mention),
            "trigger_on_direct_message": bool(agent.trigger_on_direct_message),
            "trigger_on_channel_message": bool(agent.trigger_on_channel_message),
            "trigger_keywords": agent.trigger_keywords,
            "trigger_enabled": bool(agent.trigger_enabled),
            "has_bot_token": False if agent.has_bot_token is None else bool(agent.has_bot_token),
            "has_user_token": False if agent.has_user_token is None else bool(agent.has_user_token),
            "last_token_update": agent.last_token_update,
            "spur_type": getattr(agent, "spur_type", "workflow") or "workflow",
            "created_at": getattr(agent, "created_at", ""),
        }
        agent_responses.append(SlackAgentResponse(**agent_dict))

    return agent_responses


@router.post("/agents", response_model=SlackAgentResponse)
async def create_agent(agent_create: SlackAgentCreate, db: Session = Depends(get_db)):
    """Create a new Slack agent configuration"""
    # Create a new agent from the agent_create fields
    new_agent = SlackAgentModel(
        name=agent_create.name,
        slack_team_id=agent_create.slack_team_id,
        slack_team_name=agent_create.slack_team_name,
        slack_channel_id=agent_create.slack_channel_id,
        slack_channel_name=agent_create.slack_channel_name,
        is_active=bool(agent_create.is_active),
        workflow_id=agent_create.workflow_id,
        trigger_on_mention=bool(agent_create.trigger_on_mention),
        trigger_on_direct_message=bool(agent_create.trigger_on_direct_message),
        trigger_on_channel_message=bool(agent_create.trigger_on_channel_message),
        trigger_keywords=agent_create.trigger_keywords,
        trigger_enabled=bool(agent_create.trigger_enabled),
        has_bot_token=False
        if agent_create.has_bot_token is None
        else bool(agent_create.has_bot_token),
        has_user_token=False
        if agent_create.has_user_token is None
        else bool(agent_create.has_user_token),
        last_token_update=agent_create.last_token_update,
        spur_type=agent_create.spur_type or "workflow",
    )

    db.add(new_agent)
    db.commit()
    db.refresh(new_agent)

    # Convert the agent to a Pydantic model with proper boolean values
    agent_dict = {
        "id": new_agent.id,
        "name": new_agent.name,
        "slack_team_id": new_agent.slack_team_id,
        "slack_team_name": new_agent.slack_team_name,
        "slack_channel_id": new_agent.slack_channel_id,
        "slack_channel_name": new_agent.slack_channel_name,
        "is_active": bool(new_agent.is_active),
        "workflow_id": new_agent.workflow_id,
        "trigger_on_mention": bool(new_agent.trigger_on_mention),
        "trigger_on_direct_message": bool(new_agent.trigger_on_direct_message),
        "trigger_on_channel_message": bool(new_agent.trigger_on_channel_message),
        "trigger_keywords": new_agent.trigger_keywords,
        "trigger_enabled": bool(new_agent.trigger_enabled),
        "has_bot_token": False
        if new_agent.has_bot_token is None
        else bool(new_agent.has_bot_token),
        "has_user_token": False
        if new_agent.has_user_token is None
        else bool(new_agent.has_user_token),
        "last_token_update": new_agent.last_token_update,
        "spur_type": getattr(new_agent, "spur_type", "workflow") or "workflow",
        "created_at": getattr(new_agent, "created_at", ""),
    }
    return SlackAgentResponse(**agent_dict)


@router.get("/agents/{agent_id}", response_model=SlackAgentResponse)
async def get_agent(agent_id: int, db: Session = Depends(get_db)):
    """Get a specific Slack agent by ID"""
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Convert the agent to a Pydantic model with proper boolean values
    agent_dict = {
        "id": agent.id,
        "name": agent.name,
        "slack_team_id": agent.slack_team_id,
        "slack_team_name": agent.slack_team_name,
        "slack_channel_id": agent.slack_channel_id,
        "slack_channel_name": agent.slack_channel_name,
        "is_active": bool(agent.is_active),
        "workflow_id": agent.workflow_id,
        "trigger_on_mention": bool(agent.trigger_on_mention),
        "trigger_on_direct_message": bool(agent.trigger_on_direct_message),
        "trigger_on_channel_message": bool(agent.trigger_on_channel_message),
        "trigger_keywords": agent.trigger_keywords,
        "trigger_enabled": bool(agent.trigger_enabled),
        "has_bot_token": False if agent.has_bot_token is None else bool(agent.has_bot_token),
        "has_user_token": False if agent.has_user_token is None else bool(agent.has_user_token),
        "last_token_update": agent.last_token_update,
        "spur_type": getattr(agent, "spur_type", "workflow") or "workflow",
        "created_at": getattr(agent, "created_at", ""),
    }
    return SlackAgentResponse(**agent_dict)


@router.post("/agents/{agent_id}/send-message", response_model=SlackMessageResponse)
async def send_agent_message(agent_id: int, message: SlackMessage, db: Session = Depends(get_db)):
    """Send a message to a Slack channel using a specific agent's token"""
    # Get the agent
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Get the agent's bot token
    token_store = get_token_store()
    bot_token = token_store.get_token(agent_id=agent_id, token_type="bot_token")

    if not bot_token:
        raise HTTPException(status_code=400, detail="This agent has no bot token configured")

    # Send the message to Slack
    try:
        response = requests.post(
            SLACK_POST_MESSAGE_URL,
            headers={"Authorization": f"Bearer {bot_token}"},
            json={
                "channel": message.channel,
                "text": message.text,
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        result = response.json()

        if not result.get("ok", False):
            raise HTTPException(status_code=400, detail=f"Slack error: {result.get('error')}")

        return SlackMessageResponse(
            success=True, message="Message sent successfully", ts=result.get("ts")
        )

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Slack: {str(e)}")


@router.post("/send-message", response_model=SlackMessageResponse)
async def send_message(
    message: SlackMessage, agent_id: Optional[int] = None, db: Session = Depends(get_db)
):
    """Send a message to a Slack channel.
    If agent_id is provided, uses that agent's token. Otherwise, uses the global bot token.
    """
    bot_token = None

    # If agent_id is provided, get the agent's token
    if agent_id is not None:
        agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
        if agent is None:
            raise HTTPException(status_code=404, detail="Agent not found")

        token_store = get_token_store()
        bot_token = token_store.get_token(agent_id=agent_id, token_type="bot_token")

    # Fall back to the global bot token if needed
    if not bot_token:
        bot_token = os.getenv("SLACK_BOT_TOKEN")
        if not bot_token:
            raise HTTPException(status_code=500, detail="No Slack bot token configured")

    # Send the message to Slack
    try:
        response = requests.post(
            SLACK_POST_MESSAGE_URL,
            headers={"Authorization": f"Bearer {bot_token}"},
            json={
                "channel": message.channel,
                "text": message.text,
            },
            timeout=REQUEST_TIMEOUT,
        )
        response.raise_for_status()
        result = response.json()

        if not result.get("ok", False):
            raise HTTPException(status_code=400, detail=f"Slack error: {result.get('error')}")

        return SlackMessageResponse(
            success=True, message="Message sent successfully", ts=result.get("ts")
        )

    except requests.RequestException as e:
        raise HTTPException(status_code=500, detail=f"Error communicating with Slack: {str(e)}")


@router.post("/test-message", response_model=SlackMessageResponse)
async def test_message(channel: str, text: str = "Hello from PySpur! This is a test message."):
    """Test sending a message to a Slack channel"""
    message = SlackMessage(channel=channel, text=text)
    return await send_message(message)


@router.put("/agents/{agent_id}/workflow", response_model=SlackAgentResponse)
async def associate_workflow(
    agent_id: int, association: WorkflowAssociation, db: Session = Depends(get_db)
):
    """Associate a workflow with a Slack agent"""
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Update agent - use setattr to avoid Column typing issues
    agent.workflow_id = association.workflow_id
    db.commit()
    db.refresh(agent)

    # Convert the agent to a Pydantic model with proper boolean values
    agent_dict = {
        "id": agent.id,
        "name": agent.name,
        "slack_team_id": agent.slack_team_id,
        "slack_team_name": agent.slack_team_name,
        "slack_channel_id": agent.slack_channel_id,
        "slack_channel_name": agent.slack_channel_name,
        "is_active": bool(agent.is_active),
        "workflow_id": agent.workflow_id,
        "trigger_on_mention": bool(agent.trigger_on_mention),
        "trigger_on_direct_message": bool(agent.trigger_on_direct_message),
        "trigger_on_channel_message": bool(agent.trigger_on_channel_message),
        "trigger_keywords": agent.trigger_keywords,
        "trigger_enabled": bool(agent.trigger_enabled),
        "has_bot_token": False if agent.has_bot_token is None else bool(agent.has_bot_token),
        "has_user_token": False if agent.has_user_token is None else bool(agent.has_user_token),
        "last_token_update": agent.last_token_update,
        "spur_type": getattr(agent, "spur_type", "workflow") or "workflow",
        "created_at": getattr(agent, "created_at", ""),
    }
    return SlackAgentResponse(**agent_dict)


@router.put("/agents/{agent_id}/trigger-config", response_model=SlackAgentResponse)
async def update_trigger_config(
    agent_id: int, config: SlackTriggerConfig, db: Session = Depends(get_db)
):
    """Update the trigger configuration for a Slack agent"""
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Update agent - use setattr to avoid Column typing issues
    agent.trigger_on_mention = config.trigger_on_mention
    agent.trigger_on_direct_message = config.trigger_on_direct_message
    agent.trigger_on_channel_message = config.trigger_on_channel_message
    agent.trigger_keywords = config.trigger_keywords
    agent.trigger_enabled = config.trigger_enabled

    db.commit()
    db.refresh(agent)

    # Convert the agent to a Pydantic model with proper boolean values
    agent_dict = {
        "id": agent.id,
        "name": agent.name,
        "slack_team_id": agent.slack_team_id,
        "slack_team_name": agent.slack_team_name,
        "slack_channel_id": agent.slack_channel_id,
        "slack_channel_name": agent.slack_channel_name,
        "is_active": bool(agent.is_active),
        "workflow_id": agent.workflow_id,
        "trigger_on_mention": bool(agent.trigger_on_mention),
        "trigger_on_direct_message": bool(agent.trigger_on_direct_message),
        "trigger_on_channel_message": bool(agent.trigger_on_channel_message),
        "trigger_keywords": agent.trigger_keywords,
        "trigger_enabled": bool(agent.trigger_enabled),
        "has_bot_token": False if agent.has_bot_token is None else bool(agent.has_bot_token),
        "has_user_token": False if agent.has_user_token is None else bool(agent.has_user_token),
        "last_token_update": agent.last_token_update,
        "spur_type": getattr(agent, "spur_type", "workflow") or "workflow",
        "created_at": getattr(agent, "created_at", ""),
    }
    return SlackAgentResponse(**agent_dict)


@router.put("/agents/{agent_id}", response_model=SlackAgentResponse)
async def update_agent(
    agent_id: int, agent_update: SlackAgentUpdate, db: Session = Depends(get_db)
):
    """Update a Slack agent configuration"""
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Update agent from the agent_update fields
    update_data = agent_update.dict(exclude_unset=True)

    # Ensure boolean fields are properly converted
    for field in update_data:
        if field in ["has_bot_token", "has_user_token"]:
            # Ensure token fields are not None
            value = update_data[field]
            setattr(agent, field, False if value is None else bool(value))
        elif field in [
            "is_active",
            "trigger_on_mention",
            "trigger_on_direct_message",
            "trigger_on_channel_message",
            "trigger_enabled",
        ]:
            # Other boolean fields
            setattr(agent, field, bool(update_data[field]))
        else:
            # Non-boolean fields
            setattr(agent, field, update_data[field])

    db.commit()
    db.refresh(agent)

    # Convert the agent to a Pydantic model with proper boolean values
    agent_dict = {
        "id": agent.id,
        "name": agent.name,
        "slack_team_id": agent.slack_team_id,
        "slack_team_name": agent.slack_team_name,
        "slack_channel_id": agent.slack_channel_id,
        "slack_channel_name": agent.slack_channel_name,
        "is_active": bool(agent.is_active),
        "workflow_id": agent.workflow_id,
        "trigger_on_mention": bool(agent.trigger_on_mention),
        "trigger_on_direct_message": bool(agent.trigger_on_direct_message),
        "trigger_on_channel_message": bool(agent.trigger_on_channel_message),
        "trigger_keywords": agent.trigger_keywords,
        "trigger_enabled": bool(agent.trigger_enabled),
        "has_bot_token": False if agent.has_bot_token is None else bool(agent.has_bot_token),
        "has_user_token": False if agent.has_user_token is None else bool(agent.has_user_token),
        "last_token_update": agent.last_token_update,
        "spur_type": getattr(agent, "spur_type", "workflow") or "workflow",
        "created_at": getattr(agent, "created_at", ""),
    }
    return SlackAgentResponse(**agent_dict)


# Helper function to start a workflow run using the existing workflow execution system
async def start_workflow_run(
    db: Session, workflow_id: str, run_input: Dict[str, Any], background_tasks: BackgroundTasks
) -> RunModel:
    """Start a workflow run with the given input data using the standard workflow execution system."""
    # First, check if the workflow exists
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == workflow_id).first()
    if not workflow:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Get the input node ID from the workflow
    workflow_definition = workflow.definition
    input_node = next(
        (node for node in workflow_definition["nodes"] if node["node_type"] == "InputNode"), None
    )

    if not input_node:
        raise HTTPException(status_code=400, detail="Workflow has no input node")

    # Create the request payload with the input data
    initial_inputs = {input_node["id"]: run_input}
    start_run_request = StartRunRequestSchema(initial_inputs=initial_inputs)

    # Use the standard workflow execution system to run the workflow
    run_response = await run_workflow_non_blocking(
        workflow_id=workflow_id,
        start_run_request=start_run_request,
        background_tasks=background_tasks,
        db=db,
        run_type="slack_triggered",
    )

    # Extract the RunModel from the response
    return db.query(RunModel).filter(RunModel.id == run_response.id).first()


@router.post("/trigger-workflow", response_model=WorkflowTriggersResponse)
async def trigger_workflow(
    request: WorkflowTriggerRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Trigger workflows based on a Slack event"""
    result = WorkflowTriggersResponse(triggered_workflows=[])

    # Find agents that match the team ID
    agents = (
        db.query(SlackAgentModel)
        .filter(
            SlackAgentModel.slack_team_id == request.team_id,
            SlackAgentModel.is_active.is_(True),
            SlackAgentModel.trigger_enabled.is_(True),
            SlackAgentModel.workflow_id.isnot(None),
        )
        .all()
    )

    if not agents:
        return result

    # Process each agent to see if it should be triggered
    for agent in agents:
        # Cast SQLAlchemy Column types to Python types for the constructor
        agent_id = cast(int, agent.id)
        workflow_id = cast(str, agent.workflow_id)

        trigger_result = WorkflowTriggerResult(
            agent_id=agent_id,
            workflow_id=workflow_id,
            status="skipped",
        )

        # Check if this agent should be triggered based on the event type
        should_trigger = False

        # Check mention trigger - convert SQLAlchemy Column to bool for comparison
        if bool(agent.trigger_on_mention) and request.event_type == "app_mention":
            should_trigger = True

        # Check direct message trigger
        elif (
            bool(agent.trigger_on_direct_message)
            and request.event_type == "message"
            and request.event_data.get("channel_type") == "im"
        ):
            should_trigger = True

        # Check channel message trigger
        elif (
            bool(agent.trigger_on_channel_message)
            and request.event_type == "message"
            and request.event_data.get("channel_type") in ["channel", "group"]
        ):
            # If keywords are specified, check if any are in the message
            keywords = getattr(agent, "trigger_keywords", None)
            if keywords and isinstance(keywords, list):
                # Make sure keywords is a list of strings before using len
                str_keywords = [str(k) for k in keywords if k is not None]
                if len(str_keywords) > 0:
                    message_text = request.text.lower()
                    for keyword in str_keywords:
                        if keyword.lower() in message_text:
                            should_trigger = True
                            break
            else:
                should_trigger = True

        if should_trigger:
            try:
                # Prepare the run input
                run_input = {
                    "message": request.text,
                    "channel_id": request.channel_id,
                    "user_id": request.user_id,
                    "event_type": request.event_type,
                    "event_data": request.event_data,
                    "timestamp": datetime.now(UTC).isoformat(),  # Use timezone-aware datetime
                }

                # Start the workflow run using the standard workflow execution system
                run = await start_workflow_run(
                    db=db,
                    workflow_id=cast(str, agent.workflow_id),
                    run_input=run_input,
                    background_tasks=background_tasks,
                )

                trigger_result.status = "triggered"
                trigger_result.run_id = run.id

            except Exception as e:
                trigger_result.status = "error"
                trigger_result.error = str(e)

        result.triggered_workflows.append(trigger_result)

    return result


@router.post("/events", status_code=200)
async def slack_events(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Handle Slack events from the Events API"""
    data = await request.json()

    # Handle Slack URL verification challenge
    if data.get("type") == "url_verification":
        return {"challenge": data.get("challenge")}

    # Process other events
    event = data.get("event", {})
    event_type = event.get("type")

    if not event_type:
        return {"ok": True}

    # Extract relevant data
    team_id = data.get("team_id")
    user_id = event.get("user")
    channel_id = event.get("channel")
    text = event.get("text", "")

    # Skip bot messages to avoid loops
    if event.get("bot_id") or user_id == "USLACKBOT":
        return {"ok": True}

    # Create a trigger request
    trigger_request = WorkflowTriggerRequest(
        text=text,
        channel_id=channel_id,
        user_id=user_id,
        team_id=team_id,
        event_type=event_type,
        event_data=event,
    )

    # Process asynchronously to respond to Slack quickly
    background_tasks.add_task(trigger_workflow, trigger_request, background_tasks, db)

    return {"ok": True}


@router.post("/create-default-agent", response_model=SlackAgentResponse)
async def create_default_agent(db: Session = Depends(get_db)):
    """Create a default Slack agent for a basic setup"""
    # Check if a default agent already exists
    default_agent = (
        db.query(SlackAgentModel).filter(SlackAgentModel.name == "Default Agent").first()
    )

    if not default_agent:
        # Create a new default agent
        default_agent = SlackAgentModel(
            name="Default Agent",
            slack_team_id="T00000000",  # Placeholder
            slack_team_name="Default Team",
            slack_channel_id=None,
            slack_channel_name=None,
            is_active=True,
            workflow_id=None,
            trigger_on_mention=True,
            trigger_on_direct_message=True,
            trigger_on_channel_message=False,
            trigger_keywords=None,
            trigger_enabled=True,
            has_bot_token=False,
            has_user_token=False,
            spur_type="default",
        )

        db.add(default_agent)
        db.commit()
        db.refresh(default_agent)

    # Convert the agent to a Pydantic model with proper boolean values
    agent_dict = {
        "id": default_agent.id,
        "name": default_agent.name,
        "slack_team_id": default_agent.slack_team_id,
        "slack_team_name": default_agent.slack_team_name,
        "slack_channel_id": default_agent.slack_channel_id,
        "slack_channel_name": default_agent.slack_channel_name,
        "is_active": bool(default_agent.is_active),
        "workflow_id": default_agent.workflow_id,
        "trigger_on_mention": bool(default_agent.trigger_on_mention),
        "trigger_on_direct_message": bool(default_agent.trigger_on_direct_message),
        "trigger_on_channel_message": bool(default_agent.trigger_on_channel_message),
        "trigger_keywords": default_agent.trigger_keywords,
        "trigger_enabled": bool(default_agent.trigger_enabled),
        "has_bot_token": False
        if default_agent.has_bot_token is None
        else bool(default_agent.has_bot_token),
        "has_user_token": False
        if default_agent.has_user_token is None
        else bool(default_agent.has_user_token),
        "last_token_update": default_agent.last_token_update,
        "spur_type": getattr(default_agent, "spur_type", "default") or "default",
        "created_at": getattr(default_agent, "created_at", ""),
    }
    return SlackAgentResponse(**agent_dict)


@router.post("/agents/{agent_id}/tokens", response_model=AgentTokenResponse)
async def set_agent_token(
    agent_id: int, token_request: AgentTokenRequest, db: Session = Depends(get_db)
):
    """Set a token for a Slack agent"""
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    token_store = get_token_store()
    token_key = f"slack_{token_request.token_type}_{agent_id}"

    # Store the token
    token_store.set_token(token_key, token_request.token)

    # Mask the token for the response
    masked_token = token_store.mask_token(token_request.token)

    # Update agent token flag
    if token_request.token_type == "bot_token":
        agent.has_bot_token = True
    elif token_request.token_type == "user_token":
        agent.has_user_token = True

    current_timestamp = datetime.now(UTC).isoformat()
    agent.last_token_update = current_timestamp
    db.commit()
    db.refresh(agent)

    return AgentTokenResponse(
        agent_id=agent_id,
        token_type=token_request.token_type,
        masked_token=masked_token,
        updated_at=current_timestamp,
    )


@router.get("/agents/{agent_id}/tokens/{token_type}", response_model=AgentTokenResponse)
async def get_agent_token(agent_id: int, token_type: str, db: Session = Depends(get_db)):
    """Get a masked token for a Slack agent"""
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    if token_type not in ["bot_token", "user_token"]:
        raise HTTPException(status_code=400, detail="Invalid token type")

    token_store = get_token_store()
    token_key = f"slack_{token_type}_{agent_id}"

    # Get the token
    token = token_store.get_token(token_key)
    if not token:
        raise HTTPException(status_code=404, detail=f"No {token_type} found for this agent")

    # Mask the token for the response
    masked_token = token_store.mask_token(token)

    # Get the last update timestamp
    last_token_update = str(agent.last_token_update) if agent.last_token_update else None

    return AgentTokenResponse(
        agent_id=agent_id,
        token_type=token_type,
        masked_token=masked_token,
        updated_at=last_token_update,
    )


@router.delete("/agents/{agent_id}/tokens/{token_type}", status_code=204)
async def delete_agent_token(agent_id: int, token_type: str, db: Session = Depends(get_db)):
    """Delete a token for a Slack agent"""
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    if token_type not in ["bot_token", "user_token"]:
        raise HTTPException(status_code=400, detail="Invalid token type")

    token_store = get_token_store()
    token_key = f"slack_{token_type}_{agent_id}"

    # Delete the token
    token_store.delete_token(token_key)

    # Update agent token flag
    if token_type == "bot_token":
        agent.has_bot_token = False
    elif token_type == "user_token":
        agent.has_user_token = False

    current_timestamp = datetime.now(UTC).isoformat()
    agent.last_token_update = current_timestamp
    db.commit()

    return None

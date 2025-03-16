import os
from datetime import UTC, datetime
from typing import Any, Dict, List, cast

import requests
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.run_model import RunModel
from ..models.slack_agent_model import SlackAgentModel
from ..models.workflow_model import WorkflowModel
from ..schemas.run_schemas import StartRunRequestSchema
from ..schemas.slack_schemas import (
    SlackAgentCreate,
    SlackAgentResponse,
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
    def mask_value(value):
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
    return agents


@router.post("/agents", response_model=SlackAgentResponse)
async def create_agent(agent: SlackAgentCreate, db: Session = Depends(get_db)):
    """Create a new Slack agent"""
    db_agent = SlackAgentModel(**agent.model_dump())
    db.add(db_agent)
    db.commit()
    db.refresh(db_agent)
    return db_agent


@router.get("/agents/{agent_id}", response_model=SlackAgentResponse)
async def get_agent(agent_id: int, db: Session = Depends(get_db)):
    """Get a specific Slack agent by ID"""
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")
    return agent


@router.post("/send-message", response_model=SlackMessageResponse)
async def send_message(message: SlackMessage):
    """Send a message to a Slack channel"""
    # Get the Slack bot token from environment
    bot_token = os.getenv("SLACK_BOT_TOKEN")
    if not bot_token:
        raise HTTPException(status_code=500, detail="SLACK_BOT_TOKEN is not configured")

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

    # Verify workflow exists
    workflow = db.query(WorkflowModel).filter(WorkflowModel.id == association.workflow_id).first()
    if workflow is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    # Update agent - use setattr to avoid Column typing issues
    agent.workflow_id = association.workflow_id
    db.commit()
    db.refresh(agent)
    return agent


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
    return agent


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

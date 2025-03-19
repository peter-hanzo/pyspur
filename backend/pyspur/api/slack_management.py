import os
from datetime import UTC, datetime
from typing import Any, Dict, List, Optional, cast

import requests
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
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
    SlackTriggerConfig,
    WorkflowAssociation,
    WorkflowTriggerRequest,
    WorkflowTriggerResult,
    WorkflowTriggersResponse,
)
from .secure_token_store import get_token_store
from .workflow_run import run_workflow_non_blocking

router = APIRouter()

# API Endpoints
SLACK_API_URL = "https://slack.com/api"
SLACK_POST_MESSAGE_URL = "https://slack.com/api/chat.postMessage"

# Request timeout (in seconds)
REQUEST_TIMEOUT = 10


@router.get("/config/status")
async def get_slack_config_status():
    """Check if Slack configuration is complete and return the status"""
    # Check if the required environment variables are set
    bot_token = os.getenv("SLACK_BOT_TOKEN", "")

    # Return the configuration status
    return {
        "configured": bool(bot_token),
        "missing_keys": [] if bot_token else ["SLACK_BOT_TOKEN"],
    }


@router.get("/required-keys")
async def get_slack_required_keys():
    """Get information about the required Slack API keys and their current status"""
    # Get current values (masked for security)
    bot_token = os.getenv("SLACK_BOT_TOKEN", "")

    # Function to mask key values for display
    def mask_value(value: str) -> str:
        if not value:
            return ""
        if len(value) <= 8:
            return "*" * len(value)
        return value[:4] + "*" * (len(value) - 8) + value[-4:]

    # Create a list of required keys with detailed information
    keys_info = [
        {
            "name": "SLACK_BOT_TOKEN",
            "description": "Bot Token from your Slack App, starting with 'xoxb-'",
            "configured": bool(bot_token),
            "masked_value": mask_value(bot_token),
            "required": True,
            "purpose": "Used to send messages and interact with Slack API",
            "help_url": "https://api.slack.com/authentication/token-types",
        },
    ]

    # Check if all required keys are configured
    all_required_configured = all(key["configured"] for key in keys_info if key["required"])

    return {
        "configured": all_required_configured,
        "keys": keys_info,
    }


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
    # Ensure workflow_id is provided
    if not agent_create.workflow_id:
        raise HTTPException(
            status_code=400,
            detail="workflow_id is required - every agent must be associated with a workflow",
        )

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
    channel: str, text: str, agent_id: Optional[int] = None, db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Send a message to a Slack channel.

    Args:
        channel: The name of the channel to send the message to.
        text: The text of the message to send.
        agent_id: The ID of the agent to use for sending the message.
        db: Database session.

    Returns:
        A dictionary containing metadata about the sent message.

    """
    import logging

    logger = logging.getLogger("pyspur")
    logger.info(f"Attempting to send message to channel '{channel}' with agent_id: {agent_id}")

    # Initialize WebClient with the bot token
    token = None

    # If agent_id is provided, try to get the agent-specific token
    if agent_id is not None:
        # Try to get the agent
        logger.info(f"Searching for agent with ID: {agent_id}")
        agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()

        if agent:
            logger.info(f"Found agent '{agent.name}' with has_bot_token={agent.has_bot_token}")

            # If agent has a bot token, retrieve it
            if agent.has_bot_token:
                logger.info(f"Retrieving bot token for agent {agent_id}")
                token_store = get_token_store()
                token = token_store.get_token(agent_id, "bot_token")
                logger.info(f"Token retrieved: {'Yes' if token else 'No'}")
        else:
            logger.error(f"Agent with ID {agent_id} not found")

    # If no agent-specific token, try to use the default token from environment
    if not token:
        logger.info("No agent-specific token found, using environment variables")
        token = os.getenv("SLACK_BOT_TOKEN")

    if not token:
        logger.error("No Slack bot token configured")
        raise HTTPException(
            status_code=500,
            detail={
                "message": "No Slack bot token configured",
                "success": False,
            },
        )

    try:
        client = WebClient(token=token)
        logger.info(f"Sending message to channel '{channel}'")

        # Send the message
        response = client.chat_postMessage(
            channel=channel,
            text=text,
        )

        logger.info(f"Message sent successfully: {response['ok']}")
        # Return the response
        return {
            "ts": response["ts"],
            "channel": response["channel"],
            "message": "Message sent successfully",  # Changed from response["message"] to a string
            "success": True,
        }
    except SlackApiError as e:
        logger.error(f"Error sending message to Slack: {str(e)}")
        # If there was an error, raise an HTTPException
        raise HTTPException(
            status_code=500,
            detail={
                "message": f"Error sending message to Slack: {str(e)}",
                "success": False,
            },
        )


@router.post("/test-message", response_model=SlackMessageResponse)
async def test_message(
    channel: str,
    text: str = "Hello from PySpur! This is a test message.",
    agent_id: Optional[int] = None,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """Test sending a message to a Slack channel"""
    response = await send_message(channel=channel, text=text, agent_id=agent_id, db=db)
    return response


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
    masked_token = token_store.store_token(agent_id, token_request.token_type, token_request.token)

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

    # Get the token
    token = token_store.get_token(agent_id, token_type)
    if not token:
        raise HTTPException(status_code=404, detail=f"No {token_type} found for this agent")

    # Mask the token for the response
    masked_token = token_store._mask_token(token)

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

    # Delete the token
    token_store.delete_token(agent_id, token_type)

    # Update agent token flag
    if token_type == "bot_token":
        agent.has_bot_token = False
    elif token_type == "user_token":
        agent.has_user_token = False

    current_timestamp = datetime.now(UTC).isoformat()
    agent.last_token_update = current_timestamp
    db.commit()

    return None


@router.delete("/agents/{agent_id}", status_code=204)
async def delete_agent(agent_id: int, db: Session = Depends(get_db)):
    """Delete a Slack agent by ID"""
    agent = db.query(SlackAgentModel).filter(SlackAgentModel.id == agent_id).first()
    if agent is None:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Delete any associated tokens
    token_store = get_token_store()
    token_store.delete_token(agent_id, "bot_token")
    token_store.delete_token(agent_id, "user_token")

    # Delete the agent
    db.delete(agent)
    db.commit()

    return None


@router.post("/set-token", response_model=dict)
async def set_slack_token(request: Request):
    """Directly set the Slack bot token"""
    try:
        data = await request.json()
        token = data.get("token")

        if not token:
            raise HTTPException(status_code=400, detail="Token is required")

        # Store the token
        try:
            key_management.set_env_variable("SLACK_BOT_TOKEN", token)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to store token: {str(e)}")

        return {"success": True, "message": "Slack token has been set successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error setting Slack token: {str(e)}")

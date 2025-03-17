from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SlackAgentCreate(BaseModel):
    """Request schema for creating a Slack agent."""

    name: str
    slack_channel_id: Optional[str] = None
    slack_channel_name: Optional[str] = None
    workflow_id: Optional[str] = None
    trigger_on_mention: bool = True
    trigger_on_direct_message: bool = True
    trigger_on_channel_message: bool = False
    trigger_keywords: List[str] = Field(default_factory=list)
    trigger_enabled: bool = True


class SlackAgentResponse(BaseModel):
    """Response schema for Slack agent information."""

    id: int
    name: str
    slack_team_id: Optional[str] = None
    slack_team_name: Optional[str] = None
    slack_channel_id: Optional[str] = None
    slack_channel_name: Optional[str] = None
    is_active: bool
    workflow_id: Optional[str] = None
    trigger_on_mention: bool = True
    trigger_on_direct_message: bool = True
    trigger_on_channel_message: bool = False
    trigger_keywords: List[str] = Field(default_factory=list)
    trigger_enabled: bool = True

    model_config = {"from_attributes": True}


class SlackDirectTokenConfig(BaseModel):
    """Request schema for configuring Slack with a direct token."""

    bot_token: str
    description: Optional[str] = "Manually configured Slack bot token"


class SlackMessage(BaseModel):
    """Schema for Slack messages."""

    channel: str
    text: str


class WorkflowAssociation(BaseModel):
    """Schema for associating a workflow with a Slack agent."""

    workflow_id: str


class SlackTriggerConfig(BaseModel):
    """Configuration schema for Slack triggers."""

    trigger_on_mention: bool = True
    trigger_on_direct_message: bool = True
    trigger_on_channel_message: bool = False
    trigger_keywords: List[str] = Field(default_factory=list)
    trigger_enabled: bool = True


class WorkflowTriggerRequest(BaseModel):
    """Request schema for triggering a workflow from Slack."""

    text: str
    channel_id: str
    user_id: str
    team_id: str
    event_type: str = "message"  # message, mention, etc.
    event_data: Dict[str, Any] = Field(default_factory=dict)


class SlackOAuthResponse(BaseModel):
    """Response schema for Slack OAuth callback."""

    success: bool
    message: str
    team_name: Optional[str] = None


class SlackMessageResponse(BaseModel):
    """Response schema for sending a message to Slack."""

    success: bool
    message: str
    ts: Optional[str] = None


class WorkflowTriggerResult(BaseModel):
    """Single result for a triggered workflow."""

    agent_id: int
    workflow_id: str
    run_id: Optional[str] = None
    status: str
    error: Optional[str] = None


class WorkflowTriggersResponse(BaseModel):
    """Response schema for triggering workflows from Slack."""

    triggered_workflows: List[WorkflowTriggerResult] = Field(default_factory=list)


class TemplateWorkflowResponse(BaseModel):
    """Response schema for creating a template Slack workflow."""

    id: str
    name: str
    description: str
    message: str

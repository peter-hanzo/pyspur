from sqlalchemy import JSON, Boolean, Column, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from .base_model import BaseModel


class SlackAgentModel(BaseModel):
    """Model for storing Slack agent configurations"""

    __tablename__ = "slack_agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    slack_team_id = Column(String, index=True)
    slack_team_name = Column(String)
    slack_channel_id = Column(String)
    slack_channel_name = Column(String)
    is_active = Column(Boolean, default=True)

    # Workflow association
    workflow_id = Column(String, ForeignKey("workflows.id"), nullable=True)
    workflow = relationship("WorkflowModel", backref="slack_agents")

    # Trigger configuration
    trigger_on_mention = Column(Boolean, default=True)
    trigger_on_direct_message = Column(Boolean, default=True)
    trigger_on_channel_message = Column(Boolean, default=False)
    trigger_keywords = Column(JSON, default=list)
    trigger_enabled = Column(Boolean, default=True)

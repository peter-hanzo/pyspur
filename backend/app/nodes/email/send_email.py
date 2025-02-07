from pydantic import BaseModel, Field
from typing import Dict

from ..base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from .providers.base import (
    EmailProvider,
    EmailProviderConfig,
    EmailMessage,
    EmailResponse,
)
from .providers.registry import EmailProviderRegistry
from ..utils.template_utils import render_template_or_get_first_string


class SendEmailNodeConfig(BaseNodeConfig):
    provider: EmailProvider = Field(
        EmailProvider.RESEND,
        description="The email provider to use",
    )
    from_template: str = Field("", description="Email address to send from")
    to_template: str = Field("", description="Email address to send to")
    subject_template: str = Field("", description="Email subject")
    content_template: str = Field("", description="Email content (plain text)")
    output_schema: Dict[str, str] = Field(
        default={
            "provider": "string",
            "message_id": "string",
            "status": "string",
            "raw_response": "string",
        },
        description="The schema for the output of the node",
    )
    has_fixed_output: bool = True


class SendEmailNodeInput(BaseNodeInput):
    """Input for the email node"""

    class Config:
        extra = "allow"


class SendEmailNodeOutput(BaseNodeOutput):
    provider: EmailProvider = Field(..., description="The email provider used")
    message_id: str = Field(..., description="The message ID from the provider")
    status: str = Field(..., description="The status of the email send operation")
    raw_response: str = Field(
        ..., description="The raw response from the provider as JSON string"
    )


class SendEmailNode(BaseNode):
    """Node for sending an email"""

    name = "send_email_node"
    display_name = "Send Email"

    config_model = SendEmailNodeConfig
    input_model = SendEmailNodeInput
    output_model = SendEmailNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        # Create provider config
        provider_config = EmailProviderConfig()

        # Get the appropriate provider instance
        provider = EmailProviderRegistry.get_provider(
            self.config.provider, provider_config
        )

        # Render the templates
        raw_input_dict = input.model_dump()
        from_email = render_template_or_get_first_string(
            self.config.from_template, raw_input_dict, self.name
        )
        to_email = render_template_or_get_first_string(
            self.config.to_template, raw_input_dict, self.name
        )
        subject = render_template_or_get_first_string(
            self.config.subject_template, raw_input_dict, self.name
        )
        content = render_template_or_get_first_string(
            self.config.content_template, raw_input_dict, self.name
        )

        # Create the email message
        message = EmailMessage(
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            content=content,
        )

        # Send the email
        response: EmailResponse = await provider.send_email(message)

        # Return the response
        return SendEmailNodeOutput(
            provider=response.provider,
            message_id=response.message_id,
            status=response.status,
            raw_response=response.raw_response,
        )

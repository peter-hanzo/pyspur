from sendgrid import SendGridAPIClient  # type: ignore
from sendgrid.helpers.mail import Mail, Email, To, Content  # type: ignore
import json
import os
from typing import Any
from .base import EmailProviderConfig, EmailMessage, EmailResponse, EmailProvider


class SendGridProvider:
    def __init__(self, config: EmailProviderConfig):
        self.config = config
        api_key = os.getenv("SENDGRID_API_KEY")
        if not api_key:
            raise ValueError("SENDGRID_API_KEY environment variable is not set")
        self.client = SendGridAPIClient(api_key)

    async def send_email(self, message: EmailMessage) -> EmailResponse:
        from_email = Email(message.from_email)
        to_email = To(message.to_email)
        subject = message.subject
        content = Content("text/plain", message.content)
        email = Mail(from_email, to_email, subject, content)

        try:
            response: Any = self.client.send(email)  # type: ignore
            # Convert response to a clean dictionary format and then to JSON string
            response_dict = {
                "id": response.headers.get("X-Message-Id", ""),
                "status_code": response.status_code,
                "from": message.from_email,
                "to": message.to_email,
                "subject": message.subject,
            }

            return EmailResponse(
                provider=EmailProvider.SENDGRID,
                message_id=str(response_dict["id"]),
                status="success" if response.status_code == 202 else "error",
                raw_response=json.dumps(response_dict),
            )
        except Exception as e:
            error_dict = {
                "error": str(e),
                "from": message.from_email,
                "to": message.to_email,
                "subject": message.subject,
            }
            return EmailResponse(
                provider=EmailProvider.SENDGRID,
                message_id="",
                status="error",
                raw_response=json.dumps(error_dict),
            )

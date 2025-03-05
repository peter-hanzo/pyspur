import json
import re
from typing import Any, Dict, Optional

from fastapi import APIRouter, HTTPException
from loguru import logger
from pydantic import BaseModel

from ..nodes.llm._utils import generate_text

router = APIRouter()


class SchemaGenerationRequest(BaseModel):
    description: str
    existing_schema: Optional[str] = None


class MessageGenerationRequest(BaseModel):
    description: str
    message_type: str  # "system" or "user"
    existing_message: Optional[str] = None
    context: Optional[str] = None


@router.post("/generate_schema/")
async def generate_schema(request: SchemaGenerationRequest) -> Dict[str, Any]:
    response: str = ""
    try:
        # Prepare the system message
        system_message = """You are a JSON Schema expert. Your task is to generate a JSON Schema based on a text description.
        The schema should:
        1. Follow JSON Schema standards
        2. Include appropriate types, required fields, and descriptions
        3. Be clear and well-structured
        4. Include type: "object" at the root
        5. Include a properties object
        6. Set appropriate required fields
        7. Include meaningful descriptions for each field
        8. Return ONLY the JSON schema without any markdown formatting or explanation

        Here are some examples:

        <example>
        Input: "Create a schema for a person with name, age and optional email"
        Output: {
            "type": "object",
            "properties": {
                "name": {
                    "type": "string",
                    "description": "The person's full name"
                },
                "age": {
                    "type": "integer",
                    "description": "The person's age in years",
                    "minimum": 0
                },
                "email": {
                    "type": "string",
                    "description": "The person's email address",
                    "format": "email"
                }
            },
            "required": ["name", "age"]
        }
        </example>

        <example>
        Input: "Schema for a blog post with title, content, author details and tags"
        Output: {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "The title of the blog post"
                },
                "content": {
                    "type": "string",
                    "description": "The main content of the blog post"
                },
                "author": {
                    "type": "object",
                    "description": "Details about the post author",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Author's full name"
                        },
                        "bio": {
                            "type": "string",
                            "description": "Short biography of the author"
                        }
                    },
                    "required": ["name"]
                },
                "tags": {
                    "type": "array",
                    "description": "List of tags associated with the post",
                    "items": {
                        "type": "string"
                    }
                }
            },
            "required": ["title", "content", "author"]
        }
        </example>
        """

        # Prepare the user message
        user_message = (
            f"Generate a JSON Schema for the following description:\n{request.description}"
        )

        if request.existing_schema:
            user_message += (
                f"\n\nPlease consider this existing schema as context:\n{request.existing_schema}"
            )
            user_message += (
                "\nModify it based on the description while preserving any compatible parts."
            )

        # Call the LLM
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]

        response = await generate_text(
            messages=messages, model_name="openai/o3-mini", json_mode=True
        )

        # Try to parse the response in different ways
        try:
            # First try: direct JSON parse
            schema = json.loads(response)
            if isinstance(schema, dict) and "output" in schema:
                # If we got a wrapper object with an "output" key, extract the schema from it
                schema_str = schema["output"]
                # Extract JSON from potential markdown code blocks
                json_match = re.search(r"```json\s*(.*?)\s*```", schema_str, re.DOTALL)
                if json_match:
                    schema_str = json_match.group(1)
                schema = json.loads(schema_str)
        except json.JSONDecodeError:
            # Second try: Look for JSON in markdown code blocks
            json_match = re.search(r"```(?:json)?\s*(.*?)\s*```", response, re.DOTALL)
            if json_match:
                schema = json.loads(json_match.group(1))
            else:
                raise ValueError("Could not extract valid JSON schema from response")

        # Validate the schema structure
        if not isinstance(schema, dict) or "type" not in schema or "properties" not in schema:
            raise ValueError("Generated schema is not valid - missing required fields")

        return schema

    except Exception as e:
        # Log the raw response if it exists and is not empty
        if response:
            truncated_response = response[:1000] + "..." if len(response) > 1000 else response
            logger.error(
                f"Schema generation failed. Raw response (truncated): {truncated_response}. Error: {str(e)}"
            )
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/generate_message/")
async def generate_message(request: MessageGenerationRequest) -> Dict[str, str]:
    response: str = ""
    try:
        # Prepare the system message based on the message type
        if request.message_type == "system":
            system_message = """You are an expert at crafting effective system messages for AI assistants.
            Your task is to generate a clear, concise, and effective system message based on the provided description.

            A good system message should:
            1. Clearly define the AI's role and purpose
            2. Set appropriate boundaries and constraints
            3. Provide necessary context and background information
            4. Be concise but comprehensive
            5. Use clear, unambiguous language

            Return ONLY the system message text without any additional explanation or formatting.
            """
        elif request.message_type == "user":
            system_message = """You are an expert at crafting effective user prompts for AI assistants.
            Your task is to generate a clear, specific, and effective user prompt based on the provided description.

            A good user prompt should:
            1. Clearly state what is being asked of the AI
            2. Provide necessary context and specific details
            3. Be structured in a way that guides the AI to produce the desired output
            4. Use clear, unambiguous language
            5. Include any relevant constraints or requirements

            Return ONLY the user prompt text without any additional explanation or formatting.
            """
        else:
            raise ValueError(f"Unsupported message type: {request.message_type}")

        # Prepare the user message
        user_message = f"Generate a {request.message_type} message based on the following description:\n{request.description}"

        if request.existing_message:
            user_message += f"\n\nPlease consider this existing message as a starting point:\n{request.existing_message}"
            user_message += (
                "\nModify it based on the description while preserving any compatible parts."
            )

        if request.context:
            user_message += f"\n\nAdditional context to consider:\n{request.context}"

        # Call the LLM
        messages = [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]

        response = await generate_text(
            messages=messages, model_name="openai/o3-mini", temperature=0.7
        )

        # Process the response to extract the message
        message = ""
        if isinstance(response, str):
            # Try to parse as JSON if it looks like JSON
            if response.strip().startswith("{") and response.strip().endswith("}"):
                try:
                    parsed_response = json.loads(response)
                    if isinstance(parsed_response, dict) and "output" in parsed_response:
                        message = parsed_response["output"]
                    else:
                        message = response
                except json.JSONDecodeError:
                    message = response
            else:
                message = response

            # Remove any markdown code blocks if present
            if "```" in message:
                message = re.sub(r"```.*?```", "", message, flags=re.DOTALL).strip()
        else:
            # Fallback if response is not a string (shouldn't happen)
            message = str(response)

        return {"message": message}

    except Exception as e:
        # Log the raw response if it exists and is not empty
        if response:
            truncated_response = response[:1000] + "..." if len(response) > 1000 else response
            logger.error(
                f"Message generation failed. Raw response (truncated): {truncated_response}. Error: {str(e)}"
            )
        raise HTTPException(status_code=400, detail=str(e))

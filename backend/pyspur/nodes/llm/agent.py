import asyncio
import json
from typing import Any, Dict, List, Optional, cast

from jinja2 import Template
from litellm import ChatCompletionMessageToolCall, ChatCompletionToolMessage
from pydantic import BaseModel, Field

from ...schemas.workflow_schemas import WorkflowNodeSchema
from ...utils.pydantic_utils import get_nested_field
from ..base import BaseNode, BaseNodeInput, BaseNodeOutput
from ..factory import NodeFactory
from ._utils import create_messages, generate_text
from .single_llm_call import (
    LLMModels,
    ModelInfo,
    SingleLLMCallNode,
    SingleLLMCallNodeConfig,
    repair_json,
)


class AgentNodeConfig(SingleLLMCallNodeConfig):
    """Configuration for the AgentNode.

    Extends SingleLLMCallNodeConfig with support for tools.
    """

    tools: Optional[List[WorkflowNodeSchema]] = Field(
        None, description="List of tool nodes that the agent can use"
    )
    max_iterations: int = Field(
        10, description="Maximum number of tool calls the agent can make in a single run"
    )


class AgentNodeInput(BaseNodeInput):
    pass

    class Config:
        extra = "allow"


class AgentNodeOutput(BaseNodeOutput):
    pass


class AgentNode(SingleLLMCallNode):
    """Node for executing an LLM-based agent with tool-calling capabilities.

    Features:
    - All features from SingleLLMCallNode
    - Support for tool calling with other workflow nodes
    - Control over the number of iterations and tool choice
    - Tool results are fed back to the LLM for further reasoning
    """

    name = "agent_node"
    display_name = "Agent"
    config_model = AgentNodeConfig
    input_model = AgentNodeInput
    output_model = AgentNodeOutput

    def setup(self) -> None:
        super().setup()
        # Create a dictionary of tool nodes for easy access
        self.tools_dict: Dict[str, WorkflowNodeSchema] = {}
        tools: List[WorkflowNodeSchema] = self.config.tools or []
        for tool in tools:
            self.tools_dict[tool.title] = tool

        ## Create instances of the tools
        self.tools_instances: Dict[str, BaseNode] = {}
        for tool in tools:
            # Create node instance
            tool_node_instance = NodeFactory.create_node(
                node_name=tool.id,
                node_type_name=tool.node_type,
                config=tool.config,
            )
            self.tools_instances[tool.title] = tool_node_instance

        ## Create list of tool schemas to pass to the LLM
        self.tools_schemas: List[Dict[str, Any]] = []
        for tool in tools:
            tool_node_instance = self.tools_instances[tool.title]
            tool_schema = tool_node_instance.function_schema
            self.tools_schemas.append(tool_schema)

    def _render_template(self, template_str: str, data: Dict[str, Any]) -> str:
        """Render a template with the given data."""
        try:
            return Template(template_str).render(**data)
        except Exception as e:
            print(f"[ERROR] Failed to render template: {e}")
            return template_str

    async def _call_tool(self, tool_call: ChatCompletionMessageToolCall) -> Any:
        """Call a tool with the provided parameters."""
        tool_name = tool_call.function.name
        tool_args = tool_call.function.arguments
        tool_call_id = tool_call.id

        assert tool_name is not None, "Tool name cannot be None"
        assert tool_call_id is not None, "Tool call ID cannot be None"
        assert tool_args is not None, "Tool arguments cannot be None"

        # Get the tool node from the dictionary
        tool_node = self.tools_dict.get(tool_name)
        if not tool_node:
            raise ValueError(f"Tool {tool_name} not found in tools dictionary")

        # Create node instance
        tool_node_instance = NodeFactory.create_node(
            node_name=tool_node.id,
            node_type_name=tool_node.node_type,
            config=tool_node.config,
        )
        tool_args = json.loads(tool_args)
        return await tool_node_instance.call_as_tool(arguments=tool_args)

    async def execute_parallel_tool_calls(
        self, tool_calls: List[ChatCompletionMessageToolCall]
    ) -> List[ChatCompletionToolMessage]:
        """Execute multiple tool calls in parallel."""

        # Create async tasks for all tool calls to execute them concurrently
        async def process_tool_call(
            tool_call: ChatCompletionMessageToolCall,
        ) -> ChatCompletionToolMessage:
            tool_response = await self._call_tool(tool_call)
            return ChatCompletionToolMessage(
                role="tool",
                content=str(tool_response),
                tool_call_id=tool_call.id,
            )

        # Use asyncio.gather to run all tool calls concurrently
        tool_messages: List[ChatCompletionToolMessage] = await asyncio.gather(
            *[process_tool_call(tool_call) for tool_call in tool_calls]
        )
        return tool_messages

    async def run(self, input: BaseModel) -> BaseModel:
        # Get the raw input dictionary
        raw_input_dict = input.model_dump()

        # Render the system message with the input data
        system_message = self._render_template(self.config.system_message, raw_input_dict)
        try:
            # If user_message is empty, dump the entire raw dictionary
            if not self.config.user_message.strip():
                user_message = json.dumps(raw_input_dict, indent=2)
            else:
                user_message = Template(self.config.user_message).render(**raw_input_dict)
        except Exception as e:
            print(f"[ERROR] Failed to render user_message {self.name}")
            print(f"[ERROR] user_message: {self.config.user_message} with input: {raw_input_dict}")
            raise e

        # Extract message history from input if enabled
        history: Optional[List[Dict[str, str]]] = None

        messages = create_messages(
            system_message=system_message,
            user_message=user_message,
            few_shot_examples=self.config.few_shot_examples,
            history=history,
        )

        model_name = LLMModels(self.config.llm_info.model).value

        url_vars: Optional[Dict[str, str]] = None
        # Process URL variables if they exist and we're using a Gemini model
        if self.config.url_variables:
            url_vars = {}
            if "file" in self.config.url_variables:
                # Split the input variable reference (e.g. "input_node.video_url")
                # Get the nested field value using the helper function
                file_value = get_nested_field(self.config.url_variables["file"], input)
                # Always use image_url format regardless of file type
                url_vars["image"] = file_value

        # Prepare thinking parameters if enabled
        thinking_params = None
        if self.config.enable_thinking:
            model_info = LLMModels.get_model_info(model_name)
            if model_info and model_info.constraints.supports_thinking:
                thinking_params = {
                    "type": "enabled",
                    "budget_tokens": self.config.thinking_budget_tokens
                    or model_info.constraints.thinking_budget_tokens
                    or 1024,
                }

        try:
            num_iterations = 0
            model_response = ""
            # Loop until either the maximum number of iterations is reached
            # or the model responds with an assistant message
            while num_iterations < self.config.max_iterations:
                message_response = await generate_text(
                    messages=messages,
                    model_name=model_name,
                    temperature=self.config.llm_info.temperature,
                    max_tokens=self.config.llm_info.max_tokens,
                    json_mode=True,
                    url_variables=url_vars,
                    output_json_schema=self.config.output_json_schema,
                    thinking=thinking_params,
                    tools=self.tools_schemas,
                )
                num_iterations += 1
                # Check if the response is a tool call
                if message_response.tool_calls and len(message_response.tool_calls) > 0:
                    tool_responses = await self.execute_parallel_tool_calls(
                        message_response.tool_calls
                    )

                    messages.extend(cast(List[Dict[str, str]], tool_responses))
                    # Add the tool responses to the messages and call the LLM for the next turn
                    continue

                message = json.loads(str(message_response.content))
                if message.get("role") == "assistant":
                    model_response = str(message_response.content)
                    break
                    # Extract the assistant message
        except Exception as e:
            error_str = str(e)

            # Handle all LiteLLM errors
            if "litellm" in error_str.lower():
                error_message = "An error occurred with the LLM service"
                error_type = "unknown"

                # Extract provider from model name
                provider = model_name.split("/")[0] if "/" in model_name else "unknown"

                # Handle specific known error cases
                if "VertexAIError" in error_str and "The model is overloaded" in error_str:
                    error_type = "overloaded"
                    error_message = "The model is currently overloaded. Please try again later."
                elif "rate limit" in error_str.lower():
                    error_type = "rate_limit"
                    error_message = "Rate limit exceeded. Please try again in a few minutes."
                elif "context length" in error_str.lower() or "maximum token" in error_str.lower():
                    error_type = "context_length"
                    error_message = (
                        "Input is too long for the model's context window."
                        " Please reduce the input length."
                    )
                elif (
                    "invalid api key" in error_str.lower() or "authentication" in error_str.lower()
                ):
                    error_type = "auth"
                    error_message = (
                        "Authentication error with the LLM service. Please check your API key."
                    )
                elif "bad gateway" in error_str.lower() or "503" in error_str:
                    error_type = "service_unavailable"
                    error_message = (
                        "The LLM service is temporarily unavailable. Please try again later."
                    )

                raise Exception(
                    json.dumps(
                        {
                            "type": "model_provider_error",
                            "provider": provider,
                            "error_type": error_type,
                            "message": error_message,
                            "original_error": error_str,
                        }
                    )
                ) from e
            raise e

        try:
            assistant_message_dict = json.loads(model_response)
        except Exception:
            try:
                repaired_str = repair_json(model_response)
                assistant_message_dict = json.loads(repaired_str)
            except Exception as inner_e:
                error_str = str(inner_e)
                error_message = (
                    "An error occurred while parsing and repairing the assistant message"
                )
                error_type = "json_parse_error"
                raise Exception(
                    json.dumps(
                        {
                            "type": "parsing_error",
                            "error_type": error_type,
                            "message": error_message,
                            "original_error": error_str,
                            "assistant_message_str": model_response,
                        }
                    )
                ) from inner_e

        # Validate and return
        assistant_message = self.output_model.model_validate(assistant_message_dict)
        return assistant_message


if __name__ == "__main__":
    import asyncio

    async def test_agent_node():
        # Example tool node schema
        tool_schema = WorkflowNodeSchema(
            id="calculator",
            title="Calculator",
            node_type="CalculatorNode",
            config={"operations": ["add", "subtract", "multiply", "divide"]},
        )

        # Create agent node
        agent_node = AgentNode(
            name="MathHelper",
            config=AgentNodeConfig(
                llm_info=ModelInfo(model=LLMModels.GPT_4O, temperature=0.7, max_tokens=1000),
                system_message=(
                    "You are a helpful assistant that can use tools to solve math problems."
                ),
                user_message="I need help with this math problem: {{ problem }}",
                tools=[tool_schema],
                max_iterations=5,
                url_variables=None,
                enable_thinking=False,
                thinking_budget_tokens=None,
                enable_message_history=False,
                message_history_variable=None,
                output_json_schema=json.dumps(
                    {
                        "type": "object",
                        "properties": {
                            "answer": {"type": "string"},
                            "explanation": {"type": "string"},
                        },
                        "required": ["answer", "explanation"],
                    }
                ),
            ),
        )

        # Create input
        test_input = AgentNodeInput.model_validate({"problem": "What is 25 × 13?"})

        # Run the agent
        print("[DEBUG] Testing agent_node...")
        output = await agent_node(test_input)
        print("[DEBUG] Agent output:", output)

    asyncio.run(test_agent_node())

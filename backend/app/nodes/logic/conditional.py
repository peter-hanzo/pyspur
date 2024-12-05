from typing import Dict, Any, Optional
from pydantic import BaseModel

from ..dynamic_schema import DynamicSchemaNode, DynamicSchemaNodeConfig


class ConditionalNodeConfig(DynamicSchemaNodeConfig):
    """Configuration for the conditional node."""
    condition_schema: Dict[str, str]  # Schema for the condition input
    input_schema: Dict[str, str] = {
        "input": "any"  # The input data to be routed
    }
    output_schema: Dict[str, str] = {
        "true": "any",  # Output for true branch
        "false": "any"  # Output for false branch
    }


class ConditionalNodeInput(BaseModel):
    """Input model for the conditional node."""
    input: Any  # The data to be routed
    condition: str  # The condition expression to evaluate


class ConditionalNodeOutput(BaseModel):
    """Output model for the conditional node."""
    true: Optional[Any] = None  # Data routed to true branch
    false: Optional[Any] = None  # Data routed to false branch


class ConditionalNode(DynamicSchemaNode):
    """
    A routing node that directs input data to either the true or false branch
    based on the evaluation of a condition.
    """

    name = "conditional_node"
    config_model = ConditionalNodeConfig

    async def run(self, input_data: ConditionalNodeInput) -> ConditionalNodeOutput:
        """
        Evaluates the condition and routes the input data to the appropriate branch.
        """
        try:
            # Create a context with the input data for condition evaluation
            eval_context = {"__builtins__": {}, **input_data.dict()}

            # Evaluate the condition in a safe context
            condition_result = eval(input_data.condition, {"__builtins__": {}}, eval_context)

            if condition_result:
                return ConditionalNodeOutput(
                    true=input_data.input,
                    false=None
                )
            else:
                return ConditionalNodeOutput(
                    true=None,
                    false=input_data.input
                )

        except Exception as e:
            # Handle evaluation errors
            raise ValueError(f"Error evaluating condition: {str(e)}")

from typing import Dict, Any, Optional, List, Literal
from pydantic import BaseModel, Field, create_model
from enum import Enum

from ..base import BaseNodeConfig, BaseNode, BaseNodeInput, BaseNodeOutput


class ComparisonOperator(str, Enum):
    CONTAINS = "contains"
    EQUALS = "equals"
    GREATER_THAN = "greater_than"
    LESS_THAN = "less_than"
    STARTS_WITH = "starts_with"
    NOT_STARTS_WITH = "not_starts_with"
    IS_EMPTY = "is_empty"
    IS_NOT_EMPTY = "is_not_empty"
    NUMBER_EQUALS = "number_equals"


LogicalOperator = Literal["AND", "OR"]


class Condition(BaseModel):
    """Configuration for a single condition"""

    variable: str
    operator: ComparisonOperator = Field(default=ComparisonOperator.CONTAINS)
    value: Any
    logicalOperator: Optional[LogicalOperator] = Field(default="AND")


class RouteCondition(BaseModel):
    """Configuration for a route with multiple conditions"""

    conditions: List[Condition]


class RouterNodeConfig(BaseNodeConfig):
    """Configuration for the router node."""

    route_map: Dict[str, RouteCondition]  # Dict of route names to conditions


class RouterNodeInput(BaseNodeInput):
    """Input model for the router node."""

    pass


class RouterNodeOutput(BaseNodeOutput):
    """Output model for the router node."""

    pass


class RouterNode(BaseNode):
    """
    A routing node that directs input data to different routes
    based on the evaluation of conditions. The first route acts as the default
    if no other conditions match.
    """

    name = "router_node"
    display_name = "Router"
    input_model = RouterNodeInput
    config_model = RouterNodeConfig

    def _evaluate_single_condition(
        self, input: BaseModel, condition: Condition
    ) -> bool:
        """Evaluate a single condition against a specific input variable"""

        def get_nested_value(data: Dict[str, Any], target_key: str) -> Any:
            """Recursively search for a key in a nested structure and return its value."""
            for key, value in data.items():
                if key == target_key:
                    return value
                found = get_nested_value(value, target_key)
                if found is not None:
                    return found
            return None

        try:
            if not condition.variable:
                return False

            print("Input object:", input)
            print("Condition variable:", condition.variable)

            # Retrieve the variable value, including support for nested paths
            variable_value = get_nested_value(input.model_dump(), condition.variable)
            print(f"Variable value for {condition.variable}: {variable_value}")

            if variable_value is None:
                if condition.operator != ComparisonOperator.IS_EMPTY:
                    return False
                else:
                    return True
            if condition.operator == ComparisonOperator.CONTAINS:
                return str(condition.value) in str(variable_value)
            elif condition.operator == ComparisonOperator.EQUALS:
                return str(variable_value) == str(condition.value)
            elif condition.operator == ComparisonOperator.NUMBER_EQUALS:
                return float(variable_value) == float(condition.value)
            elif condition.operator == ComparisonOperator.GREATER_THAN:
                return float(variable_value) > float(condition.value)
            elif condition.operator == ComparisonOperator.LESS_THAN:
                return float(variable_value) < float(condition.value)
            elif condition.operator == ComparisonOperator.STARTS_WITH:
                return str(variable_value).startswith(str(condition.value))
            elif condition.operator == ComparisonOperator.NOT_STARTS_WITH:
                return not str(variable_value).startswith(str(condition.value))
            elif condition.operator == ComparisonOperator.IS_EMPTY:
                return not bool(variable_value)
            elif condition.operator == ComparisonOperator.IS_NOT_EMPTY:
                return bool(variable_value)
            else:
                return False
        except (ValueError, TypeError, AttributeError):
            return False

    def _evaluate_route_conditions(
        self, input: BaseModel, route: RouteCondition
    ) -> bool:
        """Evaluate all conditions in a route with AND/OR logic"""
        if not route.conditions:
            # If no conditions, consider it always matches
            return True

        result = self._evaluate_single_condition(input, route.conditions[0])

        for i in range(1, len(route.conditions)):
            condition = route.conditions[i]
            current_result = self._evaluate_single_condition(input, condition)

            if condition.logicalOperator == "OR":
                result = result or current_result
            else:  # AND is default
                result = result and current_result

        return result

    async def run(self, input: BaseModel) -> BaseModel:
        """
        Evaluates conditions for each route in order. The first route that matches
        gets the input data. If no routes match, the first route acts as a default.
        """
        # Create fields for each route with Optional[input type]
        route_fields = {
            route_name: (Optional[input.__class__], None)
            for route_name in self.config.route_map.keys()
        }
        print('route fields', route_fields)
        new_output_model = create_model(  # type: ignore
            "RouterNodeOutput",
            __base__=RouterNodeOutput,
            **route_fields,  # type: ignore
        )
        self.output_model = new_output_model

        output: Dict[str, Optional[BaseModel]] = {}

        for route_name, route in self.config.route_map.items():
            if self._evaluate_route_conditions(input, route):
                output[route_name] = input

        print(output)
        return self.output_model(**output)  # type: ignore


if __name__ == "__main__":
    # Test the RouterNode
    from typing import List
    from pydantic import BaseModel
    import asyncio

    class TestInput(RouterNodeInput):
        name: str
        age: int
        is_student: bool
        grade: str

    config = RouterNodeConfig(
        route_map={
            "route1": RouteCondition(
                conditions=[
                    Condition(
                        variable="age",
                        operator=ComparisonOperator.GREATER_THAN,
                        value=18,
                    ),
                    Condition(
                        variable="is_student",
                        operator=ComparisonOperator.EQUALS,
                        value=True,
                    ),
                ]
            ),
            "route2": RouteCondition(
                conditions=[
                    Condition(
                        variable="grade", operator=ComparisonOperator.EQUALS, value="A"
                    ),
                ]
            ),
        }
    )

    node = RouterNode(config=config, name="router_node")

    input_data = TestInput(name="Alice", age=20, is_student=True, grade="B")
    output = asyncio.run(node(input_data))
    print(output)

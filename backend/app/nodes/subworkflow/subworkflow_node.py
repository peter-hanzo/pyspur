import json
from typing import Any, Dict, Set, Tuple

from pydantic import BaseModel

from ...execution.node_executor import NodeExecutor
from ...execution.workflow_executor import WorkflowExecutor
from ...execution.workflow_executor_dask import WorkflowExecutorDask
from ...schemas.workflow_schemas import WorkflowDefinitionSchema, WorkflowNodeSchema
from ..base import BaseNode


class SubworkflowNodeConfig(BaseModel):
    workflow_json: str  # JSON string representing the workflow
    use_dask: bool = False  # Optionally use Dask for execution


class SubworkflowNode(BaseNode):
    name: str = "static_workflow_node"
    config_model = SubworkflowNodeConfig

    def setup(self) -> None:
        config = self.config
        self.workflow: WorkflowDefinitionSchema = self._parse_workflow_json(
            config.workflow_json
        )
        self._node_dict: Dict[str, WorkflowNodeSchema] = {
            node.id: node for node in self.workflow.nodes
        }
        self._dependencies: Dict[str, Set[str]] = self._build_dependencies()
        # Collect input and output schemas
        input_schema = self._collect_input_schema()
        output_schema = self._collect_output_schema()

        # Create input_model and output_model dynamically
        self.input_model = self.get_model_for_schema_dict(
            input_schema, f"{self.name}Input"
        )
        self.output_model = self.get_model_for_schema_dict(
            output_schema, f"{self.name}Output"
        )

    def _parse_workflow_json(self, workflow_json_str: str) -> WorkflowDefinitionSchema:
        # Parse the JSON string into a Workflow object
        workflow_dict = json.loads(workflow_json_str)
        return WorkflowDefinitionSchema.model_validate(workflow_dict)

    def _build_dependencies(self) -> Dict[str, Set[str]]:
        dependencies: Dict[str, Set[str]] = {
            node.id: set() for node in self.workflow.nodes
        }
        for link in self.workflow.links:
            dependencies[link.target_id].add(link.source_id)
        return dependencies

    def _collect_input_schema(self) -> Dict[str, str]:
        """
        Collects the required inputs for the sub-workflow that are not provided by other nodes.
        Also builds a mapping from input field names to node IDs and node input keys.
        """
        input_fields: Dict[str, str] = {}
        self._input_field_to_node_input: Dict[str, Tuple[str, str]] = {}
        for node_id, node in self._node_dict.items():
            node_executor = NodeExecutor(node)
            node_inputs = node_executor.node_instance.input_model.model_fields
            for input_name, field in node_inputs.items():
                # Check if this input is provided by a link
                is_input_satisfied = False
                for link in self.workflow.links:
                    if (
                        link.target_id == node_id
                        and link.target_input_key == input_name
                    ):
                        is_input_satisfied = True
                        break
                if not is_input_satisfied:
                    # This input needs to be provided externally
                    field_name = f"{node_id}__{input_name}"
                    annotation = field.annotation
                    if annotation == None:
                        # Handle variadic inputs
                        continue
                    input_fields[field_name] = annotation.__name__
                    self._input_field_to_node_input[field_name] = (node_id, input_name)
        return input_fields

    def _collect_output_schema(self) -> Dict[str, str]:
        """
        Collects the outputs from the sub-workflow that are not consumed by other nodes.
        Also builds a mapping from output field names to node IDs and node output keys.
        """
        # Collect all consumed outputs
        all_consumed_sources: Set[Tuple[str, str]] = set()
        for link in self.workflow.links:
            all_consumed_sources.add((link.source_id, link.source_output_key))

        output_fields: Dict[str, str] = {}
        self._output_field_to_node_output: Dict[str, Tuple[str, str]] = {}
        for node_id, node in self._node_dict.items():
            node_executor = NodeExecutor(node)
            node_outputs = node_executor.node_instance.output_model.model_fields
            for output_name, field in node_outputs.items():
                # Check if this output is consumed
                if (node_id, output_name) not in all_consumed_sources:
                    field_name = f"{node_id}__{output_name}"
                    annotation = field.annotation
                    if annotation == None:
                        # Handle variadic outputs
                        continue
                    output_fields[field_name] = annotation.__name__
                    self._output_field_to_node_output[field_name] = (
                        node_id,
                        output_name,
                    )
        return output_fields

    async def run(self, input_data: BaseModel) -> BaseModel:
        # Prepare initial inputs for nodes
        initial_inputs: Dict[str, Dict[str, Any]] = {}
        for input_name, value in input_data:
            node_id, node_input_key = self._input_field_to_node_input[input_name]
            if node_id not in initial_inputs:
                initial_inputs[node_id] = {}
            initial_inputs[node_id][node_input_key] = value

        # Execute the workflow
        if self.config.use_dask:
            executor = WorkflowExecutorDask(self.workflow)
        else:
            executor = WorkflowExecutor(self.workflow)
        outputs = await executor(initial_inputs)

        # Extract outputs and return them
        output_data = {}
        for output_name in self.output_model.model_fields:
            node_id, node_output_key = self._output_field_to_node_output[output_name]
            node_output = outputs.get(node_id)
            if node_output is None:
                raise ValueError(f"No output from node {node_id}")
            value = getattr(node_output, node_output_key)
            output_data[output_name] = value

        return self.output_model.model_validate(output_data)


if __name__ == "__main__":
    # Example usage of the SubworkflowNode
    workflow_json = """
{
    "nodes": [
      {
        "id": "1",
        "node_type": "AdvancedLLMNode",
        "config": {
          "llm_name": "gpt-4o",
          "max_tokens": 150,
          "temperature": 0.7,
          "system_prompt": "please provide average annual weather for {city}",
          "output_schema": { "city": "str",
            "weather": "str",
            "temperature": "float",
            "humidity": "int",
            "feels_like": "float",
            "precipitation": "float"
          },
          "input_schema": { "user_message": "str", "city":"str", "units":"str" }
        }
      },
      {
        "id": "3",
        "node_type": "BestOfNNode",
        "config": {
          "llm_name": "gpt-4o",
          "max_tokens": 150,
          "temperature": 0.7,
          "system_prompt": "please provide average annual weather for {city} in {units}",
          "output_schema": { "general_weather_guidelines": "str", "average_annual_temperature": "float" },
          "input_schema": { "user_message": "str", "city":"str", "units":"str" },
          "samples": 5
        }
      },
      {
        "id": "2",
        "node_type": "PythonFuncNode",
        "config": {
          "code": "import time\\ntime.sleep(1)\\noutput_data = {'result': input_data['number'] * 2}",
          "input_schema": {
            "number": "float"
          },
          "output_schema": {
            "result": "float"
          }
        }
      },
      {
        "id": "4",
        "node_type": "MCTSNode",
        "config": {
          "llm_name": "gpt-4o",
          "max_tokens": 2048,
          "temperature": 0.7,
          "system_prompt": "You are Jimmy Carr. Your jokes are intelligent and funny. Your task is to create a joke for the user's instruction",
          "num_simulations": 5,
          "simulation_depth": 10
        }
      },
      {
        "id": "5",
        "node_type": "BranchSolveMergeNode",
        "config": {
          "llm_name": "gpt-4o",
          "max_tokens": 2048,
          "temperature": 0.7,
          "input_schema": {"user_message": "str"},
          "output_schema": {"complete_joke": "str"}
        }
      }

    ],
    "links": [
      {
        "source_id": "1",
        "source_output_key": "temperature",
        "target_id": "2",
        "target_input_key": "number"
      }
    ]
  }"""
    input_data = {
        "1__user_message": "okay, give it to me",
        "1__city": "Jabalpur",
        "1__units": "celsius",
        "3__user_message": "please enlighten me",
        "3__city": "Jabalpur",
        "3__units": "celsius",
        "4__user_message": "Why do politicians and actors not like to ride shotgun?",
        "5__user_message": "Complete this joke like Jimmy Carr: Why do politicians and actors not like to ride shotgun?",
    }

    node = SubworkflowNode(config=SubworkflowNodeConfig(workflow_json=workflow_json))
    import asyncio

    output = asyncio.run(node(input_data))
    print(output)
    print("-" * 50)
    # Example usage of the SubworkflowNode for generating high-quality ad copy
    workflow_json = """
{
    "nodes": [
        {
            "id": "1",
            "node_type": "BranchSolveMergeNode",
            "config": {
                "llm_name": "gpt-4o",
                "max_tokens": 100,
                "temperature": 0.7,
                "system_prompt": "You are an expert copywriter. Break down the task of creating an ad header into sub-tasks and solve them.",
                "input_schema": {
                    "product_description": "str"
                },
                "output_schema": {
                    "header": "str"
                }
            }
        },
        {
            "id": "2",
            "node_type": "BranchSolveMergeNode",
            "config": {
                "llm_name": "gpt-4o",
                "max_tokens": 150,
                "temperature": 0.7,
                "system_prompt": "You are an expert copywriter. Break down the task of creating an ad sub-header into sub-tasks and solve them.",
                "input_schema": {
                    "product_description": "str",
                    "header": "str"
                },
                "output_schema": {
                    "sub_header": "str"
                }
            }
        },
        {
            "id": "3",
            "node_type": "MCTSNode",
            "config": {
                "llm_name": "gpt-4o",
                "max_tokens": 50,
                "temperature": 0.7,
                "system_prompt": "You are a creative director reviewing ad headers. Generate variations and select the best one that doesn't overuse 'Elevate' or 'Delve'.",
                "num_simulations": 5,
                "simulation_depth": 3
            }
        }
    ],
    "links": [
        {
            "source_id": "1",
            "source_output_key": "header",
            "target_id": "2",
            "target_input_key": "header"
        },
        {
            "source_id": "1",
            "source_output_key": "header",
            "target_id": "3",
            "target_input_key": "user_message"
        }
    ]
}"""

    input_data = {
        "1__product_description": 'Dash Sparkling Water is a refreshing beverage made by infusing naturally flavored fruits and vegetables with sparkling water. It\'s free from sugars, sweeteners, and artificial additives, making it a clean and healthy choice for hydration. Dash prides itself on using "wonky" or imperfect produce, reducing food waste while providing a light and subtle flavor. Popular flavors include cucumber, lemon, raspberry, and peach, offering a crisp, refreshing taste. The minimalist ingredients and eco-conscious approach make Dash a go-to choice for those seeking a guilt-free, delicious alternative to sugary soft drinks or overly sweet sparkling waters.',
        "2__product_description": 'Dash Sparkling Water is a refreshing beverage made by infusing naturally flavored fruits and vegetables with sparkling water. It\'s free from sugars, sweeteners, and artificial additives, making it a clean and healthy choice for hydration. Dash prides itself on using "wonky" or imperfect produce, reducing food waste while providing a light and subtle flavor. Popular flavors include cucumber, lemon, raspberry, and peach, offering a crisp, refreshing taste. The minimalist ingredients and eco-conscious approach make Dash a go-to choice for those seeking a guilt-free, delicious alternative to sugary soft drinks or overly sweet sparkling waters.',
    }

    node = SubworkflowNode(config=SubworkflowNodeConfig(workflow_json=workflow_json))
    import asyncio

    output = asyncio.run(node(input_data))
    print(json.dumps(output.model_dump(), indent=2))

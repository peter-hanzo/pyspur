from typing import Dict, List

from pydantic import Field

from .single_llm_call import SingleLLMCallNodeConfig
from ...subworkflow.ephemeral_subworkflow_node import EphemeralSubworkflowNode
from ....schemas.workflow_schemas import (
    WorkflowDefinitionSchema,
    WorkflowNodeSchema,
    WorkflowLinkSchema,
)
from ..llm_utils import LLMModels, ModelInfo


class TopKNodeConfig(SingleLLMCallNodeConfig):
    """Configuration for the Top-K node that ranks and selects top K texts."""
    k: int = Field(
        default=3,
        ge=1,
        description="Number of top texts to return"
    )
    rating_prompt: str = Field(
        default=(
            "Rate the following text on a scale from 0 to 10 based on quality and relevance. "
            "Consider factors such as coherence, clarity, and informativeness. "
            "Respond with only a number."
        ),
        description="The prompt for rating texts"
    )
    rating_model_info: ModelInfo = Field(
        default_factory=lambda: ModelInfo(
            model=LLMModels.GPT_4O,
            max_tokens=16,
            temperature=0.1
        ),
        description="Model info for the rating LLM"
    )
    input_schema: Dict[str, str] = Field(default={"texts": "list[str]"})
    output_schema: Dict[str, str] = Field(default={"top_texts": "list[str]"})


class TopKNode(EphemeralSubworkflowNode):
    """Node that ranks multiple input texts using LLM and returns top K highest ranked texts."""
    name = "top_k_node"
    display_name = "Top-K"
    config_model = TopKNodeConfig
    workflow: WorkflowDefinitionSchema

    def setup(self) -> None:
        """Set up the workflow for ranking and selecting top K texts."""
        self.subworkflow = self.generate_top_k_workflow()
        super().setup()

    def generate_top_k_workflow(self) -> WorkflowDefinitionSchema:
        """Generate workflow for ranking texts and selecting top K."""
        # Initialize workflow components
        nodes: List[WorkflowNodeSchema] = []
        links: List[WorkflowLinkSchema] = []

        # Input node to receive the list of texts
        input_node_id = "input_node"
        input_node = WorkflowNodeSchema(
            id=input_node_id,
            node_type="InputNode",
            config={"input_schema": self.config.input_schema},
        )
        nodes.append(input_node)

        # Python node to split the input list into individual texts
        split_node_id = "split_node"
        split_node = WorkflowNodeSchema(
            id=split_node_id,
            node_type="PythonFuncNode",
            config={
                "code": "def run(texts):\n    return {f'text_{i}': text for i, text in enumerate(texts)}",
                "input_schema": {"texts": "list[str]"},
                "output_schema": {f"text_{i}": "str" for i in range(len(self.config.input_schema))}
            }
        )
        nodes.append(split_node)

        # Link input to split node
        links.append(
            WorkflowLinkSchema(
                source_id=input_node_id,
                source_output_key="texts",
                target_id=split_node_id,
                target_input_key="texts",
            )
        )

        # Create rating nodes for each text
        rating_node_ids = []
        for i in range(len(self.config.input_schema)):
            rate_node_id = f"rating_node_{i}"
            rate_node = WorkflowNodeSchema(
                id=rate_node_id,
                node_type="SingleLLMCallNode",
                config={
                    "llm_info": self.config.rating_model_info.model_dump(),
                    "system_message": self.config.rating_prompt,
                    "user_message": "{{ text }}",
                    "input_schema": {"text": "str"},
                    "output_schema": {"rating": "float"},
                }
            )
            nodes.append(rate_node)
            rating_node_ids.append(rate_node_id)

            # Link split node to rating node
            links.append(
                WorkflowLinkSchema(
                    source_id=split_node_id,
                    source_output_key=f"text_{i}",
                    target_id=rate_node_id,
                    target_input_key="text",
                )
            )

        # Create jsonify nodes to combine text and rating
        jsonify_node_ids = []
        for i in range(len(self.config.input_schema)):
            jsonify_node_id = f"jsonify_node_{i}"
            jsonify_node = WorkflowNodeSchema(
                id=jsonify_node_id,
                node_type="JsonifyNode",
                config={
                    "input_schema": {"text": "str", "rating": "float"}
                }
            )
            nodes.append(jsonify_node)
            jsonify_node_ids.append(jsonify_node_id)

            # Link original text and rating to jsonify node
            links.append(
                WorkflowLinkSchema(
                    source_id=split_node_id,
                    source_output_key=f"text_{i}",
                    target_id=jsonify_node_id,
                    target_input_key="text",
                )
            )
            links.append(
                WorkflowLinkSchema(
                    source_id=rating_node_ids[i],
                    source_output_key="rating",
                    target_id=jsonify_node_id,
                    target_input_key="rating",
                )
            )

        # Create pick nodes to select top K
        pick_node_id = "pick_node"
        pick_node = WorkflowNodeSchema(
            id=pick_node_id,
            node_type="PickTopKNode",
            config={
                "k": self.config.k,
                "based_on_key": "rating",
                "input_schema": {
                    jsonify_node_id: "str" for jsonify_node_id in jsonify_node_ids
                },
            }
        )
        nodes.append(pick_node)

        # Link jsonify nodes to pick node
        for jsonify_node_id in jsonify_node_ids:
            links.append(
                WorkflowLinkSchema(
                    source_id=jsonify_node_id,
                    source_output_key="json_string",
                    target_id=pick_node_id,
                    target_input_key=jsonify_node_id,
                )
            )

        # Extract node to get texts from JSON
        extract_node_id = "extract_node"
        extract_node = WorkflowNodeSchema(
            id=extract_node_id,
            node_type="ExtractJsonNode",
            config={
                "output_schema": {"text": "str"}
            }
        )
        nodes.append(extract_node)

        # Link pick node to extract node
        links.append(
            WorkflowLinkSchema(
                source_id=pick_node_id,
                source_output_key="picked_json_strings",
                target_id=extract_node_id,
                target_input_key="json_string",
            )
        )

        # Python node to combine extracted texts into list
        combine_node_id = "combine_node"
        combine_node = WorkflowNodeSchema(
            id=combine_node_id,
            node_type="PythonFuncNode",
            config={
                "code": "def run(**kwargs):\n    return {'top_texts': [v['text'] for v in kwargs.values()]}",
                "input_schema": {f"text_{i}": "dict" for i in range(self.config.k)},
                "output_schema": {"top_texts": "list[str]"}
            }
        )
        nodes.append(combine_node)

        # Link extract node outputs to combine node
        for i in range(self.config.k):
            links.append(
                WorkflowLinkSchema(
                    source_id=extract_node_id,
                    source_output_key=f"text_{i}",
                    target_id=combine_node_id,
                    target_input_key=f"text_{i}",
                )
            )

        # Output node
        output_node_id = "output_node"
        output_node = WorkflowNodeSchema(
            id=output_node_id,
            node_type="OutputNode",
            config={"output_schema": self.config.output_schema},
        )
        nodes.append(output_node)

        # Link combine node to output node
        links.append(
            WorkflowLinkSchema(
                source_id=combine_node_id,
                source_output_key="top_texts",
                target_id=output_node_id,
                target_input_key="top_texts",
            )
        )

        return WorkflowDefinitionSchema(
            nodes=nodes,
            links=links,
        )

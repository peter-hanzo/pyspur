from typing import Dict, List

from pydantic import Field

from ..single_llm_call import SingleLLMCallNodeConfig
from ...subworkflow.ephemeral_subworkflow_node import EphemeralSubworkflowNode
from ....schemas.workflow_schemas import (
    WorkflowDefinitionSchema,
    WorkflowNodeSchema,
    WorkflowLinkSchema,
)
from ..llm_utils import LLMModels, ModelInfo


class BestOfNNodeConfig(SingleLLMCallNodeConfig):
    samples: int = Field(
        default=3, ge=1, le=10, description="Number of samples to generate"
    )
    rating_prompt: str = Field(
        default=(
            "Rate the following response on a scale from 0 to 10, where 0 is poor "
            "and 10 is excellent. Consider factors such as relevance, coherence, "
            "and helpfulness. Respond with only a number."
        ),
        description="The prompt for the rating LLM",
    )
    rating_model_info: ModelInfo = Field(
        default_factory=lambda: ModelInfo(
            model=LLMModels.GPT_4O, max_tokens=16, temperature=0.1
        ),
        description="Model info for the rating LLM",
    )
    generation_llm_info: ModelInfo = Field(
        default_factory=lambda: ModelInfo(
            model=LLMModels.GPT_4O, max_tokens=150, temperature=0.7
        ),
        description="Model info for the generation LLM",
    )
    system_message: str = Field(
        default="You are a helpful assistant.",
        description="System message for the generation LLM",
    )
    user_message: str = Field(
        default="{{ user_input }}", description="User message template"
    )
    input_schema: Dict[str, str] = Field(default={"user_input": "str"})
    output_schema: Dict[str, str] = Field(default={"response": "str"})


class BestOfNNode(EphemeralSubworkflowNode):
    name = "best_of_n_node"
    config_model = BestOfNNodeConfig
    workflow: WorkflowDefinitionSchema

    def generated_best_of_n_workflow(self) -> WorkflowDefinitionSchema:
        samples = self.config.samples

        # Generate the nodes for the subworkflow
        nodes: List[WorkflowNodeSchema] = []
        links: List[WorkflowLinkSchema] = []

        # Input node
        input_node_id = "input_node"
        input_node = WorkflowNodeSchema(
            id=input_node_id,
            node_type="InputNode",
            config={"input_schema": self.config.input_schema},
        )
        nodes.append(input_node)

        generation_node_ids: List[str] = []
        rating_node_ids: List[str] = []
        jsonify_node_ids: List[str] = []

        for i in range(samples):
            gen_node_id = f"generation_node_{i}"
            gen_node = WorkflowNodeSchema(
                id=gen_node_id,
                node_type="SingleLLMCallNode",
                config={
                    "llm_info": self.config.generation_llm_info.model_dump(),
                    "system_message": self.config.system_message,
                    "user_message": self.config.user_message,
                    "input_schema": self.config.input_schema,
                    "output_schema": self.config.output_schema,
                },
            )
            nodes.append(gen_node)
            generation_node_ids.append(gen_node_id)

            # Link input node to generation node
            for input_key in self.config.input_schema.keys():
                links.append(
                    WorkflowLinkSchema(
                        source_id=input_node_id,
                        source_output_key=input_key,
                        target_id=gen_node_id,
                        target_input_key=input_key,
                    )
                )

            rate_node_id = f"rating_node_{i}"
            rate_node = WorkflowNodeSchema(
                id=rate_node_id,
                node_type="SingleLLMCallNode",
                config={
                    "llm_info": self.config.rating_model_info.model_dump(),
                    "system_message": self.config.rating_prompt,
                    "user_message": self.get_jinja2_template_for_fields(
                        list(self.config.output_schema.keys())
                    ),
                    "input_schema": self.config.output_schema,
                    "output_schema": {"rating": "float"},
                },
            )
            nodes.append(rate_node)
            rating_node_ids.append(rate_node_id)

            # Link generation node to rating node
            for output_key in self.config.output_schema.keys():
                links.append(
                    WorkflowLinkSchema(
                        source_id=gen_node_id,
                        source_output_key=output_key,
                        target_id=rate_node_id,
                        target_input_key=output_key,
                    )
                )

            # jsonify rating and the generated response
            jsonify_node_id = f"jsonify_node_{i}"
            jsonify_node = WorkflowNodeSchema(
                id=jsonify_node_id,
                node_type="JsonifyNode",
                config={
                    "input_schema": {**self.config.output_schema, "rating": "float"}
                },
            )
            nodes.append(jsonify_node)
            jsonify_node_ids.append(jsonify_node_id)

            # Link rating node to jsonify node
            for output_key in self.config.output_schema.keys():
                links.append(
                    WorkflowLinkSchema(
                        source_id=gen_node_id,
                        source_output_key=output_key,
                        target_id=jsonify_node_id,
                        target_input_key=output_key,
                    )
                )
            links.append(
                WorkflowLinkSchema(
                    source_id=rate_node_id,
                    source_output_key="rating",
                    target_id=jsonify_node_id,
                    target_input_key="rating",
                )
            )

        # Create a PickOneNode to select the JSON string with the highest rating
        pick_one_node_id = "pick_one_node"
        pick_one_node = WorkflowNodeSchema(
            id=pick_one_node_id,
            node_type="PickOneNode",
            config={
                "based_on_key": "rating",
                "logic": "max",
                "input_schema": {
                    jsonify_node_id: "str" for jsonify_node_id in jsonify_node_ids
                },
            },
        )
        nodes.append(pick_one_node)

        # Link jsonify nodes to the pick_one node
        for jsonify_node_id in jsonify_node_ids:
            links.append(
                WorkflowLinkSchema(
                    source_id=jsonify_node_id,
                    source_output_key="json_string",
                    target_id=pick_one_node_id,
                    target_input_key=jsonify_node_id,
                )
            )

        # Use ExtractJsonNode as the output node to reverse jsonify and drop rating
        extract_json_node_id = "extract_json_node"
        extract_json_node = WorkflowNodeSchema(
            id=extract_json_node_id,
            node_type="ExtractJsonNode",
            config={"output_schema": self.config.output_schema},
        )
        nodes.append(extract_json_node)

        # Link pick_one node to extract_json node
        links.append(
            WorkflowLinkSchema(
                source_id=pick_one_node_id,
                source_output_key="picked_json_string",
                target_id=extract_json_node_id,
                target_input_key="json_string",
            )
        )

        # add the output node
        output_node_id = "output_node"
        output_node = WorkflowNodeSchema(
            id=output_node_id,
            node_type="OutputNode",
            config={"output_schema": self.config.output_schema},
        )
        nodes.append(output_node)

        # Link the output_schema key of the extract_json_node to the output node
        for output_key in self.config.output_schema.keys():
            links.append(
                WorkflowLinkSchema(
                    source_id=extract_json_node_id,
                    source_output_key=output_key,
                    target_id=output_node_id,
                    target_input_key=output_key,
                )
            )

        # Return the generated workflow
        return WorkflowDefinitionSchema(
            nodes=nodes,
            links=links,
        )

    def setup(self) -> None:
        self.workflow = self.generated_best_of_n_workflow()
        super().setup()

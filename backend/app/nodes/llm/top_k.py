from typing import Dict, List

from pydantic import Field

from .single_llm_call import SingleLLMCallNodeConfig
from ..logic.sort import SortNode
from ..logic.rank import RankNode
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
    batch_scoring: bool = Field(
        default=False,
        description="If True, score all texts in one LLM call. If False, score each text individually."
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

        if self.config.batch_scoring:
            # Python node to format texts for batch scoring
            format_node_id = "format_node"
            format_node = WorkflowNodeSchema(
                id=format_node_id,
                node_type="PythonFuncNode",
                config={
                    "code": """def run(texts):
                        formatted_texts = []
                        for i, text in enumerate(texts):
                            formatted_texts.append(f"Text {i+1}:\\n{text}\\n\\nRate this text:")
                        return {"formatted_text": "\\n\\n".join(formatted_texts)}""",
                    "input_schema": {"texts": "list[str]"},
                    "output_schema": {"formatted_text": "str"}
                }
            )
            nodes.append(format_node)

            # Link input to format node
            links.append(
                WorkflowLinkSchema(
                    source_id=input_node_id,
                    source_output_key="texts",
                    target_id=format_node_id,
                    target_input_key="texts",
                )
            )

            # Single LLM call for batch scoring
            batch_rate_node_id = "batch_rate_node"
            batch_rate_node = WorkflowNodeSchema(
                id=batch_rate_node_id,
                node_type="SingleLLMCallNode",
                config={
                    "llm_info": self.config.rating_model_info.model_dump(),
                    "system_message": self.config.rating_prompt,
                    "user_message": "{{ formatted_text }}",
                    "input_schema": {"formatted_text": "str"},
                    "output_schema": {"ratings": "str"}
                }
            )
            nodes.append(batch_rate_node)

            # Link format node to batch rate node
            links.append(
                WorkflowLinkSchema(
                    source_id=format_node_id,
                    source_output_key="formatted_text",
                    target_id=batch_rate_node_id,
                    target_input_key="formatted_text",
                )
            )

            # Python node to parse batch ratings
            parse_ratings_node_id = "parse_ratings_node"
            parse_ratings_node = WorkflowNodeSchema(
                id=parse_ratings_node_id,
                node_type="PythonFuncNode",
                config={
                    "code": """def run(texts, ratings):
                        import re
                        scores = [float(score) for score in re.findall(r'\\d+', ratings)]
                        return {"items": [{"text": text, "score": score} for text, score in zip(texts, scores)]}""",
                    "input_schema": {"texts": "list[str]", "ratings": "str"},
                    "output_schema": {"items": "list[dict]"}
                }
            )
            nodes.append(parse_ratings_node)

            # Link input and batch rate nodes to parse ratings node
            links.append(
                WorkflowLinkSchema(
                    source_id=input_node_id,
                    source_output_key="texts",
                    target_id=parse_ratings_node_id,
                    target_input_key="texts",
                )
            )
            links.append(
                WorkflowLinkSchema(
                    source_id=batch_rate_node_id,
                    source_output_key="ratings",
                    target_id=parse_ratings_node_id,
                    target_input_key="ratings",
                )
            )

            # Rank node to assign ranks based on scores
            rank_node_id = "rank_node"
            rank_node = WorkflowNodeSchema(
                id=rank_node_id,
                node_type="RankNode",
                config={
                    "reverse": True,  # Higher scores get better ranks
                    "key_field": "score",
                    "input_schema": {"items": "list[dict]"},
                    "output_schema": {"items": "list[dict]", "ranks": "list[int]"}
                }
            )
            nodes.append(rank_node)

            # Link parse ratings node to rank node
            links.append(
                WorkflowLinkSchema(
                    source_id=parse_ratings_node_id,
                    source_output_key="items",
                    target_id=rank_node_id,
                    target_input_key="items",
                )
            )

            # Sort node to order by score
            sort_node_id = "sort_node"
            sort_node = WorkflowNodeSchema(
                id=sort_node_id,
                node_type="SortNode",
                config={
                    "reverse": True,  # Higher scores first
                    "key_field": "score",
                    "input_schema": {"items": "list[dict]"},
                    "output_schema": {"sorted_items": "list[dict]"}
                }
            )
            nodes.append(sort_node)

            # Link rank node to sort node
            links.append(
                WorkflowLinkSchema(
                    source_id=rank_node_id,
                    source_output_key="items",
                    target_id=sort_node_id,
                    target_input_key="items",
                )
            )

            # Extract top K texts
            extract_top_k_node_id = "extract_top_k_node"
            extract_top_k_node = WorkflowNodeSchema(
                id=extract_top_k_node_id,
                node_type="PythonFuncNode",
                config={
                    "code": f"""def run(sorted_items):
                        return {{"top_texts": [item["text"] for item in sorted_items[:k]]}}""",
                    "input_schema": {"sorted_items": "list[dict]"},
                    "output_schema": {"top_texts": "list[str]"}
                }
            )
            nodes.append(extract_top_k_node)

            # Link sort node to extract node
            links.append(
                WorkflowLinkSchema(
                    source_id=sort_node_id,
                    source_output_key="sorted_items",
                    target_id=extract_top_k_node_id,
                    target_input_key="sorted_items",
                )
            )

        else:
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

            # Rank node to assign ranks based on ratings
            rank_node_id = "rank_node"
            rank_node = WorkflowNodeSchema(
                id=rank_node_id,
                node_type="RankNode",
                config={
                    "reverse": True,  # Higher ratings get better ranks
                    "key_field": "rating",
                    "input_schema": {jsonify_node_id: "dict" for jsonify_node_id in jsonify_node_ids},
                    "output_schema": {"items": "list[dict]", "ranks": "list[int]"}
                }
            )
            nodes.append(rank_node)

            # Link jsonify nodes to rank node
            for jsonify_node_id in jsonify_node_ids:
                links.append(
                    WorkflowLinkSchema(
                        source_id=jsonify_node_id,
                        source_output_key="json_string",
                        target_id=rank_node_id,
                        target_input_key=jsonify_node_id,
                    )
                )

            # Sort node to order by rating
            sort_node_id = "sort_node"
            sort_node = WorkflowNodeSchema(
                id=sort_node_id,
                node_type="SortNode",
                config={
                    "reverse": True,  # Higher ratings first
                    "key_field": "rating",
                    "input_schema": {"items": "list[dict]"},
                    "output_schema": {"sorted_items": "list[dict]"}
                }
            )
            nodes.append(sort_node)

            # Link rank node to sort node
            links.append(
                WorkflowLinkSchema(
                    source_id=rank_node_id,
                    source_output_key="items",
                    target_id=sort_node_id,
                    target_input_key="items",
                )
            )

            # Extract top K texts
            extract_top_k_node_id = "extract_top_k_node"
            extract_top_k_node = WorkflowNodeSchema(
                id=extract_top_k_node_id,
                node_type="PythonFuncNode",
                config={
                    "code": f"""def run(sorted_items):
                        return {{"top_texts": [item["text"] for item in sorted_items[:k]]}}""",
                    "input_schema": {"sorted_items": "list[dict]"},
                    "output_schema": {"top_texts": "list[str]"}
                }
            )
            nodes.append(extract_top_k_node)

            # Link sort node to extract node
            links.append(
                WorkflowLinkSchema(
                    source_id=sort_node_id,
                    source_output_key="sorted_items",
                    target_id=extract_top_k_node_id,
                    target_input_key="sorted_items",
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

        # Link final node to output
        links.append(
            WorkflowLinkSchema(
                source_id=extract_top_k_node_id,
                source_output_key="top_texts",
                target_id=output_node_id,
                target_input_key="top_texts",
            )
        )

        return WorkflowDefinitionSchema(
            nodes=nodes,
            links=links,
        )

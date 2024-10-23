# Original paper: https://arxiv.org/abs/2305.10601
# Original code: https://github.com/princeton-nlp/tree-of-thought-llm/tree/master
from ..base import BaseNode
from .string_output_llm import (
    StringOutputLLMNode,
    StringOutputLLMNodeConfig,
    StringOutputLLMNodeInput,
    StringOutputLLMNodeOutput,
)
from .advanced import AdvancedNode, AdvancedNodeConfig
from typing import Any, List
import asyncio
import numpy as np


class TreeOfThoughtsNodeConfig(StringOutputLLMNodeConfig):
    steps: int = 3
    n_generate_sample: int = 1
    n_evaluate_sample: int = 1
    n_select_sample: int = 1
    method_generate: str = "sample"  # 'sample' or 'propose'
    method_evaluate: str = "value"  # 'value' or 'vote'
    method_select: str = "greedy"  # 'greedy' or 'sample'
    prompt_sample: str = "standard"  # 'standard' or 'cot'
    temperature: float = 0.7
    stops: List[str] = []  # Stop tokens for generation
    search_method: str = "bfs"  # "bfs" or "dfs"


class TreeOfThoughtsNode(BaseNode):
    name = "tree_of_thoughts_node"
    config_model = TreeOfThoughtsNodeConfig
    input_model = StringOutputLLMNodeInput
    output_model = StringOutputLLMNodeOutput

    def setup(self) -> None:
        config = self.config

        # generation node is a basic LLM node
        generation_config = StringOutputLLMNodeConfig.model_validate(
            config.model_dump()
        )
        self._generation_node = StringOutputLLMNode(generation_config)

        # evaluation node is an advanced LLM node
        evaluation_config = AdvancedNodeConfig(
            llm_name=config.llm_name,
            max_tokens=16,
            temperature=0.1,
            system_prompt=config.system_prompt,
            input_schema={"prompt": "str"},
            output_schema={"value": "float"},
        )
        self._evaluation_llm_node = AdvancedNode(evaluation_config)
        self.input_model = StringOutputLLMNodeInput
        self.output_model = StringOutputLLMNodeOutput

    async def _generate_samples(
        self, input_data: StringOutputLLMNodeInput, y: str, stop: List[str]
    ) -> List[str]:
        if self.config.prompt_sample == "standard":
            prompt = self._standard_prompt_wrap(input_data.user_message, y)
        elif self.config.prompt_sample == "cot":
            prompt = self._cot_prompt_wrap(input_data.user_message, y)
        else:
            raise ValueError(
                f"prompt_sample {self.config.prompt_sample} not recognized"
            )

        tasks = [
            self._generation_node(StringOutputLLMNodeInput(user_message=prompt))
            for _ in range(self.config.n_generate_sample)
        ]
        responses = await asyncio.gather(*tasks)
        return [response.assitant_message for response in responses]

    def _standard_prompt_wrap(self, x: str, y: str) -> str:
        return f"{x}\n{y}"

    def _cot_prompt_wrap(self, x: str, y: str) -> str:
        return f"{x}\nLet's think step by step.\n{y}"

    async def _evaluate_samples(self, samples: List[str]) -> List[float]:
        values: List[float] = []
        tasks = [
            self._evaluation_llm_node(
                self._evaluation_llm_node.input_model.model_validate({"prompt": sample})
            )
            for sample in samples
        ]
        outputs = await asyncio.gather(*tasks)
        for output in outputs:
            value = output.model_dump().get("response", "")
            values.append(value)
        return values

    async def _get_votes(
        self, input_data: StringOutputLLMNodeInput, samples: List[str]
    ) -> List[float]:
        vote_prompt = self._vote_prompt_wrap(input_data.user_message, samples)
        vote_input = self._evaluation_llm_node.input_model.model_validate(
            {"prompt": vote_prompt}
        )
        vote_output = await self._evaluation_llm_node(vote_input)
        votes = self._parse_votes(
            vote_output.model_dump().get("response", ""), len(samples)
        )
        return votes

    def _vote_prompt_wrap(self, x: str, ys: List[str]) -> str:
        candidates = "\n\n".join(f"Candidate {i+1}:\n{y}" for i, y in enumerate(ys))
        return f"Original Query:\n{x}\n\nPlease vote for the best response among the following candidates:\n\n{candidates}"

    def _parse_votes(self, response: str, num_candidates: int) -> List[float]:
        # Implement parsing logic to extract votes from the response
        # For simplicity, assign equal votes here
        return [1.0 for _ in range(num_candidates)]

    async def run(
        self, input_data: StringOutputLLMNodeInput
    ) -> StringOutputLLMNodeOutput:
        ys: List[str] = [""]  # current output candidates
        infos: List[Any] = []  # log info

        for step in range(self.config.steps):
            # Generation
            tasks = [
                self._generate_samples(input_data, y, stop=self.config.stops)
                for y in ys
            ]
            new_ys_nested = await asyncio.gather(*tasks)
            samples = [item for sublist in new_ys_nested for item in sublist]

            # Evaluation
            if self.config.method_evaluate == "value":
                values = await self._evaluate_samples(samples)
            elif self.config.method_evaluate == "vote":
                values = await self._get_votes(input_data, samples)
            else:
                raise ValueError(
                    f"Unknown evaluation method {self.config.method_evaluate}"
                )

            # Selection
            ids = list(range(len(samples)))
            if self.config.method_select == "greedy":
                select_ids = sorted(ids, key=lambda x: values[x], reverse=True)[
                    : self.config.n_select_sample
                ]
            elif self.config.method_select == "sample":
                probabilities = np.array(values)
                probabilities /= probabilities.sum()
                select_ids = np.random.choice(
                    ids, size=self.config.n_select_sample, p=probabilities
                ).tolist()
            else:
                raise ValueError(
                    f"Unknown selection method {self.config.method_select}"
                )

            ys = [samples[select_id] for select_id in select_ids]

            # Log info if needed
            infos.append(
                {
                    "step": step,
                    "ys": ys,
                    "values": [values[select_id] for select_id in select_ids],
                }
            )

        final_output = ys[0] if ys else ""
        return StringOutputLLMNodeOutput.model_validate(
            {"assistant_message": final_output}
        )

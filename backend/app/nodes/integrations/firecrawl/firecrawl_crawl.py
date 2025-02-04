import json
import logging
from pydantic import BaseModel, Field  # type: ignore
from ...base import (
    BaseNode,
    BaseNodeConfig,
    BaseNodeInput,
    BaseNodeOutput,
)
from firecrawl import FirecrawlApp  # type: ignore
from typing import Optional, Dict
from ...utils.template_utils import render_template_or_get_first_string


class FirecrawlCrawlNodeConfig(BaseNodeConfig):
    url_template: str = Field(
        "",
        description="The URL to crawl and convert into clean markdown or structured data.",
    )
    limit: Optional[int] = Field(
        None, description="The maximum number of pages to crawl."
    )
    output_schema: Dict[str, str] = Field(
        default={"crawl_result": "string"},
        description="The schema for the output of the node",
    )
    has_fixed_output: bool = True


class FirecrawlCrawlNodeInput(BaseNodeInput):
    """Input for the firecrawl node"""

    class Config:
        extra = "allow"


class FirecrawlCrawlNodeOutput(BaseNodeOutput):
    """Output from the firecrawl node"""

    crawl_result: str = Field(
        ..., description="The crawled data in markdown or structured format."
    )


class FirecrawlCrawlNode(BaseNode):
    name = "firecrawl_crawl_node"
    display_name = "FirecrawlCrawl"
    logo = "/images/firecrawl.png"
    category = "Firecrawl"

    config_model = FirecrawlCrawlNodeConfig
    input_model = FirecrawlCrawlNodeInput
    output_model = FirecrawlCrawlNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            # Grab the entire dictionary from the input
            raw_input_dict = input.model_dump()

            # Render url_template
            url_template = render_template_or_get_first_string(
                self.config.url_template, raw_input_dict, self.name
            )

            app = FirecrawlApp()  # type: ignore
            crawl_result = app.crawl_url(  # type: ignore
                url_template,
                params={
                    "limit": self.config.limit,
                    "scrapeOptions": {"formats": ["markdown", "html"]},
                },
            )
            return FirecrawlCrawlNodeOutput(crawl_result=json.dumps(crawl_result))
        except Exception as e:
            logging.error(f"Failed to crawl URL: {e}")
            return FirecrawlCrawlNodeOutput(crawl_result="")

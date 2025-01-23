import json
import logging
from pydantic import BaseModel, Field  # type: ignore
from ..base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from firecrawl import FirecrawlApp # type: ignore
from typing import Optional


class FirecrawlNodeConfig(BaseNodeConfig):
    url: str = Field(
        "",
        description="The URL to crawl and convert into clean markdown or structured data.",
    )
    limit: Optional[int] = Field(None, description="The maximum number of pages to crawl.")


class FirecrawlNodeInput(BaseNodeInput):
    pass


class FirecrawlNodeOutput(BaseNodeOutput):
    crawl_result: str = Field(
        ..., description="The crawled data in markdown or structured format."
    )


class FirecrawlNode(BaseNode):
    name = "firecrawl_node"
    display_name = "Firecrawl"
    logo = "/images/firecrawl.png"

    config_model = FirecrawlNodeConfig
    input_model = FirecrawlNodeInput
    output_model = FirecrawlNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            app = FirecrawlApp()
            crawl_result = app.crawl_url(
                self.config.url,
                params={
                    "limit": self.config.limit,
                    "scrapeOptions": {"formats": ["markdown", "html"]},
                },
            )
            return FirecrawlNodeOutput(crawl_result=json.dumps(crawl_result))
        except Exception as e:
            logging.error(f"Failed to crawl URL: {e}")
            return FirecrawlNodeOutput(crawl_result="")

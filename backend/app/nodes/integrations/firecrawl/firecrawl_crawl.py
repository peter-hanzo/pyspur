import json
import logging
from pydantic import BaseModel, Field  # type: ignore
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from firecrawl import FirecrawlApp # type: ignore
from typing import Optional


class FirecrawlCrawlNodeConfig(BaseNodeConfig):
    url: str = Field(
        "",
        description="The URL to crawl and convert into clean markdown or structured data.",
    )
    limit: Optional[int] = Field(None, description="The maximum number of pages to crawl.")


class FirecrawlCrawlNodeInput(BaseNodeInput):
    pass


class FirecrawlCrawlNodeOutput(BaseNodeOutput):
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
            app = FirecrawlApp()
            crawl_result = app.crawl_url(
                self.config.url,
                params={
                    "limit": self.config.limit,
                    "scrapeOptions": {"formats": ["markdown", "html"]},
                },
            )
            return FirecrawlCrawlNodeOutput(crawl_result=json.dumps(crawl_result))
        except Exception as e:
            logging.error(f"Failed to crawl URL: {e}")
            return FirecrawlCrawlNodeOutput(crawl_result="")

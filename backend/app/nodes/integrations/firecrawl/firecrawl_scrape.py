import json
import logging
from pydantic import BaseModel, Field  # type: ignore
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from firecrawl import FirecrawlApp  # type: ignore


class FirecrawlScrapeNodeConfig(BaseNodeConfig):
    url: str = Field(
        "",
        description="The URL to scrape and convert into clean markdown or structured data.",
    )


class FirecrawlScrapeNodeInput(BaseNodeInput):
    pass


class FirecrawlScrapeNodeOutput(BaseNodeOutput):
    scrape_result: str = Field(
        ..., description="The scraped data in markdown or structured format."
    )


class FirecrawlScrapeNode(BaseNode):
    name = "firecrawl_scrape_node"
    display_name = "Firecrawl Scrape"
    logo = "/images/firecrawl.png"
    category = "Firecrawl"

    config_model = FirecrawlScrapeNodeConfig
    input_model = FirecrawlScrapeNodeInput
    output_model = FirecrawlScrapeNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            app = FirecrawlApp()
            scrape_result = app.scrape_url(
                self.config.url,
                params={
                    "formats": ["markdown", "html"],
                },
            )
            return FirecrawlScrapeNodeOutput(scrape_result=json.dumps(scrape_result))
        except Exception as e:
            logging.error(f"Failed to scrape URL: {e}")
            return FirecrawlScrapeNodeOutput(scrape_result="")

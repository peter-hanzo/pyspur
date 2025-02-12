import json
import logging
from pydantic import BaseModel, Field  # type: ignore
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from firecrawl import FirecrawlApp  # type: ignore
from ...utils.template_utils import render_template_or_get_first_string
from typing import Dict


class FirecrawlScrapeNodeInput(BaseNodeInput):
    """Input for the FirecrawlScrape node"""

    class Config:
        extra = "allow"


class FirecrawlScrapeNodeOutput(BaseNodeOutput):
    scrape_result: str = Field(
        ..., description="The scraped data in markdown or structured format."
    )


class FirecrawlScrapeNodeConfig(BaseNodeConfig):
    url_template: str = Field(
        "",
        description="The URL to scrape and convert into clean markdown or structured data.",
    )
    output_schema: Dict[str, str] = Field(
        default={"scrape_result": "string"},
        description="The schema for the output of the node",
    )
    has_fixed_output: bool = True
    output_json_schema: str = Field(
        default=json.dumps(FirecrawlScrapeNodeOutput.model_json_schema()),
        description="The JSON schema for the output of the node",
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
        """
        Scrapes a URL and returns the content in markdown or structured format.
        """
        try:
            # Grab the entire dictionary from the input
            raw_input_dict = input.model_dump()

            # Render url_template
            url_template = render_template_or_get_first_string(
                self.config.url_template, raw_input_dict, self.name
            )

            if not os.getenv("FIRECRAWL_API_KEY"):
                raise ValueError("FIRECRAWL_API_KEY environment variable is not set")

            app = FirecrawlApp()  # type: ignore
            scrape_result = app.scrape_url(  # type: ignore
                url_template,
                params={
                    "formats": ["markdown", "html"],
                },
            )
            return FirecrawlScrapeNodeOutput(scrape_result=json.dumps(scrape_result))
        except Exception as e:
            logging.error(f"Failed to scrape URL: {e}")
            return FirecrawlScrapeNodeOutput(scrape_result="")

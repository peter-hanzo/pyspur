import json
import logging
from pydantic import BaseModel, Field  # type: ignore
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from firecrawl import FirecrawlApp  # type: ignore
from jinja2 import Template


class FirecrawlScrapeNodeConfig(BaseNodeConfig):
    url_template: str = Field(
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
            # Grab the entire dictionary from the input
            raw_input_dict = input.model_dump()

            # Render url_template
            url_template = Template(self.config.url_template).render(**raw_input_dict)

            try:
                # If url is empty, dump the first string type in the input dictionary
                if not self.config.url_template.strip():
                    for _, value in raw_input_dict.items():
                        if isinstance(value, str):
                            url_template = value
                            break
                        else:
                            raise ValueError(
                                f"No string type found in the input dictionary: {raw_input_dict}"
                            )

            except Exception as e:
                logging.error(f"Failed to render url_template {self.name}")
                logging.error(
                    f"url_template: {self.config.url_template} with input: {raw_input_dict}"
                )
                raise e

            app = FirecrawlApp()
            scrape_result = app.scrape_url(
                url_template,
                params={
                    "formats": ["markdown", "html"],
                },
            )
            return FirecrawlScrapeNodeOutput(scrape_result=json.dumps(scrape_result))
        except Exception as e:
            logging.error(f"Failed to scrape URL: {e}")
            return FirecrawlScrapeNodeOutput(scrape_result="")

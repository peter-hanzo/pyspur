import json
import logging
from pydantic import BaseModel, Field  # type: ignore
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from firecrawl import FirecrawlApp  # type: ignore
from typing import Optional
from jinja2 import Template


class FirecrawlCrawlNodeConfig(BaseNodeConfig):
    url_template: str = Field(
        "",
        description="The URL to crawl and convert into clean markdown or structured data.",
    )
    limit: Optional[int] = Field(
        None, description="The maximum number of pages to crawl."
    )


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

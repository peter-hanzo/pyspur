import logging as logger

from pydantic import BaseModel, Field  # type: ignore
import requests
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput

class JinaReaderNodeConfig(BaseNodeConfig):
    use_readerlm_v2: bool = Field(
        True,
        description="Use the Reader LM v2 model to process the URL"
    )


class JinaReaderNodeInput(BaseNodeInput):
    url: str = Field(
        "",
        description="The URL to scrape and convert into clean markdown or structured data.",
    )


class JinaReaderNodeOutput(BaseNodeOutput):
    content: str = Field(
        ..., description="The scraped data in markdown or structured format."
    )


class JinaReaderNode(BaseNode):
    name = "jina_reader_node"
    display_name = "Reader"
    logo = "/images/jina.png"
    category = "Jina.AI"

    config_model = JinaReaderNodeConfig
    input_model = JinaReaderNodeInput
    output_model = JinaReaderNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        try:
            headers = {
                'Accept': 'application/json',
            }
            if self.config.use_readerlm_v2:
                headers['X-Respond-With'] = 'readerlm-v2'

            reader_url = 'https://r.jina.ai/{url}'.format(url=input.input_node.url)
            logger.debug(f'Fetching {reader_url}')
            response = requests.get(reader_url, headers=headers)
            logger.debug('Fetched from Jina: {text}'.format(text=response.text))
            return JinaReaderNodeOutput(content=response.text)
        except Exception as e:
            logger.error(f"Failed to convert URL: {e}")
            return JinaReaderNodeOutput(content="")

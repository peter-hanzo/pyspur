import logging

from pydantic import BaseModel, Field  # type: ignore
import httpx
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
    title: str = Field(
        "", description="The title of scraped page"
    )
    content: str = Field(
        "", description="The content of the scraped page in markdown format"
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
            async with httpx.AsyncClient() as client:
                response = await client.get(reader_url, headers=headers)
                logging.debug('Fetched from Jina: {text}'.format(text=response.text))
                output = self.output_model.validate(response.json()['data'])
            if output.content.startswith("```markdown"):
                # remove the backticks/code format indicators in the output
                output.content = output.content[12:-4]
            return output
        except Exception as e:
            logging.error(f"Failed to convert URL: {e}")
            return JinaReaderNodeOutput(title="", content="")

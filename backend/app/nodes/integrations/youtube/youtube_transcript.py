from pydantic import BaseModel, Field
from ...base import BaseNode, BaseNodeConfig, BaseNodeInput, BaseNodeOutput
from phi.tools.youtube_tools import YouTubeTools
from jinja2 import Template
import logging


class YouTubeTranscriptNodeConfig(BaseNodeConfig):
    video_url_template: str = Field(
        "", description="The YouTube video url template to fetch the transcript for."
    )


class YouTubeTranscriptNodeInput(BaseNodeInput):
    pass


class YouTubeTranscriptNodeOutput(BaseNodeOutput):
    transcript: str = Field(..., description="The transcript of the video.")


class YouTubeTranscriptNode(BaseNode):
    name = "youtube_transcript_node"
    display_name = "YouTubeTranscript"
    logo = "/images/youtube.png"
    category = "YouTube"

    config_model = YouTubeTranscriptNodeConfig
    input_model = YouTubeTranscriptNodeInput
    output_model = YouTubeTranscriptNodeOutput

    async def run(self, input: BaseModel) -> BaseModel:
        """
        Fetches the transcript for a given YouTube video ID and languages.
        """
        try:
            # Grab the entire dictionary from the input
            raw_input_dict = input.model_dump()

            # Render video_url_template
            video_url_template = Template(self.config.video_url_template).render(
                **raw_input_dict
            )

            try:
                # If url is empty, dump the first string type in the input dictionary
                if not self.config.video_url_template.strip():
                    for _, value in raw_input_dict.items():
                        if isinstance(value, str):
                            video_url_template = value
                            break
                        else:
                            raise ValueError(
                                f"No string type found in the input dictionary: {raw_input_dict}"
                            )

            except Exception as e:
                logging.error(f"Failed to render video_url_template {self.name}")
                logging.error(
                    f"video_url_template: {self.config.video_url_template} with input: {raw_input_dict}"
                )
                raise e

            yt = YouTubeTools()
            transcript: str = yt.get_youtube_video_captions(url=video_url_template)
            return YouTubeTranscriptNodeOutput(transcript=transcript)
        except Exception as e:
            logging.error(f"Failed to get transcript: {e}")
            return YouTubeTranscriptNodeOutput(transcript="")

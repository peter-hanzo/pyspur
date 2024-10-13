import os
import requests
import fal_client
from typing import Dict, Any
from .base import BaseNode
from pydantic import BaseModel, Base64Str


def generate_image_bfl(
    prompt: str, width: int = 1024, height: int = 1024
) -> Dict[str, Any]:
    """
    Generate an image using the BFL API.

    Args:
        prompt (str): The prompt describing the image to generate.
        width (int, optional): The width of the image. Defaults to 1024.
        height (int, optional): The height of the image. Defaults to 1024.

    Returns:
        dict: The JSON response from the BFL API.
    """
    response = requests.post(
        "https://api.bfl.ml/v1/image",
        headers={
            "accept": "application/json",
            "x-key": os.environ.get("BFL_API_KEY", ""),
            "Content-Type": "application/json",
        },
        json={
            "prompt": prompt,
            "width": width,
            "height": height,
        },
    )
    return response.json()


def generate_image_ideogram(
    prompt: str,
    aspect_ratio: str = "ASPECT_10_16",
    model_version: str = "V_2",
    magic_prompt_option: str = "AUTO",
) -> Dict[str, Any]:
    """
    Generate an image using the Ideogram API.

    Args:
        prompt (str): The prompt describing the image to generate.
        aspect_ratio (str, optional): The aspect ratio for the image. Defaults to "ASPECT_10_16".
        model_version (str, optional): The model version to use. Defaults to "V_2".
        magic_prompt_option (str, optional): Magic prompt option setting. Defaults to "AUTO".

    Returns:
        dict: The JSON response from the Ideogram API.
    """
    url = "https://api.ideogram.ai/generate"
    payload = {
        "image_request": {
            "prompt": prompt,
            "aspect_ratio": aspect_ratio,
            "model": model_version,
            "magic_prompt_option": magic_prompt_option,
        }
    }
    headers = {
        "Api-Key": os.environ.get("IDEOGRAM_API_KEY"),
        "Content-Type": "application/json",
    }
    response = requests.post(url, json=payload, headers=headers)
    return response.json()


def generate_image_fal(prompt: str) -> Dict[str, Any]:
    """
    Generate an image using the FAL API.

    Args:
        prompt (str): The prompt describing the image to generate.

    Returns:
        dict: The result obtained from the FAL API.
    """
    handler = fal_client.submit(
        "fal-ai/flux/dev",
        arguments={"prompt": prompt},
    )
    result = handler.get()
    return result


def generate_image(model: str, prompt: str, **kwargs: Any) -> Dict[str, Any]:
    """
    Generate an image using the specified model.

    Args:
        model (str): The model to use ('bfl', 'ideogram', or 'fal').
        prompt (str): The prompt describing the image to generate.
        **kwargs: Additional arguments specific to the model.

    Returns:
        dict: The result from the specified model's API.
    """
    if model == "bfl":
        return generate_image_bfl(prompt, **kwargs)
    elif model == "ideogram":
        return generate_image_ideogram(prompt, **kwargs)
    elif model == "fal":
        return generate_image_fal(prompt, **kwargs)
    else:
        raise ValueError(f"Unknown model: {model}")


def main() -> None:
    # Example usage:

    ### BFL
    request_id = generate_image(
        model="bfl",
        prompt="A cat on its back legs running like a human is holding a big silver fish with its arms. The cat is running away from the shop owner and has a panicked look on his face. The scene is situated in a crowded market.",
        width=1024,
        height=1024,
    )["id"]
    print(f"BFL Request ID: {request_id}")

    ### Ideogram
    ideogram_response = generate_image(
        model="ideogram",
        prompt="A serene tropical beach scene. Dominating the foreground are tall palm trees with lush green leaves, standing tall against a backdrop of a sandy beach. The beach leads to the azure waters of the sea, which gently kisses the shoreline. In the distance, there is an island or landmass with a silhouette of what appears to be a lighthouse or tower. The sky above is painted with fluffy white clouds, some of which are tinged with hues of pink and orange, suggesting either a sunrise or sunset.",
        aspect_ratio="ASPECT_10_16",
        model_version="V_2",
        magic_prompt_option="AUTO",
    )
    print(ideogram_response)

    ### FAL
    fal_result = generate_image(
        model="fal",
        prompt='Extreme close-up of a single tiger eye, direct frontal view. Detailed iris and pupil. Sharp focus on eye texture and color. Natural lighting to capture authentic eye shine and depth. The word "FLUX" is painted over it in big, white brush strokes with visible texture.',
    )
    print(fal_result)


class ImageGenConfig(BaseModel):
    """
    Configuration parameters for the ImageGenNode.
    """

    model: str


class ImageGenInput(BaseModel):
    """
    Input parameters for the ImageGenNode.
    """

    prompt: str
    width: int = 1024
    height: int = 1024
    aspect_ratio: str = "ASPECT_10_16"
    image_gen_model_version: str = "V_2"
    magic_prompt_option: str = "AUTO"


class ImageGenOutput(BaseModel):
    """
    Output parameters for the ImageGenNode.
    """

    image_data_uri: Base64Str


class ImageGenNode(BaseNode[ImageGenConfig, ImageGenInput, ImageGenOutput]):
    """
    Node that generates an image based on a prompt using the specified model.
    """

    name = "image_gen"
    config_schema = ImageGenConfig
    input_schema = ImageGenInput
    output_schema = ImageGenOutput

    def __init__(self, config: ImageGenConfig) -> None:
        self.config = config

    async def __call__(self, input_data: ImageGenInput) -> ImageGenOutput:
        result = generate_image(
            model=self.config.model,
            prompt=input_data.prompt,
            width=input_data.width,
            height=input_data.height,
            aspect_ratio=input_data.aspect_ratio,
            model_version=input_data.image_gen_model_version,
            magic_prompt_option=input_data.magic_prompt_option,
        )
        return ImageGenOutput(image_data_uri=result["image_data_uri"])


if __name__ == "__main__":
    main()

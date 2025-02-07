from enum import Enum
from typing import Dict, List


class RecognisedMimeType(str, Enum):
    """Recognized MIME types that LLMs may support."""

    # Images
    JPEG = "image/jpeg"
    PNG = "image/png"
    GIF = "image/gif"
    WEBP = "image/webp"
    SVG = "image/svg+xml"

    # Audio
    MP3 = "audio/mpeg"
    WAV = "audio/wav"
    OGG_AUDIO = "audio/ogg"
    WEBM_AUDIO = "audio/webm"

    # Video
    MP4 = "video/mp4"
    WEBM_VIDEO = "video/webm"
    OGG_VIDEO = "video/ogg"

    # Documents
    PDF = "application/pdf"
    DOC = "application/msword"
    DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    XLS = "application/vnd.ms-excel"
    XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    PPT = "application/vnd.ms-powerpoint"
    PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

    # Text
    PLAIN = "text/plain"
    HTML = "text/html"
    MARKDOWN = "text/markdown"
    CSV = "text/csv"
    XML = "text/xml"
    JSON = "application/json"


class MimeCategory(str, Enum):
    """Categories of MIME types that LLMs may support."""

    IMAGES = "images"
    AUDIO = "audio"
    VIDEO = "video"
    DOCUMENTS = "documents"
    TEXT = "text"


# Common MIME types by category
MIME_TYPES_BY_CATEGORY: Dict[MimeCategory, List[RecognisedMimeType]] = {
    MimeCategory.IMAGES: [
        RecognisedMimeType.JPEG,
        RecognisedMimeType.PNG,
        RecognisedMimeType.GIF,
        RecognisedMimeType.WEBP,
        RecognisedMimeType.SVG,
    ],
    MimeCategory.AUDIO: [
        RecognisedMimeType.MP3,
        RecognisedMimeType.WAV,
        RecognisedMimeType.OGG_AUDIO,
        RecognisedMimeType.WEBM_AUDIO,
    ],
    MimeCategory.VIDEO: [
        RecognisedMimeType.MP4,
        RecognisedMimeType.WEBM_VIDEO,
        RecognisedMimeType.OGG_VIDEO,
    ],
    MimeCategory.DOCUMENTS: [
        RecognisedMimeType.PDF,
        RecognisedMimeType.DOC,
        RecognisedMimeType.DOCX,
        RecognisedMimeType.XLS,
        RecognisedMimeType.XLSX,
        RecognisedMimeType.PPT,
        RecognisedMimeType.PPTX,
    ],
    MimeCategory.TEXT: [
        RecognisedMimeType.PLAIN,
        RecognisedMimeType.HTML,
        RecognisedMimeType.MARKDOWN,
        RecognisedMimeType.CSV,
        RecognisedMimeType.XML,
        RecognisedMimeType.JSON,
    ],
}

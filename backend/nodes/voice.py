from pathlib import Path
from typing import Optional, Literal
from elevenlabs import ElevenLabs, VoiceSettings
from openai import OpenAI


class TextToSpeechEngine:
    def __init__(self, api_key: str, output_format: str = "mp3_22050_32") -> None:
        self.api_key: str = api_key
        self.output_format: str = output_format

    def synthesize_speech(
        self, text: str, voice_settings: Optional[VoiceSettings] = None
    ) -> bytes:
        """Synthesize speech from text."""
        raise NotImplementedError("Subclasses must implement this method.")


class ElevenLabsTTS(TextToSpeechEngine):
    def __init__(
        self,
        api_key: str,
        voice_id: str,
        output_format: str = "mp3_22050_32",
        voice_settings: Optional[VoiceSettings] = None,
    ) -> None:
        super().__init__(api_key, output_format)
        self.voice_id: str = voice_id
        self.client: ElevenLabs = ElevenLabs(api_key=self.api_key)
        self.voice_settings: VoiceSettings = voice_settings or VoiceSettings(
            stability=0.1,
            similarity_boost=0.3,
            style=0.2,
        )

    def synthesize_speech(
        self, text: str, voice_settings: Optional[VoiceSettings] = None
    ) -> bytes:
        try:
            settings: VoiceSettings = voice_settings or self.voice_settings
            audio_content: bytes = b"".join(
                self.client.text_to_speech.convert(
                    voice_id=self.voice_id,
                    optimize_streaming_latency="0",
                    output_format=self.output_format,
                    text=text,
                    voice_settings=settings,
                )
            )
            return audio_content  # Audio content as bytes
        except Exception as e:
            raise Exception(f"ElevenLabs SDK error: {str(e)}")


class OpenAITTS(TextToSpeechEngine):
    def __init__(
        self,
        api_key: str,
        voice_name: Literal[
            "alloy", "echo", "fable", "onyx", "nova", "shimmer"
        ],  # Restrict to allowed voices
        output_format: str = "mp3",
    ) -> None:
        super().__init__(api_key, output_format)
        self.voice_name: Literal[
            "alloy", "echo", "fable", "onyx", "nova", "shimmer"
        ] = voice_name  # Ensure type matches
        self.client: OpenAI = OpenAI(api_key=self.api_key)

    def synthesize_speech(self, text: str, model: str = "tts-1") -> bytes:
        try:
            speech_file_path: Path = Path(__file__).parent / "speech.mp3"
            response = self.client.audio.speech.create(
                model=model, voice=self.voice_name, input=text
            )
            response.stream_to_file(speech_file_path)
            with open(speech_file_path, "rb") as f:
                audio_content: bytes = f.read()
            return audio_content  # Audio content as bytes
        except Exception as e:
            raise Exception(f"OpenAI SDK error: {str(e)}")

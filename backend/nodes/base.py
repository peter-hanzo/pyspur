from abc import ABC, abstractmethod
from typing import get_type_hints, Dict, Any, Type

class BaseNode(ABC):
    """
    Base class for all nodes.
    """
    OutputType: Dict[str, Type[Any]] = None  # Default to None

    def __init__(self, **config):
        self.config = config
        self._validate_config()
        # Allow OutputType to be set in __init__ if not defined as class variable
        if not self.OutputType:
            if hasattr(self, 'OutputType'):
                pass  # OutputType is set in __init__
            else:
                raise TypeError(f"{self.__class__.__name__} must define 'OutputType'.")

    def _validate_config(self):
        config_type_hints = get_type_hints(self.__init__)
        config_type_hints.pop('return', None)
        config_type_hints.pop('self', None)
        for name, expected_type in config_type_hints.items():
            if name in self.config:
                value = self.config[name]
                if not isinstance(value, expected_type):
                    raise TypeError(
                        f"Config parameter '{name}' should be of type {expected_type}, got {type(value)}"
                    )
                setattr(self, name, value)
            else:
                raise ValueError(f"Missing config parameter '{name}'")

    async def __call__(self, **inputs) -> Dict[str, Any]:
        self._validate_inputs(inputs)
        result = await self.run(**inputs)
        self._validate_outputs(result)
        return result

    def _validate_inputs(self, inputs):
        input_type_hints = get_type_hints(self.run)
        input_type_hints.pop('return', None)
        input_type_hints.pop('self', None)
        for name, expected_type in input_type_hints.items():
            if name in inputs:
                value = inputs[name]
                if not isinstance(value, expected_type):
                    raise TypeError(
                        f"Input parameter '{name}' should be of type {expected_type}, got {type(value)}"
                    )
            else:
                raise ValueError(f"Missing input parameter '{name}'")

    def _validate_outputs(self, outputs):
        for name, expected_type in self.OutputType.items():
            if name in outputs:
                value = outputs[name]
                if not isinstance(value, expected_type):
                    raise TypeError(
                        f"Output parameter '{name}' should be of type {expected_type}, got {type(value)}"
                    )
            else:
                raise ValueError(f"Missing output parameter '{name}'")

    @abstractmethod
    async def run(self, **inputs) -> Dict[str, Any]:
        pass

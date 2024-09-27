import inspect
import pkgutil
import importlib
from typing import Dict, Type
from .base import BaseNodeType

node_type_registry: Dict[str, Type[BaseNodeType]] = {}

# Dynamically load and register node types
for _, module_name, _ in pkgutil.iter_modules(__path__):
    module = importlib.import_module(f"{__name__}.{module_name}")
    for name, obj in inspect.getmembers(module, inspect.isclass):
        if issubclass(obj, BaseNodeType) and obj is not BaseNodeType:
            node_type_registry[obj.__name__] = obj
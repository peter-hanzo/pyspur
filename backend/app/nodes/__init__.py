import os
import inspect
import importlib
from typing import Dict, Type

from .base import BaseNode, BaseModel


node_registry: Dict[str, Type[BaseNode[BaseModel, BaseModel, BaseModel]]] = {}


def recursive_import_and_register(package_path: str, package_name: str) -> None:
    for root, _, files in os.walk(package_path):
        for file in files:
            if file.endswith(".py") and not file.startswith("__"):
                module_path = os.path.relpath(os.path.join(root, file), package_path)
                module_name = module_path.replace(os.sep, ".").rsplit(".", 1)[0]
                full_module_name = f"{package_name}.{module_name}"
                module = importlib.import_module(full_module_name)
                for _, obj in inspect.getmembers(module, inspect.isclass):
                    if issubclass(obj, BaseNode) and obj is not BaseNode:
                        node_registry[obj.__name__] = obj


recursive_import_and_register(list(__path__)[0], __name__)

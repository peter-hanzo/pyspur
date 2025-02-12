# backend/app/nodes/registry.py
import importlib
import importlib.util
from pathlib import Path
from typing import Dict, List, Optional, Set, Type
from .base import BaseNode
from loguru import logger

class NodeRegistry:
    _nodes: Dict[str, List[Dict[str, str]]] = {}
    _decorator_registered_classes: Set[Type[BaseNode]] = set()  # Track classes registered via decorator

    @classmethod
    def register(cls,
                category: str = "Uncategorized",
                display_name: Optional[str] = None,
                logo: Optional[str] = None):
        """
        Decorator to register a node class with metadata.

        Args:
            category: The category this node belongs to
            display_name: Optional display name for the node
            logo: Optional path to the node's logo
        """
        def decorator(node_class: Type[BaseNode]) -> Type[BaseNode]:
            # Set metadata on the class
            if not hasattr(node_class, 'category'):
                node_class.category = category
            if display_name:
                node_class.display_name = display_name
            if logo:
                node_class.logo = logo

            # Initialize category if not exists
            if category not in cls._nodes:
                cls._nodes[category] = []

            # Create node registration info
            # Remove 'app.' prefix from module path if present
            module_path = node_class.__module__
            if module_path.startswith('app.'):
                module_path = module_path[4:]  # Remove 'app.' prefix

            node_info = {
                "node_type_name": node_class.__name__,
                "module": f".{module_path}",
                "class_name": node_class.__name__
            }

            # Add to registry if not already present
            if not any(n["node_type_name"] == node_class.__name__ for n in cls._nodes[category]):
                cls._nodes[category].append(node_info)
                logger.debug(f"Registered node {node_class.__name__} in category {category}")
                cls._decorator_registered_classes.add(node_class)

            return node_class
        return decorator

    @classmethod
    def get_registered_nodes(cls) -> Dict[str, List[Dict[str, str]]]:
        """Get all registered nodes."""
        return cls._nodes

    @classmethod
    def _discover_in_directory(cls, base_path: Path, package_prefix: str) -> None:
        """
        Recursively discover nodes in a directory and its subdirectories.
        Only registers nodes that explicitly use the @NodeRegistry.register decorator.
        """
        # Get all Python files in current directory
        for item in base_path.iterdir():
            if item.is_file() and item.suffix == '.py' and not item.name.startswith('_'):
                # Construct module name from package prefix and file name
                module_name = f"{package_prefix}.{item.stem}"

                try:
                    # Import module but don't register nodes - they'll self-register if decorated
                    importlib.import_module(module_name)
                except Exception as e:
                    logger.error(f"Failed to load module {module_name}: {e}")

            # Recursively process subdirectories
            elif item.is_dir() and not item.name.startswith('_'):
                subpackage = f"{package_prefix}.{item.name}"
                cls._discover_in_directory(item, subpackage)

    @classmethod
    def discover_nodes(cls, package_path: str = "app.nodes") -> None:
        """
        Automatically discover and register nodes from the package.
        Only nodes with the @NodeRegistry.register decorator will be registered.

        Args:
            package_path: The base package path to search for nodes
        """
        try:
            package = importlib.import_module(package_path)
            if not hasattr(package, '__file__') or package.__file__ is None:
                raise ImportError(f"Cannot find package {package_path}")

            base_path = Path(package.__file__).parent
            logger.info(f"Discovering nodes in: {base_path}")

            # Start recursive discovery
            cls._discover_in_directory(base_path, package_path)

            logger.info(f"Node discovery complete. Found {len(cls._decorator_registered_classes)} decorated nodes.")

        except ImportError as e:
            logger.error(f"Failed to import base package {package_path}: {e}")
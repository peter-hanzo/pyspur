import inspect
import pkgutil
import importlib

# Dictionary to hold the class registry
node_registry = {}

# Iterate over all submodules in the node package
for _, module_name, _ in pkgutil.iter_modules(__path__):
    full_module_name = f"{__name__}.{module_name}"
    module = importlib.import_module(full_module_name)
    
    # Iterate over all members of the module
    for member_name, member in inspect.getmembers(module):
        # Check if the member is a class
        if inspect.isclass(member):
            # Add the class to the registry
            node_registry[member_name] = member

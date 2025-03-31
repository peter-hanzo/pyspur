# PySpur Backend Tests

This directory contains tests for the PySpur backend application.

## Directory Structure

- `cli/`: Tests for the CLI module
- `nodes/`: Tests for the nodes module
- `conftest.py`: Common test fixtures

## Running Tests

To run all tests:
```bash
python -m pytest
```

To run tests for a specific module:
```bash
python -m pytest tests/cli/
```

To run a specific test file:
```bash
python -m pytest tests/cli/test_main.py
```

## Coverage

To run tests with coverage:
```bash
python -m pytest --cov=pyspur
```

To generate a coverage report:
```bash
python -m pytest --cov=pyspur --cov-report=html
```

This will create an HTML report in the `htmlcov` directory.

## Adding New Tests

When adding new tests:

1. Create a test file with the prefix `test_` (e.g., `test_utils.py`)
2. Group related tests in the appropriate directory (e.g., `cli/`, `nodes/`)
3. Use fixtures from `conftest.py` where possible to avoid duplicating setup code
4. Use mocks to avoid external dependencies

## Test Naming Conventions

- Test files: `test_<module_name>.py`
- Test functions: `test_<function_name>_<scenario>`
- Test classes: `Test<ClassNameBeingTested>`
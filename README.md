# PySpur - An IDE for Inference-Time Compute

PySpur is a drag-and-drop IDE that lets you develop, debug, and deploy inference-time compute pipelines.

*Insert GIF here*

# ✨ Three Key Features

1. **Inference-Time Compute Nodes**: We natively support nodes for
    * **High-level, batteries-included planners** (MCTS, Self-Refinement, BoN, ToT, etc.)
    * **Low-level primitives for parallel and sequential sampling** (cycles, branching, aggregation) to build custom planners
    * **Verifiers** (Code nodes, LLM-as-a-judge, software integrations, etc.)
2. **Job Queue for Batch Inference**:
    * **Submit and manage batch jobs via UI**
    * **Self-hosting of async batch APIs**
    * **Fault tolerance and job persistence**
3. **Evals**:
    * **Common reasoning benchmarks** (GSM8k, MATH, ARC, etc.)

# 🕸️ Why PySpur?

Humans think for longer on difficult problems to improve their decisions. Similarly, we can enable LLMs to utilize additional compute at inference time via computational graphs that involve multiple steps and feedback loops. However, developing, debugging, and deploying such graphs can be challenging due to the intricate interdependencies among nodes, where the output of one node becomes the input for the next.

The goal of PySpur is to enable developers to quickly build, test, and deploy such LLM graphs - all while abstracting away the complexity of parallel execution and state management.

# ⚡ Quick start

```bash
npm start
```

## Prerequisites

- Node.js (v20 or higher)
- Python (v3.12 or higher)
- Docker (optional, for containerized development)

## Installation

### Backend

1. **Clone the repository:**
    ```sh
    git clone https://github.com/your-repo/pyspur.git
    cd pyspur
    ```

2. **Set up a virtual environment:**
    ```sh
    python -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```

3. **Install Python dependencies:**
    ```sh
    pip install -r backend/requirements.txt
    ```

### Frontend

1. **Navigate to the frontend directory:**
    ```sh
    cd frontend
    ```

2. **Install Node.js dependencies:**
    ```sh
    yarn install
    ```

## Development

### Backend

1. **Run the backend server:**
    ```sh
    uvicorn backend.api.main:app --reload
    ```

### Frontend

1. **Run the frontend development server:**
    ```sh
    yarn start
    ```

2. **Open your browser and navigate to:**
    ```
    http://localhost:3000
    ```

### Docker (Optional)

1. **Build and run the services using Docker Compose:**
    ```sh
    docker-compose up --build
    ```

2. **Access the frontend at:**
    ```
    http://localhost:3000
    ```

3. **Access the backend at:**
    ```
    http://localhost:8000
    ```

## Available Scripts

### Frontend

In the `frontend` directory, you can run:

- **`yarn start`**: Runs the app in development mode.
- **`yarn test`**: Launches the test runner.
- **`yarn build`**: Builds the app for production.
- **`yarn eject`**: Ejects the Create React App configuration.

For more details, refer to the [frontend/README.md](frontend/README.md).

## Learn More

- **Create React App documentation**: [Create React App](https://facebook.github.io/create-react-app/docs/getting-started)
- **React documentation**: [React](https://reactjs.org/)
- **FastAPI documentation**: [FastAPI](https://fastapi.tiangolo.com/)

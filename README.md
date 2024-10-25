# PySpur

PySpur is an intuitive AI dev tool that simplifies building LLM workflows. Developers can visually drag, drop, and link nodes on a 2D canvas, enabling quick assembly of LLM pipelines. Workflows can be exported as API endpoints or raw Python code for seamless integration.


# Core Features
1. Inference-Time Compute Algorithms
2. Visual IDE
3. Batch Inference
4. Python-based
5. Caching
6. Session persistence
7.

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

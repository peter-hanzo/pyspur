# PySpur

PySpur is an AI Workflow Builder that allows developers to create complex AI workflows using a combination of backend and frontend technologies. This repository contains both the backend and frontend code necessary to run the application.

## Prerequisites

- Node.js (v14 or higher)
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
    npm install
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
    npm start
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

- **`npm start`**: Runs the app in development mode.
- **`npm test`**: Launches the test runner.
- **`npm run build`**: Builds the app for production.
- **`npm run eject`**: Ejects the Create React App configuration.

For more details, refer to the [frontend/README.md](frontend/README.md).

## Learn More

- **Create React App documentation**: [Create React App](https://facebook.github.io/create-react-app/docs/getting-started)
- **React documentation**: [React](https://reactjs.org/)
- **FastAPI documentation**: [FastAPI](https://fastapi.tiangolo.com/)

## License

This project is licensed under the MIT License.

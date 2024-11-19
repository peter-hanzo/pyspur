# PySpur - An IDE for Inference-Time Compute

PySpur is a drag-and-drop IDE that lets you develop, debug, and deploy inference-time compute pipelines.

*Insert GIF here*

# ✨ Three Key Features

1. **Develop with Inference-Time Compute Nodes**:
    * **High-level, batteries-included planners** (MCTS, Self-Refinement, BoN, ToT, etc.)
    * **Low-level primitives for parallel and sequential sampling** (cycles, routers, branchers, aggregators)
    * **Verifiers** (Code nodes, LLM-as-a-judge, software integrations, etc.)
2. **Debug with Evals**:
    * **Common reasoning benchmarks** (GSM8k, MATH, ARC, etc.)
    * **Scorers** via LLM-as-a-judge
    * **Custom datasets** via CSV, JSONL, HF Datasets
3. **Deploy for Batch Inference via Job Queue**:
    * **Submit and manage batch jobs via UI** for ease of use
    * **Self-hosting of async batch APIs** for full flexbility
    * **Fault tolerance and job persistence** for long-running jobs

# 🕸️ Why PySpur?

Humans think for longer on difficult problems to improve their decisions. Similarly, we can enable LLMs to utilize additional compute at inference time via computational graphs that involve multiple steps and feedback loops. However, developing, debugging, and deploying such graphs can be challenging due to the intricate interdependencies among nodes, where the output of one node becomes the input for the next.

The goal of PySpur is to enable developers to quickly build, test, and deploy such LLM graphs by abstracting away the complexity of parallel execution and state management.

While there are more agent frameworks out there than agents, we believe that PySpur's

# ⚡ Quick start

You can get PySpur up and running in three quick steps.

1. **Clone the repository:**
    ```sh
    git clone https://github.com/your-repo/pyspur.git
    cd pyspur
    ```

2. **Start the docker services:**
    
    ```sudo docker compose up --build -d```
    
    This will start a local instance of PySpur that will store spurs and their runs in a local SQLite file.

3. **Access the portal:**
    
    Go to `http://localhost:6080/` in your browser. 

    Enter `pyspur`/`canaryhattan` as username/password.





#  Development Setup

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

## Development Servers

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
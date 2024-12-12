# PySpur - AI Agents Builder

<p align="center">
  <a href="./README.md"><img alt="README in English" src="https://img.shields.io/badge/English-blue"></a>
  <a href="./README_CN.md"><img alt="简体中文版自述文件" src="https://img.shields.io/badge/简体中文-blue"></a>
  <a href="./README_JA.md"><img alt="日本語のREADME" src="https://img.shields.io/badge/日本語-blue"></a>
  <a href="./README_KR.md"><img alt="README in Korean" src="https://img.shields.io/badge/한국어-blue"></a>
  <a href="./README_DE.md"><img alt="Deutsche Version der README" src="https://img.shields.io/badge/Deutsch-blue"></a>
<a href="./README_FR.md"><img alt="Version française du README" src="https://img.shields.io/badge/Français-blue"></a>
<a href="./README_ES.md"><img alt="Versión en español del README" src="https://img.shields.io/badge/Español-blue"></a>
</p>

https://github.com/user-attachments/assets/19cf6f99-6d66-45dc-911c-74025f87b1d2

# ✨ Core Benefits

1. **Drag-and-drop AI Agents Builder**:
    * **High-level, batteries-included prompting techniques** (MCTS, Self-Refinement, BoN, ToT, etc.)
    * **Low-level primitives for parallel/sequential sampling** (loops, if-else, merge branches)
    * **Verifiers** (Code nodes, LLM-as-a-judge, software integrations, etc.)
2. **Debug with Evals Visualizer**:
    * **Common reasoning benchmarks** (GSM8k, MATH, ARC, etc.)
    * **Scorers** via LLM-as-a-judge
    * **Custom datasets** via CSV, JSONL, HF Datasets
3. **One-Click Deployment of a Batch Inference API**:
    * **Self-hosting of async batch APIs** for full flexbility
    * **Submit/manage batch jobs via UI** for ease of use
    * **Fault tolerance and job persistence** for long-running jobs

# 🕸️ Why PySpur?

* **Easy-to-hack**, eg., one can add new workflow nodes by simply creating a single Python file.
* **JSON configs** of workflow graphs, enabling easy sharing and version control.
* **Lightweight** via minimal dependencies, avoiding bloated LLM frameworks.


# 🗺️ Roadmap

- [X] Canvas
- [X] Async/Batch Execution
- [X] Evals
- [X] Spur API
- [ ] New Nodes
    - [X] LLM Nodes
    - [X] If-Else
    - [X] Merge Branches
    - [ ] Tools
    - [ ] Loops
- [ ] Pipeline optimization via DSPy and related methods
- [ ] Templates
- [ ] Compile Spurs to Code
- [ ] Multimodal support
- [ ] Containerization of Code Verifiers
- [ ] Leaderboard
- [ ] Generate Spurs via AI

Your feedback will be massively appreciated.
Please [tell us](mailto:founders@pyspur.dev?subject=Feature%20Request&body=I%20want%20this%20feature%3Ai) which features on that list you like to see next or request entirely new ones.

# ⚡ Quick start

You can get PySpur up and running in three quick steps.

1. **Clone the repository:**
    ```sh
    git clone https://github.com/PySpur-com/PySpur.git
    cd pyspur
    ```

2. **Start the docker services:**

    ```sudo docker compose up --build -d```

    This will start a local instance of PySpur that will store spurs and their runs in a local SQLite file.

3. **Access the portal:**

    Go to `http://localhost:6080/` in your browser.

    Enter `pyspur`/`canaryhattan` as username/password.
![PySpur](./docs/images/hero.png)

<p align="center"><strong>PySpur 是一个用于在 Python 中可视化代理轨迹的图形用户界面。AI 工程师使用它来构建代理、逐步执行并检查过去的运行记录。</strong></p>

<p align="center">
  <a href="./README.md"><img alt="README in English" src="https://img.shields.io/badge/English-blue"></a>
  <a href="./README_CN.md"><img alt="简体中文版自述文件" src="https://img.shields.io/badge/简体中文-blue"></a>
  <a href="./README_JA.md"><img alt="日本語のREADME" src="https://img.shields.io/badge/日本語-blue"></a>
  <a href="./README_KR.md"><img alt="README in Korean" src="https://img.shields.io/badge/한국어-blue"></a>
  <a href="./README_DE.md"><img alt="Deutsche Version der README" src="https://img.shields.io/badge/Deutsch-blue"></a>
  <a href="./README_FR.md"><img alt="Version française du README" src="https://img.shields.io/badge/Français-blue"></a>
  <a href="./README_ES.md"><img alt="Versión en español del README" src="https://img.shields.io/badge/Español-blue"></a>
</p>

<p align="center">
  <a href="https://docs.pyspur.dev/" target="_blank">
    <img alt="Docs" src="https://img.shields.io/badge/Docs-green.svg?style=for-the-badge&logo=readthedocs&logoColor=white">
  </a>
  <a href="https://calendly.com/d/cnf9-57m-bv3/pyspur-founders" target="_blank">
    <img alt="Meet us" src="https://img.shields.io/badge/Meet%20us-blue.svg?style=for-the-badge&logo=calendly&logoColor=white">
  </a>
  <a href="https://forms.gle/5wHRctedMpgfNGah7" target="_blank">
    <img alt="Cloud" src="https://img.shields.io/badge/Cloud-orange.svg?style=for-the-badge&logo=cloud&logoColor=white">
  </a>
  <a href="https://discord.gg/7Spn7C8A5F">
    <img alt="Join Our Discord" src="https://img.shields.io/badge/Discord-7289DA.svg?style=for-the-badge&logo=discord&logoColor=white">
  </a>
</p>

https://github.com/user-attachments/assets/1ebf78c9-94b2-468d-bbbb-566311df16fe

# 🕸️ 为什么选择 PySpur?

- 🖐️ **拖拽式操作**：在几秒钟内构建、测试和迭代。
- 🔄 **循环**：支持带记忆的迭代工具调用。
- 📤 **文件上传**：上传文件或粘贴 URL 以处理文档。
- 📋 **结构化输出**：用于 JSON 模式的 UI 编辑器。
- 🗃️ **RAG**：解析、分块、嵌入并将数据插入向量数据库。
- 🖼️ **多模态**：支持视频、图片、音频、文本和代码。
- 🧰 **工具**：支持 Slack、Firecrawl.dev、Google Sheets、GitHub 等。
- 🧪 **评估**：在真实世界数据集上评估代理。
- 🚀 **一键部署**：发布为 API 并随处集成。
- 🐍 **基于 Python**：通过创建单个 Python 文件添加新节点。
- 🎛️ **支持多供应商**：支持超过 100 个 LLM 提供商、嵌入器和向量数据库。

# ⚡ 快速开始

## 选项 A：使用 `pyspur` Python 包

这是最快的入门方式。需要 Python 3.12 或更高版本。

1. **安装 PySpur:**
    ```sh
    pip install pyspur
    ```

2. **初始化新项目:**
    ```sh
    pyspur init my-project
    cd my-project
    ```
    这将创建一个包含 `.env` 文件的新目录。

3. **启动服务器:**
    ```sh
    pyspur serve --sqlite
    ```
    默认情况下，这将在 `http://localhost:6080` 启动 PySpur 应用，并使用 sqlite 数据库。
    我们建议您在 `.env` 文件中配置 Postgres 实例 URL，以获得更稳定的体验。

4. **[可选] 自定义您的部署:**
    您可以通过两种方式自定义您的 PySpur 部署：

    a. **通过应用内设置**（推荐）:
       - 在应用中导航至 API 密钥选项卡
       - 为各个提供商（如 OpenAI、Anthropic 等）添加您的 API 密钥
       - 更改将立即生效

    b. **手动配置**:
       - 编辑项目目录中的 `.env` 文件
       - 建议在 .env 文件中配置 Postgres 数据库以提高稳定性
       - 使用 `pyspur serve` 重新启动应用。如果不使用 Postgres，则添加 `--sqlite`

## 选项 B：使用 Docker（推荐用于可扩展的生产系统）

这是生产部署的推荐方式：

1. **安装 Docker:**
    首先，请根据您的操作系统，按照官方安装指南安装 Docker：
    - [Docker for Linux](https://docs.docker.com/engine/install/)
    - [Docker Desktop for Mac](https://docs.docker.com/desktop/install/mac-install/)

2. **创建 PySpur 项目:**
    安装 Docker 后，使用以下命令创建一个新的 PySpur 项目：
    ```sh
    curl -fsSL https://raw.githubusercontent.com/PySpur-com/pyspur/main/start_pyspur_docker.sh | bash -s pyspur-project
    ```
    这将：
    - 在名为 `pyspur-project` 的新目录中启动一个新的 PySpur 项目
    - 设置必要的配置文件
    - 自动启动由本地 Postgres Docker 实例支持的 PySpur 应用

3. **访问 PySpur:**
    在浏览器中访问 `http://localhost:6080`。

4. **[可选] 自定义您的部署:**
    您可以通过两种方式自定义您的 PySpur 部署：

    a. **通过应用内设置**（推荐）:
       - 在应用中导航至 API 密钥选项卡
       - 为各个提供商（如 OpenAI、Anthropic 等）添加您的 API 密钥
       - 更改将立即生效

    b. **手动配置**:
       - 编辑项目目录中的 `.env` 文件
       - 使用以下命令重启服务:
         ```sh
         docker compose up -d
         ```

就这样！点击 “New Spur” 创建工作流，或从内置模板开始。

# ✨ 核心优势

## 节点级别调试:

https://github.com/user-attachments/assets/6e82ad25-2a46-4c50-b030-415ea9994690

## 多模态（上传文件或粘贴 URL）

PDF 文件、视频、音频、图片，...

https://github.com/user-attachments/assets/83ed9a22-1ec1-4d86-9dd6-5d945588fd0b

## 循环

<img width="1919" alt="循环" src="https://github.com/user-attachments/assets/3aea63dc-f46f-46e9-bddd-e2af9c2a56bf" />

## RAG

### 步骤 1）创建文档集合（分块 + 解析）

https://github.com/user-attachments/assets/c77723b1-c076-4a64-a01d-6d6677e9c60e

### 步骤 2）创建向量索引（嵌入 + 向量数据库插入）

https://github.com/user-attachments/assets/50e5c711-dd01-4d92-bb23-181a1c5bba25

## 模块化构建块

https://github.com/user-attachments/assets/6442f0ad-86d8-43d9-aa70-e5c01e55e876

## 评估最终性能

https://github.com/user-attachments/assets/4dc2abc3-c6e6-4d6d-a5c3-787d518de7ae

## 敬请期待：自我改进

https://github.com/user-attachments/assets/5bef7a16-ef9f-4650-b385-4ea70fa54c8a

# 🛠️ PySpur 开发设置
#### [ 适用于类 Unix 系统的开发指南。不支持在 Windows/PC 上开发 ]

在开发过程中，请按照以下步骤操作：

1. **克隆仓库:**
    ```sh
    git clone https://github.com/PySpur-com/pyspur.git
    cd pyspur
    ```

2. **使用 docker-compose.dev.yml 启动:**
    ```sh
    docker compose -f docker-compose.dev.yml up --build -d
    ```
    这将启动一个本地 PySpur 实例，并为开发启用热重载功能。

3. **自定义您的设置:**
    编辑 `.env` 文件以配置您的环境。默认情况下，PySpur 使用本地 PostgreSQL 数据库。若要使用外部数据库，请修改 `.env` 文件中的 `POSTGRES_*` 变量。

# ⭐ 支持我们

您可以通过点赞支持我们的工作！谢谢！

![star](https://github.com/user-attachments/assets/71f65273-6755-469d-be44-087bb89d5e76)

非常感谢您的反馈。
请 [告诉我们](mailto:founders@pyspur.dev?subject=Feature%20Request&body=I%20want%20this%20feature%3Ai) 您希望接下来看到哪些功能，或提出全新的功能需求。

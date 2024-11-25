# PySpur - 可视化LLM推理路径的图形界面

<p align="center">
  <a href="./README.md"><img alt="README in English" src="https://img.shields.io/badge/English-blue"></a>
  <a href="./README_CN.md"><img alt="简体中文版自述文件" src="https://img.shields.io/badge/简体中文-blue"></a>
  <a href="./README_JA.md"><img alt="日本語のREADME" src="https://img.shields.io/badge/日本語-blue"></a>
  <a href="./README_KR.md"><img alt="README in Korean" src="https://img.shields.io/badge/한국어-blue"></a>
</p>


https://github.com/user-attachments/assets/19cf6f99-6d66-45dc-911c-74025f87b1d2

# 🕸️ 为什么选择 PySpur？

* 人类在面对复杂问题时，会通过花费更多时间思考来优化决策。
* 类似地，我们可以通过包含多步骤和反馈循环的计算图让大型语言模型（LLM）思考更久。
* 然而，这种图涉及节点之间的复杂依赖关系，一个节点的输出成为另一个节点的输入。
* **PySpur 的目标是通过抽象并行执行和状态管理的复杂性，使开发者能够构建、测试和部署这样的 LLM 计算图。**

# ✨ 核心优势

1. **使用推理时计算节点进行开发**：
    * **高层次、功能齐全的规划器**（MCTS、自我改进、BoN、ToT 等）
    * **用于并行/顺序采样的低层次原语**（循环、路由器、分支器、聚合器）
    * **验证器**（代码节点、LLM-作为评判者、软件集成等）
2. **通过评估工具进行调试**：
    * **常用推理基准**（GSM8k、MATH、ARC 等）
    * **评分工具** 使用 LLM-作为评判者
    * **自定义数据集** 支持 CSV、JSONL、HF 数据集
3. **通过任务队列部署批量推理**：
    * **通过 UI 提交/管理批量任务**，操作简单
    * **异步批量 API 的自托管**，提供完全灵活性
    * **容错和任务持久化**，支持长时间运行的任务

# 🗺️ 路线图

- [X] 画布
- [X] 推理时计算节点
- [X] 异步/批量执行
- [ ] 模板
- [ ] 将 Spurs 编译为代码
- [ ] 推理时计算节点监控
- [ ] 新增节点
    - [ ] 工具
    - [ ] 循环
    - [ ] 条件分支
- [ ] 评估工具
- [ ] 多模态
- [ ] Spur API
- [ ] 代码验证器容器化
- [ ] 排行榜
- [ ] 通过 AI 生成 Spurs

您的反馈对我们至关重要。
请通过 [邮件](mailto:founders@pyspur.dev?subject=Feature%20Request&body=I%20want%20this%20feature%3Ai) 告诉我们您希望优先实现的功能，或者请求完全新功能。

# ⚡ 快速开始

通过三个简单步骤即可启动 PySpur。

1. **克隆代码库：**
    ```sh
    git clone https://github.com/PySpur-com/PySpur.git
    cd pyspur
    ```

2. **启动 Docker 服务：**

    ```sudo docker compose up --build -d```

    这将启动一个本地 PySpur 实例，使用本地 SQLite 文件存储 Spurs 和其运行数据。

3. **访问门户：**

    在浏览器中访问 `http://localhost:6080/`。

    输入 `pyspur`/`canaryhattan` 作为用户名/密码。

# PySpur - Interfaz Gráfica para Visualizar Rutas de Razonamiento de LLM


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

# 🕸️ ¿Por qué PySpur?

* Los humanos piensan más tiempo sobre problemas difíciles para mejorar sus decisiones.
* De manera similar, podemos permitir que los LLM piensen más tiempo mediante gráficos computacionales que incluyen múltiples pasos y bucles de retroalimentación.
* Sin embargo, tales gráficos implican interdependencias intrincadas entre nodos, donde la salida de un nodo se convierte en la entrada de otro.
* **El objetivo de PySpur es permitir que los desarrolladores construyan, prueben y desplieguen tales gráficos de LLM al abstraer la complejidad de la ejecución en paralelo y la gestión del estado.**

# ✨ Beneficios principales

1. **Desarrolla con Nodos de Cómputo en Tiempo de Inferencia (ITC)**:
    * **Planificadores de alto nivel y todo incluido** (MCTS, Auto-Refinamiento, BoN, ToT, etc.)
    * **Primitivas de bajo nivel para muestreo paralelo/secuencial** (ciclos, enrutadores, bifurcadores, agregadores)
    * **Verificadores** (Nodos de código, LLM como juez, integraciones de software, etc.)
2. **Depura con Evals**:
    * **Benchmarks de razonamiento comunes** (GSM8k, MATH, ARC, etc.)
    * **Evaluadores** a través de LLM como juez
    * **Datasets personalizados** mediante CSV, JSONL, HF Datasets
3. **Despliega para Inferencias por Lotes a través de Job Queue**:
    * **Envía/administra trabajos por lotes mediante una interfaz gráfica** para facilidad de uso
    * **Autoalojamiento de APIs asincrónicas por lotes** para máxima flexibilidad
    * **Tolerancia a fallos y persistencia de trabajos** para trabajos de larga duración

# 🗺️ Hoja de ruta

- [X] Lienzo
- [X] Nodos ITC
- [X] Ejecución Asíncrona/por Lotes
- [ ] Plantillas
- [ ] Compilar Spurs a Código
- [ ] Monitoreo de Nodos ITC
- [ ] Nuevos Nodos
    - [ ] Herramientas
    - [ ] Bucles
    - [ ] Condicionales
- [ ] Evals
- [ ] Multimodal
- [ ] API de Spur
- [ ] Contenerización de Verificadores de Código
- [ ] Tabla de Clasificación
- [ ] Generar Spurs mediante IA

Tu retroalimentación será enormemente apreciada.
Por favor, [cuéntanos](mailto:founders@pyspur.dev?subject=Feature%20Request&body=I%20want%20this%20feature%3Ai) qué características de esa lista te gustaría ver a continuación o solicita otras completamente nuevas.

# ⚡ Inicio rápido

Puedes configurar PySpur en tres pasos rápidos.

1. **Clona el repositorio:**
    ```sh
    git clone https://github.com/PySpur-com/PySpur.git
    cd pyspur
    ```

2. **Inicia los servicios Docker:**

    ```sudo docker compose up --build -d```

    Esto iniciará una instancia local de PySpur que almacenará los Spurs y sus ejecuciones en un archivo SQLite local.

3. **Accede al portal:**

    Ve a `http://localhost:6080/` en tu navegador.

    Ingresa `pyspur`/`canaryhattan` como nombre de usuario/contraseña.

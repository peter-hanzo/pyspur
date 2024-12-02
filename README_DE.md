# PySpur - GUI zur Visualisierung von LLM Denkpfaden

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

# 🕸️ Warum PySpur?

* Menschen denken bei schwierigen Problemen länger nach, um bessere Entscheidungen zu treffen.
* Ebenso können wir LLMs dazu befähigen, länger nachzudenken, indem wir rechnerische Graphen verwenden, die mehrere Schritte und Rückkopplungsschleifen umfassen.
* Solche Graphen beinhalten jedoch komplexe Abhängigkeiten zwischen Knoten, bei denen die Ausgabe eines Knotens zur Eingabe eines anderen wird.
* **Das Ziel von PySpur ist es, Entwicklern zu ermöglichen, solche LLM-Graphen zu erstellen, zu testen und bereitzustellen, indem die Komplexität von paralleler Ausführung und Zustandsmanagement abstrahiert wird.**

# ✨ Zentrale Vorteile

1. **Entwicklung mit Compute-Nodes zur Laufzeit:**
    * **Hochrangige, integrierte Planer** (MCTS, Self-Refinement, BoN, ToT, etc.)
    * **Niedrigstufige Primitive für paralleles/sequenzielles Sampling** (Schleifen, Router, Verzweiger, Aggregatoren)
    * **Verifizierer** (Code-Nodes, LLM-als-Richter, Software-Integrationen, etc.)
2. **Debugging mit Evaluierungen:**
    * **Gemeinsame Benchmarks für logisches Denken** (GSM8k, MATH, ARC, etc.)
    * **Bewertungen** via LLM-als-Richter
    * **Benutzerdefinierte Datensätze** via CSV, JSONL, HF Datasets
3. **Bereitstellung für Batch-Inferenz über Job-Queue:**
    * **Einreichung/Verwaltung von Batch-Jobs über die Benutzeroberfläche** für einfache Nutzung
    * **Selbsthosting von asynchronen Batch-APIs** für volle Flexibilität
    * **Fehlertoleranz und Job-Persistenz** für langlaufende Jobs

# 🗺️ Roadmap

- [X] Canvas
- [X] ITC-Nodes
- [X] Asynchrone/Batch-Ausführung
- [ ] Vorlagen
- [ ] Übersetzung von Spurs in Code
- [ ] ITC-Node-Monitoring
- [ ] Neue Nodes
    - [ ] Tools
    - [ ] Schleifen
    - [ ] Bedingungen
- [ ] Evaluierungen
- [ ] Multimodal
- [ ] Spur-API
- [ ] Containerisierung von Code-Verifizierern
- [ ] Bestenliste
- [ ] Automatische Generierung von Spurs durch KI

Ihr Feedback ist uns sehr wichtig. Bitte [teilen Sie uns mit](mailto:founders@pyspur.dev?subject=Feature%20Request&body=I%20want%20this%20feature%3Ai), welche Funktionen auf dieser Liste Sie als nächstes sehen möchten, oder schlagen Sie völlig neue vor.

# ⚡ Schnellstart

PySpur kann in drei einfachen Schritten eingerichtet werden.

1. **Klonen Sie das Repository:**
    ```sh
    git clone https://github.com/PySpur-com/PySpur.git
    cd pyspur
    ```

2. **Starten Sie die Docker-Services:**

    ```sudo docker compose up --build -d```

    Dadurch wird eine lokale Instanz von PySpur gestartet, die Spurs und deren Ausführungen in einer lokalen SQLite-Datei speichert.

3. **Zugriff auf das Portal:**

    Öffnen Sie `http://localhost:6080/` in Ihrem Browser.

    Geben Sie `pyspur`/`canaryhattan` als Benutzername/Passwort ein.

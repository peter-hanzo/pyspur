![PySpur](./docs/images/hero.png)

<p align="center"><strong>PySpur ist eine graphische Benutzeroberfläche zur Visualisierung von KI-Agenten in Python. KI-Entwickler nutzen sie, um Agenten zu erstellen, sie schrittweise auszuführen und vergangene Abläufe zu analysieren.</strong></p>

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

# 🕸️ Warum PySpur?

- 🖐️ **Drag-and-Drop**: Erstellen, Testen und in Sekundenschnelle iterieren.
- 🔄 **Schleifen**: Iterierte Tool-Aufrufe mit Zwischenspeicherung.
- 📤 **Datei-Upload**: Dateien hochladen oder URLs einfügen, um Dokumente zu verarbeiten.
- 📋 **Strukturierte Ausgaben**: UI-Editor für JSON-Schemata.
- 🗃️ **RAG**: Daten parsen, aufteilen, einbetten und in eine Vektor-Datenbank einfügen.
- 🖼️ **Multimodal**: Unterstützung für Video, Bilder, Audio, Texte, Code.
- 🧰 **Tools**: Slack, Firecrawl.dev, Google Sheets, GitHub und mehr.
- 🧪 **Evals**: Agenten anhand realer Datensätze bewerten.
- 🚀 **One-Click-Deploy**: Als API veröffentlichen und überall integrieren.
- 🐍 **Python-basiert**: Neue Knoten durch das Erstellen einer einzelnen Python-Datei hinzufügen.
- 🎛️ **Anbieterübergreifende Unterstützung**: Über 100 LLM-Anbieter, Embedders und Vektor-Datenbanken.

# ⚡ Schnellstart

## Option A: Verwendung des Python-Pakets `pyspur`

Dies ist der schnellste Weg, um loszulegen. Python 3.12 oder höher wird benötigt.

1. **PySpur installieren:**
    ```sh
    pip install pyspur
    ```

2. **Ein neues Projekt initialisieren:**
    ```sh
    pyspur init my-project
    cd my-project
    ```
    Dies erstellt ein neues Verzeichnis mit einer `.env`-Datei.

3. **Server starten:**
    ```sh
    pyspur serve --sqlite
    ```
    Standardmäßig startet dies die PySpur-Anwendung unter `http://localhost:6080` mit einer SQLite-Datenbank.
    Wir empfehlen, in der `.env`-Datei eine PostgreSQL-Instanz-URL zu konfigurieren, um ein stabileres Erlebnis zu gewährleisten.

4. **[Optional] Deployment anpassen:**
    Du kannst deine PySpur-Bereitstellung auf zwei Arten anpassen:

    a. **Über die App (Empfohlen):**
       - Navigiere im App-Menü zum API-Keys-Tab.
       - Füge deine API-Schlüssel für verschiedene Anbieter (OpenAI, Anthropic, etc.) hinzu.
       - Die Änderungen werden sofort wirksam.

    b. **Manuelle Konfiguration:**
       - Bearbeite die `.env`-Datei in deinem Projektverzeichnis.
       - Es wird empfohlen, in der `.env`-Datei eine PostgreSQL-Datenbank zu konfigurieren, um mehr Zuverlässigkeit zu gewährleisten.
       - Starte die Anwendung mit `pyspur serve` neu. Füge `--sqlite` hinzu, falls du nicht PostgreSQL verwendest.

## Option B: Verwendung von Docker (Empfohlen für skalierbare, produktive Systeme)

Dies ist der empfohlene Weg für produktive Bereitstellungen:

1. **Docker installieren:**
    Installiere Docker, indem du der offiziellen Installationsanleitung für dein Betriebssystem folgst:
    - [Docker für Linux](https://docs.docker.com/engine/install/)
    - [Docker Desktop für Mac](https://docs.docker.com/desktop/install/mac-install/)

2. **Ein PySpur-Projekt erstellen:**
    Sobald Docker installiert ist, erstelle ein neues PySpur-Projekt mit:
    ```sh
    curl -fsSL https://raw.githubusercontent.com/PySpur-com/pyspur/main/start_pyspur_docker.sh | bash -s pyspur-project
    ```
    Dies wird:
    - Ein neues PySpur-Projekt in einem Verzeichnis namens `pyspur-project` starten.
    - Notwendige Konfigurationsdateien einrichten.
    - Die PySpur-Anwendung automatisch starten, unterstützt von einer lokalen PostgreSQL-Docker-Instanz.

3. **Auf PySpur zugreifen:**
    Rufe in deinem Browser `http://localhost:6080` auf.

4. **[Optional] Deployment anpassen:**
    Du kannst deine PySpur-Bereitstellung auf zwei Arten anpassen:

    a. **Über die App (Empfohlen):**
       - Navigiere im App-Menü zum API-Keys-Tab.
       - Füge deine API-Schlüssel für verschiedene Anbieter (OpenAI, Anthropic, etc.) hinzu.
       - Die Änderungen werden sofort wirksam.

    b. **Manuelle Konfiguration:**
       - Bearbeite die `.env`-Datei in deinem Projektverzeichnis.
       - Starte die Dienste mit:
         ```sh
         docker compose up -d
         ```

Das war's! Klicke auf „New Spur“, um einen Workflow zu erstellen, oder starte mit einer der Standardvorlagen.

# ✨ Kernvorteile

## Debuggen auf Knotenebene:

https://github.com/user-attachments/assets/6e82ad25-2a46-4c50-b030-415ea9994690

## Multimodal (Dateien hochladen oder URLs einfügen)

PDFs, Videos, Audio, Bilder, ...

https://github.com/user-attachments/assets/83ed9a22-1ec1-4d86-9dd6-5d945588fd0b

## Schleifen

<img width="1919" alt="Schleifen" src="https://github.com/user-attachments/assets/3aea63dc-f46f-46e9-bddd-e2af9c2a56bf" />

## RAG

### Schritt 1) Dokumentensammlung erstellen (Aufteilen + Parsen)

https://github.com/user-attachments/assets/c77723b1-c076-4a64-a01d-6d6677e9c60e

### Schritt 2) Vektorindex erstellen (Einbettung + Upsert in Vektor-Datenbank)

https://github.com/user-attachments/assets/50e5c711-dd01-4d92-bb23-181a1c5bba25

## Modulare Bausteine

https://github.com/user-attachments/assets/6442f0ad-86d8-43d9-aa70-e5c01e55e876

## Endgültige Leistung bewerten

https://github.com/user-attachments/assets/4dc2abc3-c6e6-4d6d-a5c3-787d518de7ae

## Bald verfügbar: Selbstverbesserung

https://github.com/user-attachments/assets/5bef7a16-ef9f-4650-b385-4ea70fa54c8a

# 🛠️ PySpur Entwicklungsumgebung
#### [ Anweisungen zur Entwicklung auf Unix-ähnlichen Systemen. Entwicklung auf Windows/PC wird nicht unterstützt ]

Für die Entwicklung folge diesen Schritten:

1. **Repository klonen:**
    ```sh
    git clone https://github.com/PySpur-com/pyspur.git
    cd pyspur
    ```

2. **Mit docker-compose.dev.yml starten:**
    ```sh
    docker compose -f docker-compose.dev.yml up --build -d
    ```
    Dies startet eine lokale Instanz von PySpur mit aktiviertem Hot-Reloading für die Entwicklung.

3. **Umgebung anpassen:**
    Bearbeite die `.env`-Datei, um deine Umgebung zu konfigurieren. Standardmäßig verwendet PySpur eine lokale PostgreSQL-Datenbank. Um eine externe Datenbank zu nutzen, passe die `POSTGRES_*`-Variablen in der `.env` an.

# ⭐ Unterstütze uns

Du kannst uns bei unserer Arbeit unterstützen, indem du uns einen Stern hinterlässt! Vielen Dank!

![star](https://github.com/user-attachments/assets/71f65273-6755-469d-be44-087bb89d5e76)

Dein Feedback wird sehr geschätzt.
Bitte [teile uns mit](mailto:founders@pyspur.dev?subject=Feature%20Request&body=I%20want%20this%20feature%3Ai), welche Funktionen in dieser Liste du als Nächstes sehen möchtest oder schlage ganz neue vor.

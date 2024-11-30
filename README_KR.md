# PySpur - LLM 추론 경로 시각화를 위한 GUI

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

# 🕸️ PySpur가 필요한 이유는?

* 인간은 어려운 문제에 대해 더 나은 결정을 내리기 위해 더 오래 사고합니다.
* 마찬가지로, LLM이 여러 단계와 피드백 루프를 포함하는 계산 그래프를 통해 더 오래 사고하도록 할 수 있습니다.
* 그러나 이러한 그래프는 노드 간의 복잡한 상호 의존성을 포함하며, 한 노드의 출력이 다른 노드의 입력이 됩니다.
* **PySpur의 목표는 병렬 실행과 상태 관리를 추상화하여 개발자가 이러한 LLM 그래프를 구축, 테스트 및 배포할 수 있도록 하는 것입니다.**

# ✨ 주요 혜택

1. **추론 시간 계산 노드로 개발하기**:
    * **고급 기능이 포함된 플래너** (MCTS, Self-Refinement, BoN, ToT 등)
    * **병렬/순차 샘플링을 위한 저수준 프리미티브** (사이클, 라우터, 분기기, 집계기)
    * **검증자** (코드 노드, LLM-as-a-judge, 소프트웨어 통합 등)
2. **평가로 디버그하기**:
    * **일반적인 추론 벤치마크** (GSM8k, MATH, ARC 등)
    * **LLM-as-a-judge를 통한 평가 도구**
    * **CSV, JSONL, HF 데이터셋을 통한 사용자 정의 데이터셋**
3. **배치 추론을 위한 배포**:
    * **UI를 통해 배치 작업 제출/관리**로 사용 용이성 제공
    * **비동기 배치 API를 자체 호스팅**하여 완전한 유연성 제공
    * **장기 실행 작업을 위한 내결함성과 작업 지속성** 제공

# 🗺️ 로드맵

- [X] 캔버스
- [X] ITC 노드
- [X] 비동기/배치 실행
- [ ] 템플릿
- [ ] Spurs를 코드로 컴파일
- [ ] ITC 노드 모니터링
- [ ] 신규 노드
    - [ ] 도구
    - [ ] 루프
    - [ ] 조건문
- [ ] 평가
- [ ] 멀티모달
- [ ] Spur API
- [ ] 코드 검증자의 컨테이너화
- [ ] 리더보드
- [ ] AI를 통한 Spurs 생성

여러분의 피드백은 매우 소중합니다.
[이메일](mailto:founders@pyspur.dev?subject=Feature%20Request&body=I%20want%20this%20feature%3Ai)로 어떤 기능을 먼저 보고 싶은지 또는 새로운 기능 요청을 알려주세요.

# ⚡ 빠른 시작

PySpur를 세 단계만으로 실행할 수 있습니다.

1. **저장소 클론:**
    ```sh
    git clone https://github.com/PySpur-com/PySpur.git
    cd pyspur
    ```

2. **도커 서비스 시작:**

    ```sudo docker compose up --build -d```

    이는 PySpur의 로컬 인스턴스를 시작하며, Spurs와 실행 기록을 로컬 SQLite 파일에 저장합니다.

3. **포털에 접속:**

    브라우저에서 `http://localhost:6080/`로 이동하세요.

    사용자 이름/비밀번호로 `pyspur`/`canaryhattan`을 입력하세요.

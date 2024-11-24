# PySpur - 推論時計算用IDE

<p align="center">
  <a href="./README.md"><img alt="README in English" src="https://img.shields.io/badge/English-blue"></a>
  <a href="./README_CN.md"><img alt="简体中文版自述文件" src="https://img.shields.io/badge/简体中文-blue"></a>
  <a href="./README_JA.md"><img alt="日本語のREADME" src="https://img.shields.io/badge/日本語-blue"></a>
  <a href="./README_KR.md"><img alt="README in Korean" src="https://img.shields.io/badge/한국어-blue"></a>
</p>

PySpurは、推論時の計算パイプラインを開発、デバッグ、展開するためのIDEです。

https://github.com/user-attachments/assets/19cf6f99-6d66-45dc-911c-74025f87b1d2

# 🕸️ PySpurの特徴

* 人間は難しい問題について考える時間を長くすることで意思決定を改善します。
* 同様に、LLM（大規模言語モデル）も、複数のステップやフィードバックループを含む計算グラフを用いることで、より長く考えることが可能です。
* しかし、このようなグラフはノード間の複雑な依存関係を伴い、一部のノードの出力が他のノードの入力になります。
* **PySpurの目的は、並列実行や状態管理の複雑さを抽象化し、開発者がこのようなLLMグラフを構築、テスト、展開できるようにすることです。**

# ✨ 主な利点

1. **推論時計算ノードでの開発**:
    * **高レベルのバッテリー内蔵プランナー**（MCTS、自己改善、BoN、ToTなど）
    * **並列/逐次サンプリングのための低レベルプリミティブ**（サイクル、ルーター、ブランチャー、アグリゲーター）
    * **検証ツール**（コードノード、LLMを用いた判定、ソフトウェア統合など）
2. **評価でのデバッグ**:
    * **一般的な推論ベンチマーク**（GSM8k、MATH、ARCなど）
    * **スコアラー**（LLMを用いた判定）
    * **カスタムデータセット**（CSV、JSONL、HF Datasets）
3. **バッチ推論のための展開**:
    * **UIを使用したバッチジョブの提出/管理**で使いやすさを向上
    * **非同期バッチAPIのセルフホスティング**で完全な柔軟性を提供
    * **長時間実行ジョブのためのフォールトトレランスとジョブ永続性**

# 🗺️ ロードマップ

- [X] キャンバス
- [X] 推論時計算ノード
- [X] 非同期/バッチ実行
- [ ] テンプレート
- [ ] Spursをコードにコンパイル
- [ ] 推論時計算ノードのモニタリング
- [ ] 新しいノード
    - [ ] ツール
    - [ ] ループ
    - [ ] 条件分岐
- [ ] 評価
- [ ] マルチモーダル
- [ ] Spur API
- [ ] コード検証ツールのコンテナ化
- [ ] リーダーボード
- [ ] AIを用いたSpursの生成

皆さんのフィードバックをお待ちしています。
ぜひ、[こちら](mailto:founders@pyspur.dev?subject=Feature%20Request&body=I%20want%20this%20feature%3Ai)から、次に実装してほしい機能を教えてください。また、新しい機能のリクエストも歓迎です。

# ⚡ クイックスタート

PySpurを3つの簡単なステップでセットアップできます。

1. **リポジトリをクローンする:**
    ```sh
    git clone https://github.com/PySpur-com/PySpur.git
    cd pyspur
    ```

2. **Dockerサービスを起動する:**

    ```sh
    sudo docker compose up --build -d
    ```

    これにより、ローカルのSQLiteファイルにSpursとその実行データを保存するPySpurのローカルインスタンスが起動します。

3. **ポータルにアクセスする:**

    ブラウザで `http://localhost:6080/` にアクセスしてください。

    ユーザー名/パスワードとして `pyspur`/`canaryhattan` を入力してください。

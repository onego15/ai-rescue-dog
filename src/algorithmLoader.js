// MDファイルからアルゴリズムを読み込むローダー

export class AlgorithmLoader {
    constructor() {
        this.algorithms = {};
    }

    /**
     * MDファイルを読み込んでJavaScriptコードブロックを抽出
     */
    async loadFromMarkdown(filepath) {
        try {
            const response = await fetch(filepath);
            const markdown = await response.text();

            // コードブロックを抽出
            const codeBlocks = this.extractCodeBlocks(markdown);

            // 各関数を評価して保存
            codeBlocks.forEach(code => {
                this.evaluateCode(code);
            });

            console.log('✅ アルゴリズムをロードしました:', filepath);
            console.log('📦 利用可能な関数:', Object.keys(this.algorithms));

            return this.algorithms;
        } catch (error) {
            console.error('❌ アルゴリズムの読み込みに失敗:', error);
            throw error;
        }
    }

    /**
     * Markdownテキストからコードブロック（```javascript）を抽出
     */
    extractCodeBlocks(markdown) {
        const codeBlockRegex = /```javascript\n([\s\S]*?)```/g;
        const blocks = [];
        let match;

        while ((match = codeBlockRegex.exec(markdown)) !== null) {
            blocks.push(match[1]);
        }

        return blocks;
    }

    /**
     * コードを評価して関数を抽出
     */
    evaluateCode(code) {
        try {
            // 関数定義を抽出
            const functionRegex = /function\s+(\w+)\s*\([^)]*\)\s*{/g;
            let match;

            while ((match = functionRegex.exec(code)) !== null) {
                const functionName = match[1];

                // グローバルスコープで関数を評価
                // eslint-disable-next-line no-eval
                eval(code);

                // 関数をアルゴリズムオブジェクトに保存
                // eslint-disable-next-line no-eval
                this.algorithms[functionName] = eval(functionName);
            }
        } catch (error) {
            console.error('コードの評価エラー:', error);
        }
    }

    /**
     * アルゴリズム関数を取得
     */
    getAlgorithm(name) {
        return this.algorithms[name];
    }

    /**
     * すべてのアルゴリズムを取得
     */
    getAllAlgorithms() {
        return this.algorithms;
    }
}

// OpenAI APIクライアント

export class OpenAIClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.apiEndpoint = 'https://api.openai.com/v1/chat/completions';
        this.model = 'gpt-4';
    }

    /**
     * エージェントの次の行動を決定
     * @param {Object} sensorData - センサーデータ
     * @returns {Promise<string>} - アクション (MOVE_FORWARD, TURN_LEFT, TURN_RIGHT, STOP)
     */
    async getNextAction(sensorData) {
        const prompt = this.buildPrompt(sensorData);

        try {
            const response = await fetch(this.apiEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        {
                            role: 'system',
                            content: this.getSystemPrompt()
                        },
                        {
                            role: 'user',
                            content: prompt
                        }
                    ],
                    temperature: 0.7,
                    max_tokens: 100
                })
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();
            const content = data.choices[0].message.content.trim();

            // JSONレスポンスをパース
            const actionData = JSON.parse(content);
            return actionData.action;

        } catch (error) {
            console.error('OpenAI API Error:', error);
            // フォールバック: ランダムなアクション
            return this.getFallbackAction(sensorData);
        }
    }

    buildPrompt(sensorData) {
        return JSON.stringify({
            agent_state: {
                position: sensorData.agentPos,
                direction: sensorData.agentDirection
            },
            sensor_data: {
                obstacles: sensorData.obstacles,
                target_direction: sensorData.targetDirection,
                target_distance: sensorData.targetDistance,
                enemies: sensorData.enemies
            }
        }, null, 2);
    }

    getSystemPrompt() {
        return `あなたは3D迷路内のレスキューエージェント（犬型ロボット）のAIです。
目標は、敵を回避しながら救助対象（HELP）に到達することです。

実行可能なアクション:
- MOVE_FORWARD: 前方に1マス移動
- TURN_LEFT: 左に90度回転
- TURN_RIGHT: 右に90度回転
- STOP: 停止（ターゲット到達時のみ）

センサー情報に基づいて最適な行動を選択してください。
敵に接触すると敗北します。壁には進めません。

レスポンス形式:
{
  "action": "MOVE_FORWARD" // または TURN_LEFT, TURN_RIGHT, STOP
}`;
    }

    getFallbackAction(sensorData) {
        // APIエラー時のフォールバック: 基本的なロジック
        const { obstacles, enemies } = sensorData;

        // 前方に敵がいる場合は回転
        if (enemies.some(e => e.distance <= 2 && e.direction === 'front')) {
            return Math.random() < 0.5 ? 'TURN_LEFT' : 'TURN_RIGHT';
        }

        // 前方に壁がある場合は回転
        if (obstacles.front) {
            return Math.random() < 0.5 ? 'TURN_LEFT' : 'TURN_RIGHT';
        }

        // それ以外は前進
        return 'MOVE_FORWARD';
    }
}

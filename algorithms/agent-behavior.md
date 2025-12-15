# エージェント行動アルゴリズム

## 概要

このアルゴリズムは、自律型レスキューエージェントの行動を制御します。
エージェントは環境を認識し、最適な経路を計画し、目標に向かって移動します。

## パラメータ

- **センサー範囲**: 8マス（マンハッタン距離）
- **移動速度**: 0.05
- **リプランニング確率**: 10%（移動中に経路を再計算する確率）

## アルゴリズム

### 1. 環境認識

```javascript
function detectTarget(agentPos, targetPos, sensorRange) {
    const distance = Math.abs(agentPos.x - targetPos.x) +
                    Math.abs(agentPos.y - targetPos.y);
    return distance <= sensorRange;
}
```

### 2. 意思決定ロジック

```javascript
function decide(agent, targetPos) {
    // 初回または経路がない場合、ターゲットへの経路を計画
    if (agent.path.length === 0 && !agent.isMoving) {
        if (detectTarget(agent.gridPos, targetPos, agent.sensorRange)) {
            // センサー範囲内にターゲットがある場合
            return { action: 'planPath', reason: 'ターゲットを検出' };
        } else {
            // センサー範囲外の場合も経路を計画（簡易版）
            // より高度な実装では、探索行動を追加可能
            return { action: 'planPath', reason: '初期経路計画' };
        }
    }

    // 経路に沿って移動
    if (agent.path.length > 0 && !agent.isMoving) {
        return { action: 'startMove', reason: '次のステップへ移動' };
    }

    return { action: 'continue', reason: '移動継続中' };
}
```

### 3. 移動制御

```javascript
function move(agent, deltaTime) {
    if (!agent.isMoving || !agent.targetWorldPos) {
        return false;
    }

    // 方向ベクトルを計算
    const direction = {
        x: agent.targetWorldPos.x - agent.model.position.x,
        y: agent.targetWorldPos.y - agent.model.position.y,
        z: agent.targetWorldPos.z - agent.model.position.z
    };

    // 正規化
    const length = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    if (length > 0) {
        direction.x /= length;
        direction.y /= length;
        direction.z /= length;
    }

    // 移動
    agent.model.position.x += direction.x * agent.moveSpeed;
    agent.model.position.y += direction.y * agent.moveSpeed;
    agent.model.position.z += direction.z * agent.moveSpeed;

    // 回転
    const angle = Math.atan2(direction.x, direction.z);
    agent.model.rotation.y = angle;

    // 到達判定
    const distToTarget = Math.sqrt(
        (agent.model.position.x - agent.targetWorldPos.x) ** 2 +
        (agent.model.position.y - agent.targetWorldPos.y) ** 2 +
        (agent.model.position.z - agent.targetWorldPos.z) ** 2
    );

    return distToTarget < 0.1;
}
```

### 4. リプランニング

```javascript
function shouldReplan(agent, targetPos) {
    // 経路が空になった、または10%の確率で再計画
    return agent.path.length === 0 || Math.random() < 0.1;
}
```

## 使用例

```javascript
// エージェントの更新ループ内で
const decision = decide(agent, targetPos);

switch (decision.action) {
    case 'planPath':
        agent.planPath(targetPos);
        break;
    case 'startMove':
        const nextPos = agent.path[0];
        agent.targetWorldPos = new THREE.Vector3(nextPos.x * 2, 0.5, nextPos.y * 2);
        agent.isMoving = true;
        break;
    case 'continue':
        const reached = move(agent, deltaTime);
        if (reached) {
            agent.model.position.copy(agent.targetWorldPos);
            agent.gridPos = agent.path.shift();
            agent.isMoving = false;
            agent.targetWorldPos = null;

            if (shouldReplan(agent, targetPos)) {
                agent.planPath(targetPos);
            }
        }
        break;
}
```

## 将来の拡張案

1. **探索モード**: センサー範囲外のターゲットを探すための探索行動
2. **障害物回避**: 動的な障害物を検出して回避
3. **複数ターゲット**: 複数の救助対象に優先順位を付けて対処
4. **学習機能**: 過去の経験から最適な経路を学習

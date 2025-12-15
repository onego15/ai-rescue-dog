import * as THREE from 'three';

export class TurnBasedAgent {
    constructor(maze, startPos) {
        this.maze = maze;
        this.gridPos = { x: startPos.x, y: startPos.y };
        this.direction = 0; // 0:North, 1:East, 2:South, 3:West
        this.sensorRange = 3; // センサー範囲（マス数）

        this.createModel();
        this.updateWorldPosition();
    }

    createModel() {
        // 犬型ロボットの簡易モデル
        this.model = new THREE.Group();

        // 胴体
        const bodyGeometry = new THREE.BoxGeometry(0.8, 0.5, 1.2);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xcccccc });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.5;
        this.model.add(body);

        // 頭
        const headGeometry = new THREE.BoxGeometry(0.5, 0.5, 0.6);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.set(0, 0.65, 0.7);
        this.model.add(head);

        // 目（青いライト）
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x00aaff });
        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.15, 0.7, 1.0);
        this.model.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.15, 0.7, 1.0);
        this.model.add(rightEye);

        // 脚
        const legGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.5);
        const legMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
        const legPositions = [
            [-0.3, 0.25, 0.4],
            [0.3, 0.25, 0.4],
            [-0.3, 0.25, -0.4],
            [0.3, 0.25, -0.4]
        ];

        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeometry, legMaterial);
            leg.position.set(pos[0], pos[1], pos[2]);
            this.model.add(leg);
        });

        // センサーの視覚化（緑の円錐形）
        this.createSensorVisuals();
    }

    createSensorVisuals() {
        this.sensors = new THREE.Group();

        const coneGeometry = new THREE.ConeGeometry(1.5, 3, 8);
        const coneMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3
        });

        const leftCone = new THREE.Mesh(coneGeometry, coneMaterial);
        leftCone.position.set(-0.5, 0.5, 1.5);
        leftCone.rotation.x = Math.PI / 2;
        leftCone.rotation.z = -Math.PI / 6;
        this.sensors.add(leftCone);

        const rightCone = new THREE.Mesh(coneGeometry, coneMaterial);
        rightCone.position.set(0.5, 0.5, 1.5);
        rightCone.rotation.x = Math.PI / 2;
        rightCone.rotation.z = Math.PI / 6;
        this.sensors.add(rightCone);

        this.model.add(this.sensors);
    }

    updateWorldPosition() {
        this.model.position.set(this.gridPos.x * 2, 0, this.gridPos.y * 2);

        // 向きに応じて回転
        const rotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        this.model.rotation.y = rotations[this.direction];
    }

    /**
     * アクションを実行
     * @param {string} action - MOVE_FORWARD, TURN_LEFT, TURN_RIGHT, STOP
     * @returns {boolean} - アクションが成功したか
     */
    executeAction(action) {
        switch (action) {
            case 'MOVE_FORWARD':
                return this.moveForward();
            case 'TURN_LEFT':
                this.turnLeft();
                return true;
            case 'TURN_RIGHT':
                this.turnRight();
                return true;
            case 'STOP':
                return true;
            default:
                console.warn('Unknown action:', action);
                return false;
        }
    }

    moveForward() {
        const nextPos = this.getForwardPosition();

        // 移動可能かチェック
        if (this.maze.isWalkable(nextPos.x, nextPos.y)) {
            this.gridPos = nextPos;
            this.updateWorldPosition();
            return true;
        }

        return false; // 壁にぶつかった
    }

    turnLeft() {
        this.direction = (this.direction - 1 + 4) % 4;
        this.updateWorldPosition();
    }

    turnRight() {
        this.direction = (this.direction + 1) % 4;
        this.updateWorldPosition();
    }

    getForwardPosition() {
        const directions = [
            { dx: 0, dy: -1 },  // North
            { dx: 1, dy: 0 },   // East
            { dx: 0, dy: 1 },   // South
            { dx: -1, dy: 0 }   // West
        ];

        const dir = directions[this.direction];
        return {
            x: this.gridPos.x + dir.dx,
            y: this.gridPos.y + dir.dy
        };
    }

    getDirectionName() {
        const names = ['North', 'East', 'South', 'West'];
        return names[this.direction];
    }

    /**
     * センサーデータを収集
     * @param {Object} targetPos - ターゲット位置
     * @param {Array} enemies - 敵の配列
     * @returns {Object} - センサーデータ
     */
    getSensorData(targetPos, enemies) {
        return {
            agentPos: { ...this.gridPos },
            agentDirection: this.getDirectionName(),
            obstacles: this.detectObstacles(),
            targetDirection: this.getTargetDirection(targetPos),
            targetDistance: this.getDistance(this.gridPos, targetPos),
            enemies: this.detectEnemies(enemies)
        };
    }

    detectObstacles() {
        const obstacles = {
            front: false,
            left: false,
            right: false,
            frontLeft: false,
            frontRight: false
        };

        // 前方
        const front = this.getForwardPosition();
        obstacles.front = !this.maze.isWalkable(front.x, front.y);

        // 左右の障害物検出（簡易版）
        const leftDir = (this.direction - 1 + 4) % 4;
        const rightDir = (this.direction + 1) % 4;

        const directions = [
            { dx: 0, dy: -1 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }
        ];

        const leftPos = {
            x: this.gridPos.x + directions[leftDir].dx,
            y: this.gridPos.y + directions[leftDir].dy
        };
        obstacles.left = !this.maze.isWalkable(leftPos.x, leftPos.y);

        const rightPos = {
            x: this.gridPos.x + directions[rightDir].dx,
            y: this.gridPos.y + directions[rightDir].dy
        };
        obstacles.right = !this.maze.isWalkable(rightPos.x, rightPos.y);

        return obstacles;
    }

    getTargetDirection(targetPos) {
        const dx = targetPos.x - this.gridPos.x;
        const dy = targetPos.y - this.gridPos.y;

        let direction = '';

        if (dy < 0) direction += 'North';
        if (dy > 0) direction += 'South';
        if (dx < 0) direction += 'West';
        if (dx > 0) direction += 'East';

        return direction || 'Here';
    }

    detectEnemies(enemies) {
        const detectedEnemies = [];

        for (const enemy of enemies) {
            const enemyPos = enemy.getPosition();
            const distance = this.getDistance(this.gridPos, enemyPos);

            if (distance <= this.sensorRange) {
                detectedEnemies.push({
                    position: enemyPos,
                    distance: distance,
                    direction: this.getRelativeDirection(enemyPos)
                });
            }
        }

        return detectedEnemies;
    }

    getRelativeDirection(targetPos) {
        const dx = targetPos.x - this.gridPos.x;
        const dy = targetPos.y - this.gridPos.y;

        // 現在の向きに対する相対方向を計算
        const directions = ['front', 'right', 'back', 'left'];

        // 絶対方向を計算
        let absoluteDir = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
            absoluteDir = dx > 0 ? 1 : 3; // East or West
        } else {
            absoluteDir = dy > 0 ? 2 : 0; // South or North
        }

        // 相対方向に変換
        const relativeDir = (absoluteDir - this.direction + 4) % 4;
        return directions[relativeDir];
    }

    getDistance(pos1, pos2) {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }

    getPosition() {
        return { ...this.gridPos };
    }
}

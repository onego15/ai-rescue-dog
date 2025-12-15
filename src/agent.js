import * as THREE from 'three';
import { PathFinder } from './pathfinding.js';

export class Agent {
    constructor(maze, startPos) {
        this.maze = maze;
        this.gridPos = { x: startPos.x, y: startPos.y };
        this.worldPos = new THREE.Vector3(startPos.x * 2, 0.5, startPos.y * 2);
        this.targetPos = null;
        this.path = [];
        this.pathFinder = new PathFinder(maze);
        this.sensorRange = 8; // センサーの範囲
        this.moveSpeed = 0.05;
        this.isMoving = false;
        this.targetWorldPos = null;

        this.createModel();
        this.createSensorVisuals();
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

        this.model.position.copy(this.worldPos);
    }

    createSensorVisuals() {
        // センサーの視覚化（緑の円錐形）
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

    detectTarget(targetPos) {
        // センサー範囲内にターゲットがあるかチェック
        const distance = Math.abs(this.gridPos.x - targetPos.x) +
                        Math.abs(this.gridPos.y - targetPos.y);
        return distance <= this.sensorRange;
    }

    planPath(targetPos) {
        // 経路を計画
        this.path = this.pathFinder.findPath(this.gridPos, targetPos);
        if (this.path.length > 1) {
            this.path.shift(); // 現在位置を除去
        }
    }

    update(targetPos) {
        // ターゲットを検出したら経路を計画
        if (this.detectTarget(targetPos) && this.path.length === 0) {
            this.planPath(targetPos);
        }

        // 経路に沿って移動
        if (this.path.length > 0 && !this.isMoving) {
            const nextPos = this.path[0];
            this.targetWorldPos = new THREE.Vector3(nextPos.x * 2, 0.5, nextPos.y * 2);
            this.isMoving = true;
        }

        // 滑らかな移動
        if (this.isMoving && this.targetWorldPos) {
            const direction = new THREE.Vector3()
                .subVectors(this.targetWorldPos, this.model.position)
                .normalize();

            this.model.position.add(direction.multiplyScalar(this.moveSpeed));

            // 目標に向かって回転
            const angle = Math.atan2(direction.x, direction.z);
            this.model.rotation.y = angle;

            // 目標に到達したか確認
            if (this.model.position.distanceTo(this.targetWorldPos) < 0.1) {
                this.model.position.copy(this.targetWorldPos);
                this.gridPos = this.path.shift();
                this.isMoving = false;
                this.targetWorldPos = null;

                // 次の経路を計画（リプランニング）
                if (this.detectTarget(targetPos)) {
                    this.planPath(targetPos);
                }
            }
        }
    }

    hasReachedTarget(targetPos) {
        return this.gridPos.x === targetPos.x && this.gridPos.y === targetPos.y;
    }
}

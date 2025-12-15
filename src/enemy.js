import * as THREE from 'three';

export class Enemy {
    constructor(maze, startPos) {
        this.maze = maze;
        this.gridPos = { x: startPos.x, y: startPos.y };
        this.direction = this.getRandomDirection(); // 0:North, 1:East, 2:South, 3:West

        this.createModel();
        this.updateWorldPosition();
    }

    createModel() {
        // 敵キャラクターの3Dモデル（紫色の球体）
        this.model = new THREE.Group();

        // 本体（球体）
        const bodyGeometry = new THREE.SphereGeometry(0.6, 16, 16);
        const bodyMaterial = new THREE.MeshPhongMaterial({
            color: 0x8844ff,
            emissive: 0x4422aa,
            emissiveIntensity: 0.3
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.6;
        this.model.add(body);

        // 目（赤い発光）
        const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

        const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        leftEye.position.set(-0.2, 0.7, 0.5);
        this.model.add(leftEye);

        const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
        rightEye.position.set(0.2, 0.7, 0.5);
        this.model.add(rightEye);

        // トゲ（危険性を示す）
        const spikeGeometry = new THREE.ConeGeometry(0.15, 0.5, 8);
        const spikeMaterial = new THREE.MeshPhongMaterial({ color: 0x440088 });

        for (let i = 0; i < 8; i++) {
            const spike = new THREE.Mesh(spikeGeometry, spikeMaterial);
            const angle = (i / 8) * Math.PI * 2;
            spike.position.set(
                Math.cos(angle) * 0.6,
                0.6,
                Math.sin(angle) * 0.6
            );
            spike.rotation.z = -angle - Math.PI / 2;
            this.model.add(spike);
        }
    }

    updateWorldPosition() {
        this.model.position.set(this.gridPos.x * 2, 0, this.gridPos.y * 2);

        // 向きに応じて回転
        const rotations = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
        this.model.rotation.y = rotations[this.direction];
    }

    getRandomDirection() {
        return Math.floor(Math.random() * 4);
    }

    /**
     * ランダムに移動（1ターンに1回呼ばれる）
     */
    move() {
        // 70%の確率で前進、30%の確率で回転
        if (Math.random() < 0.7) {
            this.tryMoveForward();
        } else {
            // ランダムに左右回転
            this.direction = (this.direction + (Math.random() < 0.5 ? 1 : -1) + 4) % 4;
        }

        this.updateWorldPosition();
    }

    tryMoveForward() {
        const nextPos = this.getForwardPosition();

        // 移動可能かチェック
        if (this.maze.isWalkable(nextPos.x, nextPos.y)) {
            this.gridPos = nextPos;
        } else {
            // 壁にぶつかったら反転
            this.direction = (this.direction + 2) % 4;
        }
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

    getPosition() {
        return { ...this.gridPos };
    }
}

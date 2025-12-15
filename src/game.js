import * as THREE from 'three';
import { Maze } from './maze.js';
import { Agent } from './agent.js';

export class Game {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.maze = null;
        this.agent = null;
        this.target = null;
        this.targetPos = null;
        this.rescued = false;

        this.init();
        this.animate();
    }

    init() {
        // シーンの作成
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x333333);
        this.scene.fog = new THREE.Fog(0x333333, 10, 50);

        // カメラの作成
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(15, 20, 15);
        this.camera.lookAt(0, 0, 0);

        // レンダラーの作成
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // ライティング
        const ambientLight = new THREE.AmbientLight(0x404040, 1);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // 迷路の生成
        this.maze = new Maze(21, 21);
        this.createMazeGeometry();

        // エージェントの配置
        const startPos = { x: 1, y: 1 };
        this.agent = new Agent(this.maze, startPos);
        this.scene.add(this.agent.model);

        // 救助対象NPCの配置
        this.createTarget();

        // ミニマップの初期化
        this.initMinimap();

        // ウィンドウリサイズ対応
        window.addEventListener('resize', () => this.onWindowResize());
    }

    createMazeGeometry() {
        const wallMaterial = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const floorMaterial = new THREE.MeshPhongMaterial({ color: 0x4488dd });

        for (let y = 0; y < this.maze.height; y++) {
            for (let x = 0; x < this.maze.width; x++) {
                // 床
                const floorGeometry = new THREE.PlaneGeometry(2, 2);
                const floor = new THREE.Mesh(floorGeometry, floorMaterial);
                floor.rotation.x = -Math.PI / 2;
                floor.position.set(x * 2, 0, y * 2);
                floor.receiveShadow = true;
                this.scene.add(floor);

                // 壁
                if (this.maze.grid[y][x] === 1) {
                    const wallGeometry = new THREE.BoxGeometry(2, 3, 2);
                    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
                    wall.position.set(x * 2, 1.5, y * 2);
                    wall.castShadow = true;
                    this.scene.add(wall);
                }
            }
        }
    }

    createTarget() {
        const walkablePositions = this.maze.getWalkablePositions();
        // エージェントから遠い位置を選択
        const agentPos = this.agent.gridPos;
        walkablePositions.sort((a, b) => {
            const distA = Math.abs(a.x - agentPos.x) + Math.abs(a.y - agentPos.y);
            const distB = Math.abs(b.x - agentPos.x) + Math.abs(b.y - agentPos.y);
            return distB - distA;
        });

        this.targetPos = walkablePositions[0];

        // NPCモデル（赤い人型）
        const targetGroup = new THREE.Group();

        // 体
        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xcc3333 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        targetGroup.add(body);

        // 頭
        const headGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const head = new THREE.Mesh(headGeometry, bodyMaterial);
        head.position.y = 1.8;
        targetGroup.add(head);

        // "HELP"テキスト
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = 256;
        canvas.height = 128;
        context.fillStyle = '#ffff00';
        context.font = 'Bold 60px Arial';
        context.textAlign = 'center';
        context.fillText('HELP', 128, 80);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(2, 1, 1);
        sprite.position.y = 2.8;
        targetGroup.add(sprite);

        targetGroup.position.set(this.targetPos.x * 2, 0, this.targetPos.y * 2);
        this.target = targetGroup;
        this.scene.add(this.target);
    }

    initMinimap() {
        const canvas = document.getElementById('minimap');
        canvas.width = 190;
        canvas.height = 190;
        this.minimapCtx = canvas.getContext('2d');
    }

    updateMinimap() {
        const ctx = this.minimapCtx;
        const cellSize = 190 / this.maze.width;

        ctx.clearRect(0, 0, 190, 190);

        // 迷路を描画
        for (let y = 0; y < this.maze.height; y++) {
            for (let x = 0; x < this.maze.width; x++) {
                if (this.maze.grid[y][x] === 1) {
                    ctx.fillStyle = '#666';
                } else {
                    ctx.fillStyle = '#88aacc';
                }
                ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
            }
        }

        // エージェントを描画
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(
            this.agent.gridPos.x * cellSize + cellSize / 2,
            this.agent.gridPos.y * cellSize + cellSize / 2,
            cellSize / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // ターゲットを描画
        if (!this.rescued) {
            ctx.fillStyle = '#ff3333';
            ctx.beginPath();
            ctx.arc(
                this.targetPos.x * cellSize + cellSize / 2,
                this.targetPos.y * cellSize + cellSize / 2,
                cellSize / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }
    }

    updateStatus() {
        const statusInfo = document.getElementById('status-info');
        if (this.rescued) {
            statusInfo.textContent = 'RESCUE COMPLETE!';
        } else {
            const distance = Math.abs(this.agent.gridPos.x - this.targetPos.x) +
                           Math.abs(this.agent.gridPos.y - this.targetPos.y);
            statusInfo.textContent = `SEARCHING... Distance: ${distance}`;
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.rescued) {
            this.agent.update(this.targetPos);

            // 救助完了チェック
            if (this.agent.hasReachedTarget(this.targetPos)) {
                this.rescued = true;
                this.scene.remove(this.target);
            }
        }

        this.updateMinimap();
        this.updateStatus();

        // カメラをエージェントに追従
        const cameraOffset = new THREE.Vector3(8, 15, 8);
        const targetCameraPos = this.agent.model.position.clone().add(cameraOffset);
        this.camera.position.lerp(targetCameraPos, 0.05);
        this.camera.lookAt(this.agent.model.position);

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

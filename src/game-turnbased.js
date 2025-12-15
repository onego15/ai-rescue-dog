import * as THREE from 'three';
import { Maze } from './maze.js';
import { TurnBasedAgent } from './agent-turnbased.js';
import { Enemy } from './enemy.js';
import { OpenAIClient } from './openai-client.js';

export class TurnBasedGame {
    constructor(apiKey) {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.maze = null;
        this.agent = null;
        this.target = null;
        this.targetPos = null;
        this.enemies = [];
        this.gameState = 'PLAYING'; // PLAYING, WIN, LOSE
        this.turnCount = 0;
        this.isProcessingTurn = false;

        // OpenAI API クライアント
        this.openAIClient = apiKey ? new OpenAIClient(apiKey) : null;

        this.init();
    }

    async init() {
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
        this.agent = new TurnBasedAgent(this.maze, startPos);
        this.scene.add(this.agent.model);

        // 救助対象NPCの配置
        this.createTarget();

        // 敵の配置（3〜5体）
        this.createEnemies(3);

        // ミニマップの初期化
        this.initMinimap();

        // ウィンドウリサイズ対応
        window.addEventListener('resize', () => this.onWindowResize());

        // アニメーションループを開始
        this.animate();

        // ターン処理を開始
        this.startTurnLoop();
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
        const agentPos = this.agent.getPosition();

        walkablePositions.sort((a, b) => {
            const distA = Math.abs(a.x - agentPos.x) + Math.abs(a.y - agentPos.y);
            const distB = Math.abs(b.x - agentPos.x) + Math.abs(b.y - agentPos.y);
            return distB - distA;
        });

        this.targetPos = walkablePositions[0];

        // NPCモデル（赤い人型）
        const targetGroup = new THREE.Group();

        const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.2, 8);
        const bodyMaterial = new THREE.MeshPhongMaterial({ color: 0xcc3333 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        targetGroup.add(body);

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

    createEnemies(count) {
        const walkablePositions = this.maze.getWalkablePositions();
        const agentPos = this.agent.getPosition();

        // エージェントから離れた位置を選択
        walkablePositions.sort((a, b) => {
            const distA = Math.abs(a.x - agentPos.x) + Math.abs(a.y - agentPos.y);
            const distB = Math.abs(b.x - agentPos.x) + Math.abs(b.y - agentPos.y);
            return distB - distA;
        });

        // 敵を配置（ターゲット位置を除く）
        for (let i = 0; i < count && i < walkablePositions.length - 1; i++) {
            const pos = walkablePositions[i + 1]; // +1でターゲット位置を避ける
            const enemy = new Enemy(this.maze, pos);
            this.enemies.push(enemy);
            this.scene.add(enemy.model);
        }
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

        // 敵を描画
        ctx.fillStyle = '#8844ff';
        for (const enemy of this.enemies) {
            const pos = enemy.getPosition();
            ctx.beginPath();
            ctx.arc(
                pos.x * cellSize + cellSize / 2,
                pos.y * cellSize + cellSize / 2,
                cellSize / 2,
                0,
                Math.PI * 2
            );
            ctx.fill();
        }

        // エージェントを描画
        const agentPos = this.agent.getPosition();
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(
            agentPos.x * cellSize + cellSize / 2,
            agentPos.y * cellSize + cellSize / 2,
            cellSize / 2,
            0,
            Math.PI * 2
        );
        ctx.fill();

        // ターゲットを描画
        if (this.gameState === 'PLAYING') {
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

        if (this.gameState === 'WIN') {
            statusInfo.textContent = '🎉 RESCUE COMPLETE!';
            statusInfo.style.color = '#00ff00';
        } else if (this.gameState === 'LOSE') {
            statusInfo.textContent = '💀 GAME OVER!';
            statusInfo.style.color = '#ff0000';
        } else {
            const distance = Math.abs(this.agent.getPosition().x - this.targetPos.x) +
                           Math.abs(this.agent.getPosition().y - this.targetPos.y);
            statusInfo.textContent = `Turn: ${this.turnCount} | Distance: ${distance} | Enemies: ${this.enemies.length}`;
            statusInfo.style.color = '#ccc';
        }
    }

    async startTurnLoop() {
        while (this.gameState === 'PLAYING') {
            await this.processTurn();
            await this.sleep(1000); // 1秒待機
        }
    }

    async processTurn() {
        if (this.isProcessingTurn || this.gameState !== 'PLAYING') {
            return;
        }

        this.isProcessingTurn = true;
        this.turnCount++;

        // 1. 敵の移動
        for (const enemy of this.enemies) {
            enemy.move();
        }

        // 2. 衝突判定（敗北チェック）
        if (this.checkEnemyCollision()) {
            this.gameState = 'LOSE';
            this.isProcessingTurn = false;
            return;
        }

        // 3. センサーデータ収集
        const sensorData = this.agent.getSensorData(this.targetPos, this.enemies);

        // 4. OpenAI APIまたはフォールバックで行動決定
        let action;
        if (this.openAIClient) {
            try {
                action = await this.openAIClient.getNextAction(sensorData);
                console.log(`Turn ${this.turnCount}: AI chose ${action}`);
            } catch (error) {
                console.error('API Error, using fallback');
                action = this.openAIClient.getFallbackAction(sensorData);
            }
        } else {
            // API未設定の場合はフォールバック
            action = this.getFallbackAction(sensorData);
            console.log(`Turn ${this.turnCount}: Fallback chose ${action}`);
        }

        // 5. エージェントの行動実行
        this.agent.executeAction(action);

        // 6. 衝突判定（勝利チェック）
        if (this.checkTargetReached()) {
            this.gameState = 'WIN';
        }

        this.isProcessingTurn = false;
    }

    getFallbackAction(sensorData) {
        const { obstacles, enemies } = sensorData;

        // 前方に敵がいる場合は回転
        if (enemies.some(e => e.distance <= 2 && e.direction === 'front')) {
            return Math.random() < 0.5 ? 'TURN_LEFT' : 'TURN_RIGHT';
        }

        // 前方に壁がある場合は回転
        if (obstacles.front) {
            return Math.random() < 0.5 ? 'TURN_LEFT' : 'TURN_RIGHT';
        }

        return 'MOVE_FORWARD';
    }

    checkEnemyCollision() {
        const agentPos = this.agent.getPosition();
        for (const enemy of this.enemies) {
            const enemyPos = enemy.getPosition();
            if (agentPos.x === enemyPos.x && agentPos.y === enemyPos.y) {
                return true;
            }
        }
        return false;
    }

    checkTargetReached() {
        const agentPos = this.agent.getPosition();
        return agentPos.x === this.targetPos.x && agentPos.y === this.targetPos.y;
    }

    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.updateMinimap();
        this.updateStatus();

        // カメラをエージェントに追従
        const agentPos = this.agent.getPosition();
        const cameraOffset = new THREE.Vector3(8, 15, 8);
        const targetCameraPos = new THREE.Vector3(agentPos.x * 2, 0, agentPos.y * 2).add(cameraOffset);
        this.camera.position.lerp(targetCameraPos, 0.05);
        this.camera.lookAt(agentPos.x * 2, 0, agentPos.y * 2);

        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

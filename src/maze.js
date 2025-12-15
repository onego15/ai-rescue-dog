export class Maze {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = [];
        this.generateMaze();
    }

    generateMaze() {
        // 初期化：すべて壁
        for (let y = 0; y < this.height; y++) {
            this.grid[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.grid[y][x] = 1; // 1 = 壁
            }
        }

        // 迷路生成（深さ優先探索）
        const stack = [];
        const startX = 1;
        const startY = 1;

        this.grid[startY][startX] = 0; // 0 = 通路
        stack.push({ x: startX, y: startY });

        const directions = [
            { dx: 0, dy: -2 },  // 上
            { dx: 2, dy: 0 },   // 右
            { dx: 0, dy: 2 },   // 下
            { dx: -2, dy: 0 }   // 左
        ];

        while (stack.length > 0) {
            const current = stack[stack.length - 1];
            const neighbors = [];

            // 未訪問の隣接セルを探す
            for (const dir of directions) {
                const nx = current.x + dir.dx;
                const ny = current.y + dir.dy;

                if (nx > 0 && nx < this.width - 1 &&
                    ny > 0 && ny < this.height - 1 &&
                    this.grid[ny][nx] === 1) {
                    neighbors.push({ x: nx, y: ny, dx: dir.dx, dy: dir.dy });
                }
            }

            if (neighbors.length > 0) {
                // ランダムに隣接セルを選択
                const next = neighbors[Math.floor(Math.random() * neighbors.length)];

                // 間の壁を削除
                this.grid[current.y + next.dy / 2][current.x + next.dx / 2] = 0;
                this.grid[next.y][next.x] = 0;

                stack.push({ x: next.x, y: next.y });
            } else {
                stack.pop();
            }
        }
    }

    isWalkable(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
            return false;
        }
        return this.grid[y][x] === 0;
    }

    getWalkablePositions() {
        const positions = [];
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                if (this.grid[y][x] === 0) {
                    positions.push({ x, y });
                }
            }
        }
        return positions;
    }
}

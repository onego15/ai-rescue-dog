// A*アルゴリズムによる経路探索
export class PathFinder {
    constructor(maze) {
        this.maze = maze;
    }

    heuristic(a, b) {
        // マンハッタン距離
        return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    }

    getNeighbors(node) {
        const neighbors = [];
        const directions = [
            { dx: 0, dy: -1 },  // 上
            { dx: 1, dy: 0 },   // 右
            { dx: 0, dy: 1 },   // 下
            { dx: -1, dy: 0 }   // 左
        ];

        for (const dir of directions) {
            const x = node.x + dir.dx;
            const y = node.y + dir.dy;

            if (this.maze.isWalkable(x, y)) {
                neighbors.push({ x, y });
            }
        }

        return neighbors;
    }

    findPath(start, goal) {
        const openSet = [];
        const closedSet = new Set();
        const cameFrom = new Map();
        const gScore = new Map();
        const fScore = new Map();

        const startKey = `${start.x},${start.y}`;
        const goalKey = `${goal.x},${goal.y}`;

        openSet.push(start);
        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, goal));

        while (openSet.length > 0) {
            // fScoreが最小のノードを選択
            openSet.sort((a, b) => {
                const aKey = `${a.x},${a.y}`;
                const bKey = `${b.x},${b.y}`;
                return fScore.get(aKey) - fScore.get(bKey);
            });

            const current = openSet.shift();
            const currentKey = `${current.x},${current.y}`;

            // ゴールに到達
            if (currentKey === goalKey) {
                return this.reconstructPath(cameFrom, current);
            }

            closedSet.add(currentKey);

            // 隣接ノードを探索
            for (const neighbor of this.getNeighbors(current)) {
                const neighborKey = `${neighbor.x},${neighbor.y}`;

                if (closedSet.has(neighborKey)) {
                    continue;
                }

                const tentativeGScore = gScore.get(currentKey) + 1;

                if (!openSet.some(n => `${n.x},${n.y}` === neighborKey)) {
                    openSet.push(neighbor);
                } else if (tentativeGScore >= gScore.get(neighborKey)) {
                    continue;
                }

                cameFrom.set(neighborKey, current);
                gScore.set(neighborKey, tentativeGScore);
                fScore.set(neighborKey, tentativeGScore + this.heuristic(neighbor, goal));
            }
        }

        return []; // パスが見つからない
    }

    reconstructPath(cameFrom, current) {
        const path = [current];
        let currentKey = `${current.x},${current.y}`;

        while (cameFrom.has(currentKey)) {
            current = cameFrom.get(currentKey);
            currentKey = `${current.x},${current.y}`;
            path.unshift(current);
        }

        return path;
    }
}

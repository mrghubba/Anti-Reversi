const EMPTY = 0, BLACK = 1, WHITE = -1, SIZE = 8;

let board = [], currentPlayer = BLACK;

const dirs = [
    [-1,-1], [-1,0], [-1,1],
    [0,-1],          [0,1],
    [1,-1],  [1,0],  [1,1]
];

// -------------------- INIT --------------------

function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(EMPTY));

    board[3][3] = WHITE;
    board[4][4] = WHITE;
    board[3][4] = BLACK;
    board[4][3] = BLACK;

    currentPlayer = BLACK;

    setStatus("Your turn (Black)");
    render();
}

// -------------------- UI --------------------

function setStatus(msg) {
    document.getElementById('status').textContent = msg;
}

// -------------------- CORE HELPERS --------------------

function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function canPlay(b, p) {
    return legalMoves(b, p).length > 0;
}

// -------------------- MOVE ENGINE --------------------

function getFlips(b, r, c, p) {
    if (b[r][c] !== EMPTY) return [];

    let flips = [];

    for (const [dr, dc] of dirs) {
        let rr = r + dr, cc = c + dc;
        let line = [];

        while (inBounds(rr, cc) && b[rr][cc] === -p) {
            line.push([rr, cc]);
            rr += dr;
            cc += dc;
        }

        if (line.length && inBounds(rr, cc) && b[rr][cc] === p) {
            flips.push(...line);
        }
    }

    return flips;
}

function legalMoves(b, p) {
    const m = [];

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            if (getFlips(b, r, c, p).length) {
                m.push([r, c]);
            }
        }
    }

    return m;
}

function makeMove(b, r, c, p) {
    const flips = getFlips(b, r, c, p);
    if (!flips.length) return null;

    const nb = b.map(x => x.slice());

    nb[r][c] = p;

    for (const [fr, fc] of flips) {
        nb[fr][fc] = p;
    }

    return nb;
}

// -------------------- ADVANCED ANTI-AI SYSTEM --------------------

// 🪤 trap detection
function isTrapMove(b, r, c, p) {
    const nb = makeMove(b, r, c, p);
    if (!nb) return true;

    const oppMoves = legalMoves(nb, -p).length;
    const myMoves = legalMoves(nb, p).length;

    if (oppMoves === 0) return true;
    if (myMoves > oppMoves * 3) return true;

    return false;
}

// 🌪 entropy scoring
function moveEntropy(b, r, c, p) {
    const nb = makeMove(b, r, c, p);
    if (!nb) return 0;

    const oppMoves = legalMoves(nb, -p).length;
    const myMoves = legalMoves(nb, p).length;

    return Math.abs(oppMoves - myMoves);
}

// 📊 adaptive difficulty
function adaptiveDepth(b) {
    let total = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (b[r][c] !== EMPTY) total++;
        }
    }

    if (total < 20) return 3;
    if (total < 45) return 4;
    return 5;
}

// 🎭 intentional blunders
function shouldBlunder() {
    return Math.random() < 0.18;
}

// -------------------- EVALUATION (ANTI-REVERSED) --------------------

function evaluate(b) {
    const my = WHITE, opp = BLACK;

    let score = 0;

    const myMoves = legalMoves(b, my).length;
    const oppMoves = legalMoves(b, opp).length;

    score += myMoves * -30;
    score += oppMoves * 40;

    let myDiscs = 0, oppDiscs = 0;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (b[r][c] === my) myDiscs++;
            if (b[r][c] === opp) oppDiscs++;
        }
    }

    score += (oppDiscs - myDiscs) * 5;

    const corners = [[0,0],[0,7],[7,0],[7,7]];

    for (const [r, c] of corners) {
        if (b[r][c] === my) score -= 120;
        if (b[r][c] === opp) score += 80;
    }

    if (myDiscs + oppDiscs >= 50) {
        score += (myDiscs - oppDiscs) * 50;
    }

    return score;
}

// -------------------- SEARCH --------------------

function alphaBeta(b, d, a, beta, p) {
    if (d <= 0) return evaluate(b);

    const m = legalMoves(b, p);

    if (!m.length) {
        if (!canPlay(b, -p)) return evaluate(b);
        return alphaBeta(b, d - 1, a, beta, -p);
    }

    if (p === WHITE) {
        let v = -Infinity;

        for (const [r, c] of m) {
            v = Math.max(v,
                alphaBeta(makeMove(b, r, c, p), d - 1, a, beta, BLACK)
            );

            a = Math.max(a, v);
            if (beta <= a) break;
        }

        return v;
    } else {
        let v = Infinity;

        for (const [r, c] of m) {
            v = Math.min(v,
                alphaBeta(makeMove(b, r, c, p), d - 1, a, beta, WHITE)
            );

            beta = Math.min(beta, v);
            if (beta <= a) break;
        }

        return v;
    }
}

// -------------------- AI ENGINE --------------------

function aiMove() {
    const moves = legalMoves(board, WHITE);

    if (!moves.length) {
        setStatus("Computer has no moves — PASS");
        currentPlayer = BLACK;
        nextTurn();
        return;
    }

    const depth = adaptiveDepth(board);

    let bestMove = null;
    let bestScore = Infinity;

    for (const [r, c] of moves) {

        const nb = makeMove(board, r, c, WHITE);
        if (!nb) continue;

        if (isTrapMove(board, r, c, WHITE)) continue;

        const entropy = moveEntropy(board, r, c, WHITE);

        const score = alphaBeta(nb, depth, -Infinity, Infinity, BLACK);

        const finalScore = score - entropy * 2;

        if (finalScore < bestScore) {
            bestScore = finalScore;
            bestMove = [r, c];
        }
    }

    if (!bestMove) {
        bestMove = moves[Math.floor(Math.random() * moves.length)];
    }

    if (shouldBlunder() && moves.length > 1) {
        bestMove = moves[Math.floor(Math.random() * moves.length)];
    }

    board = makeMove(board, bestMove[0], bestMove[1], WHITE);
    currentPlayer = BLACK;

    nextTurn();
}

// -------------------- TURN CONTROL --------------------

function nextTurn() {
    if (!canPlay(board, currentPlayer)) {
        setStatus(
            currentPlayer === BLACK
                ? "You have no moves — PASS"
                : "Computer has no moves — PASS"
        );

        currentPlayer = -currentPlayer;
    }

    if (!canPlay(board, BLACK) && !canPlay(board, WHITE)) {
        checkGameState();
        return;
    }

    render();

    if (currentPlayer === BLACK) {
        setStatus("Your turn (Black)");
    } else {
        setStatus("Computer thinking...");
        setTimeout(aiMove, 150);
    }
}

// -------------------- INPUT --------------------

function handleClick(r, c) {
    if (currentPlayer !== BLACK) return;

    const nb = makeMove(board, r, c, BLACK);
    if (!nb) return;

    board = nb;
    currentPlayer = WHITE;

    nextTurn();
}

// -------------------- GAME END --------------------

function checkGameState() {
    const bm = legalMoves(board, BLACK);
    const wm = legalMoves(board, WHITE);

    if (!bm.length && !wm.length) {
        let black = 0, white = 0;

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (board[r][c] === BLACK) black++;
                if (board[r][c] === WHITE) white++;
            }
        }

        setStatus(
            black < white
                ? "Black wins Anti-Reversi!"
                : white < black
                ? "White wins Anti-Reversi!"
                : "Draw!"
        );
    }
}

// -------------------- RENDER --------------------

function getLegalMoveSet(p) {
    return new Set(legalMoves(board, p).map(m => m[0] + "," + m[1]));
}

function render() {
    const bd = document.getElementById('board');
    bd.innerHTML = '';

    let black = 0, white = 0;

    const legal = currentPlayer === BLACK
        ? getLegalMoveSet(BLACK)
        : new Set();

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {

            const cell = document.createElement('div');
            cell.className = 'cell';

            if (legal.has(r + "," + c)) {
                cell.classList.add("legal");
            }

            if (board[r][c] !== EMPTY) {
                const d = document.createElement('div');
                d.className = 'disc ' + (board[r][c] === BLACK ? 'black' : 'white');

                cell.appendChild(d);

                if (board[r][c] === BLACK) black++;
                else white++;
            }

            cell.addEventListener('click', () => handleClick(r, c));
            bd.appendChild(cell);
        }
    }

    document.getElementById('blackScore').textContent = 'Black: ' + black;
    document.getElementById('whiteScore').textContent = 'White: ' + white;

    if (currentPlayer === WHITE) {
        setStatus("Computer thinking...");
    }
}

// -------------------- BOOT --------------------

document.getElementById('restartBtn')?.addEventListener('click', initBoard);
window.addEventListener('load', initBoard);

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

// -------------------- HELPERS --------------------

function inBounds(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

function setStatus(msg) {
    document.getElementById('status').textContent = msg;
}

function canPlay(b, p) {
    return legalMoves(b, p).length > 0;
}

// -------------------- MOVE LOGIC --------------------

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

// -------------------- AI --------------------

function evaluate(b) {
    let score =
        (legalMoves(b, WHITE).length - legalMoves(b, BLACK).length) * 15;

    for (const [r, c] of [[0,0],[0,7],[7,0],[7,7]]) {
        if (b[r][c] === WHITE) score += 40;
        if (b[r][c] === BLACK) score -= 40;
    }

    let discs = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            discs += b[r][c];
        }
    }

    score -= discs * 2;

    return score;
}

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

function aiMove() {
    const m = legalMoves(board, WHITE);

    if (!m.length) {
        setStatus("Computer has no moves — PASS");
        currentPlayer = BLACK;
        nextTurn();
        return;
    }

    let best = null, bestScore = -Infinity;

    for (const [r, c] of m) {
        const s = alphaBeta(
            makeMove(board, r, c, WHITE),
            4,
            -Infinity,
            Infinity,
            BLACK
        );

        if (s > bestScore) {
            bestScore = s;
            best = [r, c];
        }
    }

    board = makeMove(board, best[0], best[1], WHITE);
    currentPlayer = BLACK;

    nextTurn();
}

// -------------------- TURN CONTROL --------------------

function nextTurn() {
    if (!canPlay(board, currentPlayer)) {
        if (currentPlayer === BLACK) {
            setStatus("You have no moves — PASS");
        } else {
            setStatus("Computer has no moves — PASS");
        }

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

    if (bm.length === 0 && wm.length === 0) {
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
    const moves = legalMoves(board, p);
    return new Set(moves.map(m => m[0] + "," + m[1]));
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
                d.className = 'disc ' +
                    (board[r][c] === BLACK ? 'black' : 'white');

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

    if (currentPlayer === BLACK &&
        document.getElementById('status').textContent.indexOf('wins') === -1) {
        setStatus("Your turn (Black)");
    }

    if (currentPlayer === WHITE) {
        setStatus("Computer thinking...");
    }
}

// -------------------- BOOT --------------------

document.getElementById('restartBtn')?.addEventListener('click', initBoard);
window.addEventListener('load', initBoard);

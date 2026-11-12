const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

let currentColor = '#000000';
let currentShape = 'free';
let isErasing = false;

let strokes = [];
let currentStroke = null;

const view = { scale: 1, offsetX: 0, offsetY: 0 };
const MIN_SCALE = 0.2;
const MAX_SCALE = 8;

const GRID_SIZE = 32;
const GRID_COLOR = '#e5e5e5';

const undoStack = [];
const redoStack = [];
const MAX_HISTORY = 100;

function cloneStrokes(arr) {
    if (typeof structuredClone === 'function') return structuredClone(arr);
    return JSON.parse(JSON.stringify(arr));
}

function pushHistory() {
    undoStack.push(cloneStrokes(strokes));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack.length = 0;
    updateHistoryButtons();
}

function updateHistoryButtons() {
    const u = document.getElementById('undoBtn');
    const r = document.getElementById('redoBtn');
    if (u) u.disabled = undoStack.length === 0;
    if (r) r.disabled = redoStack.length === 0;
}

function undo() {
    if (undoStack.length === 0) return;
    redoStack.push(cloneStrokes(strokes));
    strokes = undoStack.pop();
    currentStroke = null;
    redraw();
    updateHistoryButtons();
}

function redo() {
    if (redoStack.length === 0) return;
    undoStack.push(cloneStrokes(strokes));
    strokes = redoStack.pop();
    currentStroke = null;
    redraw();
    updateHistoryButtons();
}

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    redraw();
}

function redraw() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(
        dpr * view.scale, 0,
        0, dpr * view.scale,
        dpr * view.offsetX, dpr * view.offsetY
    );

    drawGrid(rect);
    for (const s of strokes) drawStroke(s);
    if (currentStroke) drawStroke(currentStroke);
}

function drawGrid(rect) {
    const left   = (-view.offsetX) / view.scale;
    const top    = (-view.offsetY) / view.scale;
    const right  = (rect.width  - view.offsetX) / view.scale;
    const bottom = (rect.height - view.offsetY) / view.scale;

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1 / view.scale;

    const startX = Math.floor(left / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(top  / GRID_SIZE) * GRID_SIZE;

    ctx.beginPath();
    for (let x = startX; x <= right; x += GRID_SIZE) {
        ctx.moveTo(x, top);
        ctx.lineTo(x, bottom);
    }
    for (let y = startY; y <= bottom; y += GRID_SIZE) {
        ctx.moveTo(left, y);
        ctx.lineTo(right, y);
    }
    ctx.stroke();
}

function drawStroke(s) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2 / view.scale;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (s.type === 'free') {
        if (s.points.length === 1) {
            const p = s.points[0];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1 / view.scale, 0, Math.PI * 2);
            ctx.fillStyle = s.color;
            ctx.fill();
            return;
        }
        ctx.beginPath();
        ctx.moveTo(s.points[0].x, s.points[0].y);
        for (let i = 1; i < s.points.length; i++) {
            ctx.lineTo(s.points[i].x, s.points[i].y);
        }
        ctx.stroke();
        return;
    }

    if (s.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.lineTo(s.x2, s.y2);
        ctx.stroke();
    } else if (s.type === 'circle') {
        const cx = (s.x1 + s.x2) / 2;
        const cy = (s.y1 + s.y2) / 2;
        const rx = Math.abs(s.x2 - s.x1) / 2;
        const ry = Math.abs(s.y2 - s.y1) / 2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
        ctx.stroke();
    } else if (s.type === 'square') {
        const side = Math.min(Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
        const x = s.x2 >= s.x1 ? s.x1 : s.x1 - side;
        const y = s.y2 >= s.y1 ? s.y1 : s.y1 - side;
        ctx.strokeRect(x, y, side, side);
    } else if (s.type === 'rect') {
        const x = Math.min(s.x1, s.x2);
        const y = Math.min(s.y1, s.y2);
        ctx.strokeRect(x, y, Math.abs(s.x2 - s.x1), Math.abs(s.y2 - s.y1));
    } else if (s.type === 'triangle') {
        const x = Math.min(s.x1, s.x2);
        const y = Math.min(s.y1, s.y2);
        const w = Math.abs(s.x2 - s.x1);
        const h = Math.abs(s.y2 - s.y1);
        ctx.beginPath();
        ctx.moveTo(x + w / 2, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.stroke();
    } else if (s.type === 'trapezoid') {
        const x = Math.min(s.x1, s.x2);
        const y = Math.min(s.y1, s.y2);
        const w = Math.abs(s.x2 - s.x1);
        const h = Math.abs(s.y2 - s.y1);
        const inset = w * 0.25;
        ctx.beginPath();
        ctx.moveTo(x + inset, y);
        ctx.lineTo(x + w - inset, y);
        ctx.lineTo(x + w, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.stroke();
    } else if (s.type === 'parallelogram') {
        const x = Math.min(s.x1, s.x2);
        const y = Math.min(s.y1, s.y2);
        const w = Math.abs(s.x2 - s.x1);
        const h = Math.abs(s.y2 - s.y1);
        const skew = w * 0.25;
        ctx.beginPath();
        ctx.moveTo(x + skew, y);
        ctx.lineTo(x + w, y);
        ctx.lineTo(x + w - skew, y + h);
        ctx.lineTo(x, y + h);
        ctx.closePath();
        ctx.stroke();
    }
}

function screenToWorld(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    return {
        x: (sx - view.offsetX) / view.scale,
        y: (sy - view.offsetY) / view.scale,
    };
}

function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function strokeHitsPoint(s, p, r) {
    if (s.type === 'free') {
        return s.points.some(pt => dist(pt, p) <= r);
    }
    if (s.type === 'line') {
        const { x1, y1, x2, y2 } = s;
        const dx = x2 - x1, dy = y2 - y1;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return dist({ x: x1, y: y1 }, p) <= r;
        let t = ((p.x - x1) * dx + (p.y - y1) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return dist({ x: x1 + t * dx, y: y1 + t * dy }, p) <= r;
    }
    const minX = Math.min(s.x1, s.x2) - r;
    const maxX = Math.max(s.x1, s.x2) + r;
    const minY = Math.min(s.y1, s.y2) - r;
    const maxY = Math.max(s.y1, s.y2) + r;
    return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

function eraseAt(worldPos) {
    const R = 12 / view.scale;
    let changed = false;
    for (let i = strokes.length - 1; i >= 0; i--) {
        if (strokeHitsPoint(strokes[i], worldPos, R)) {
            if (!changed) pushHistory();
            strokes.splice(i, 1);
            changed = true;
        }
    }
    if (changed) redraw();
}

const pointers = new Map();
let gesture = null;
let mousePan = null;

canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) {
        if (e.button === 1 || e.button === 2) {
            canvas.setPointerCapture(e.pointerId);
            pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
            mousePan = {
                startX: e.clientX,
                startY: e.clientY,
                startOffsetX: view.offsetX,
                startOffsetY: view.offsetY,
            };
            canvas.classList.add('grabbing');
            return;
        }
        return;
    }

    canvas.setPointerCapture(e.pointerId);
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size >= 2) {
        if (currentStroke) {
            currentStroke = null;
            redraw();
        }
        startPanGesture();
        return;
    }

    const world = screenToWorld(e.clientX, e.clientY);

    if (isErasing) {
        eraseAt(world);
        return;
    }

    if (currentShape === 'free') {
        currentStroke = { type: 'free', color: currentColor, points: [world] };
    } else {
        currentStroke = {
            type: currentShape,
            color: currentColor,
            x1: world.x, y1: world.y,
            x2: world.x, y2: world.y,
        };
    }
    redraw();
});

canvas.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (mousePan) {
        view.offsetX = mousePan.startOffsetX + (e.clientX - mousePan.startX);
        view.offsetY = mousePan.startOffsetY + (e.clientY - mousePan.startY);
        redraw();
        return;
    }

    if (gesture) {
        updatePanGesture();
        return;
    }

    if (!currentStroke) {
        if (isErasing && e.buttons) {
            eraseAt(screenToWorld(e.clientX, e.clientY));
        }
        return;
    }

    const world = screenToWorld(e.clientX, e.clientY);
    if (currentStroke.type === 'free') {
        currentStroke.points.push(world);
    } else {
        currentStroke.x2 = world.x;
        currentStroke.y2 = world.y;
    }
    redraw();
});

function onPointerEnd(e) {
    pointers.delete(e.pointerId);

    if (mousePan) {
        mousePan = null;
        canvas.classList.remove('grabbing');
        return;
    }

    if (gesture && pointers.size < 2) {
        gesture = null;
        canvas.classList.remove('grabbing');
        return;
    }

    if (currentStroke && pointers.size === 0) {
        pushHistory();
        strokes.push(currentStroke);
        currentStroke = null;
        redraw();
    }
}
canvas.addEventListener('pointerup', onPointerEnd);
canvas.addEventListener('pointercancel', onPointerEnd);

function getTwoPointers() {
    const arr = Array.from(pointers.values());
    return [arr[0], arr[1]];
}

function startPanGesture() {
    if (pointers.size < 2) return;
    const [p1, p2] = getTwoPointers();
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);

    const rect = canvas.getBoundingClientRect();
    gesture = {
        startScale: view.scale,
        worldCX: (cx - rect.left - view.offsetX) / view.scale,
        worldCY: (cy - rect.top  - view.offsetY) / view.scale,
        startDist: d,
    };
    canvas.classList.add('grabbing');
}

function updatePanGesture() {
    if (!gesture || pointers.size < 2) return;
    const [p1, p2] = getTwoPointers();
    const cx = (p1.x + p2.x) / 2;
    const cy = (p1.y + p2.y) / 2;
    const d = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const rect = canvas.getBoundingClientRect();

    let newScale = gesture.startScale * (d / gesture.startDist);
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    view.scale = newScale;
    view.offsetX = (cx - rect.left) - gesture.worldCX * newScale;
    view.offsetY = (cy - rect.top ) - gesture.worldCY * newScale;

    redraw();
}

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    const worldX = (sx - view.offsetX) / view.scale;
    const worldY = (sy - view.offsetY) / view.scale;

    const zoomFactor = Math.exp(-e.deltaY * 0.0015);
    let newScale = view.scale * zoomFactor;
    newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, newScale));

    view.scale = newScale;
    view.offsetX = sx - worldX * newScale;
    view.offsetY = sy - worldY * newScale;

    redraw();
}, { passive: false });

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

window.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (!ctrl) return;
    if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
    } else if (e.key === 'y' || e.key === 'Y') {
        e.preventDefault();
        redo();
    }
});

const eraserBtn = document.getElementById('eraserBtn');

document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentColor = btn.dataset.color;
        isErasing = false;
        eraserBtn.classList.remove('active');
        document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentShape = btn.dataset.shape;
        isErasing = false;
        eraserBtn.classList.remove('active');
        document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

eraserBtn.addEventListener('click', () => {
    isErasing = !isErasing;
    eraserBtn.classList.toggle('active', isErasing);
});

document.getElementById('clearBtn').addEventListener('click', () => {
    if (strokes.length === 0) return;
    pushHistory();
    strokes = [];
    currentStroke = null;
    redraw();
});

document.getElementById('resetViewBtn').addEventListener('click', () => {
    view.scale = 1;
    view.offsetX = 0;
    view.offsetY = 0;
    redraw();
});

document.getElementById('undoBtn').addEventListener('click', undo);
document.getElementById('redoBtn').addEventListener('click', redo);

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
updateHistoryButtons();
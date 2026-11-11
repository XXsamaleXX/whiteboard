const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

let currentColor = '#000000';
let currentShape = 'free';
let isErasing = false;

const strokes = [];
let currentStroke = null;

function resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    redraw();
}

function redraw() {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    for (const s of strokes) drawStroke(s);
    if (currentStroke) drawStroke(currentStroke);
}

function drawStroke(s) {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (s.type === 'free') {
        if (s.points.length === 1) {
            const p = s.points[0];
            ctx.beginPath();
            ctx.arc(p.x, p.y, 1, 0, Math.PI * 2);
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

    if (s.type === 'circle') {
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

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
    };
}

function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
}

function strokeHitsPoint(s, p, r) {
    if (s.type === 'free') {
        return s.points.some(pt => dist(pt, p) <= r);
    }
    const minX = Math.min(s.x1, s.x2) - r;
    const maxX = Math.max(s.x1, s.x2) + r;
    const minY = Math.min(s.y1, s.y2) - r;
    const maxY = Math.max(s.y1, s.y2) + r;
    return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

function eraseAt(pos) {
    const R = 12;
    let changed = false;
    for (let i = strokes.length - 1; i >= 0; i--) {
        if (strokeHitsPoint(strokes[i], pos, R)) {
            strokes.splice(i, 1);
            changed = true;
        }
    }
    if (changed) redraw();
}

canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    canvas.setPointerCapture(e.pointerId);

    const pos = getPos(e);

    if (isErasing) {
        eraseAt(pos);
        return;
    }

    if (currentShape === 'free') {
        currentStroke = { type: 'free', color: currentColor, points: [pos] };
    } else {
        currentStroke = {
            type: currentShape,
            color: currentColor,
            x1: pos.x,
            y1: pos.y,
            x2: pos.x,
            y2: pos.y,
        };
    }
    redraw();
});

canvas.addEventListener('pointermove', (e) => {
    if (!currentStroke) {
        if (isErasing && e.buttons) eraseAt(getPos(e));
        return;
    }

    const pos = getPos(e);

    if (currentStroke.type === 'free') {
        currentStroke.points.push(pos);
    } else {
        currentStroke.x2 = pos.x;
        currentStroke.y2 = pos.y;
    }
    redraw();
});

function finishStroke() {
    if (!currentStroke) return;
    strokes.push(currentStroke);
    currentStroke = null;
    redraw();
}

canvas.addEventListener('pointerup', finishStroke);
canvas.addEventListener('pointercancel', finishStroke);

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
    strokes.length = 0;
    currentStroke = null;
    redraw();
});

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
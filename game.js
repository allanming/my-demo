(function () {
  "use strict";

  const COLS = 24;
  const ROWS = 24;
  const CELL = 22;
  const START_TICK_MS = 180;
  const MIN_TICK_MS = 72;
  const BEST_KEY = "snake-best-score";

  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };

  const KEY_TO_DIR = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    W: "up",
    A: "left",
    S: "down",
    D: "right",
  };

  const canvas = document.getElementById("board");
  const overlay = document.getElementById("overlay");
  const overlayTitle = document.getElementById("overlay-title");
  const overlayText = document.getElementById("overlay-text");
  const restartButton = document.getElementById("restart");
  const scoreEl = document.getElementById("score");
  const bestEl = document.getElementById("best");
  const ctx = canvas.getContext("2d");
  if (typeof ctx.roundRect !== "function") {
    ctx.roundRect = function (x, y, w, h) {
      ctx.rect(x, y, w, h);
    };
  }

  canvas.width = COLS * CELL;
  canvas.height = ROWS * CELL;

  let snake;
  let direction;
  let queuedDir;
  let food;
  let score;
  let best = readBest();
  let running = false;
  let timer = null;

  bestEl.textContent = String(best);

  function readBest() {
    try {
      return Number(localStorage.getItem(BEST_KEY) || 0);
    } catch (err) {
      return 0;
    }
  }

  function writeBest(value) {
    try {
      localStorage.setItem(BEST_KEY, String(value));
    } catch (err) {
      // Ignore private-mode / file-protocol storage failures.
    }
  }

  function opposite(a, b) {
    return a.x + b.x === 0 && a.y + b.y === 0;
  }

  function cellKey(cell) {
    return cell.x + "," + cell.y;
  }

  function randomEmptyCell() {
    const taken = new Set(snake.map(cellKey));
    const empty = [];
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        if (!taken.has(x + "," + y)) {
          empty.push({ x: x, y: y });
        }
      }
    }
    return empty[Math.floor(Math.random() * empty.length)];
  }

  function reset() {
    const midX = Math.floor(COLS / 2);
    const midY = Math.floor(ROWS / 2);
    snake = [
      { x: midX - 1, y: midY },
      { x: midX - 2, y: midY },
      { x: midX - 3, y: midY },
    ];
    direction = DIRS.right;
    queuedDir = null;
    score = 0;
    food = { x: midX + 3, y: midY };
    running = false;
    scoreEl.textContent = "0";
    showOverlay("Ready", "Use arrow keys or WASD to start", "Start game");
    draw();
  }

  function tickMs() {
    return Math.max(MIN_TICK_MS, START_TICK_MS - Math.floor(score / 4) * 6);
  }

  function startLoop() {
    stopLoop();
    timer = setInterval(step, tickMs());
  }

  function stopLoop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  function beginRun() {
    if (running) {
      return;
    }
    running = true;
    hideOverlay();
    startLoop();
  }

  function gameOver() {
    running = false;
    stopLoop();
    updateBest();
    showOverlay("Game over", "Score " + score + " · Space or button to retry", "Play again");
  }

  function win() {
    running = false;
    stopLoop();
    updateBest();
    showOverlay("You win", "Board cleared · Space or button to retry", "Play again");
  }

  function updateBest() {
    if (score > best) {
      best = score;
      writeBest(best);
      bestEl.textContent = String(best);
    }
  }

  function showOverlay(title, text, buttonLabel) {
    overlayTitle.textContent = title;
    overlayText.textContent = text;
    restartButton.textContent = buttonLabel;
    overlay.classList.remove("hidden");
  }

  function hideOverlay() {
    overlay.classList.add("hidden");
  }

  function step() {
    if (queuedDir && !opposite(queuedDir, direction)) {
      direction = queuedDir;
    }
    queuedDir = null;

    const head = snake[0];
    const next = { x: head.x + direction.x, y: head.y + direction.y };

    if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) {
      gameOver();
      return;
    }

    const hitSelf = snake.some(function (part, index) {
      return index < snake.length - 1 && part.x === next.x && part.y === next.y;
    });
    if (hitSelf) {
      gameOver();
      return;
    }

    snake.unshift(next);

    if (next.x === food.x && next.y === food.y) {
      score += 1;
      scoreEl.textContent = String(score);
      food = randomEmptyCell();
      if (!food) {
        draw();
        win();
        return;
      }
      startLoop();
    } else {
      snake.pop();
    }

    draw();
  }

  function drawCell(cell, fill, inset) {
    const pad = inset || 2;
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.roundRect(
      cell.x * CELL + pad,
      cell.y * CELL + pad,
      CELL - pad * 2,
      CELL - pad * 2,
      5
    );
    ctx.fill();
  }

  function draw() {
    ctx.fillStyle = "#0d110b";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "rgba(122, 209, 90, 0.06)";
    ctx.lineWidth = 1;
    for (let i = 1; i < COLS; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * CELL + 0.5, 0);
      ctx.lineTo(i * CELL + 0.5, canvas.height);
      ctx.stroke();
    }
    for (let j = 1; j < ROWS; j += 1) {
      ctx.beginPath();
      ctx.moveTo(0, j * CELL + 0.5);
      ctx.lineTo(canvas.width, j * CELL + 0.5);
      ctx.stroke();
    }

    ctx.fillStyle = "#ef5b45";
    ctx.beginPath();
    ctx.arc(
      food.x * CELL + CELL / 2,
      food.y * CELL + CELL / 2,
      CELL / 2 - 4,
      0,
      Math.PI * 2
    );
    ctx.fill();

    snake.forEach(function (part, index) {
      drawCell(part, index === 0 ? "#c6f08a" : "#7ad15a", index === 0 ? 1.5 : 2.5);
    });
  }

  function queueDirection(name) {
    const next = DIRS[name];
    if (!next) {
      return;
    }
    // Never reverse the heading currently in motion. Keep only the first
    // pending turn so Up-then-Left cannot collapse into an instant 180.
    if (opposite(next, direction) || queuedDir) {
      return;
    }
    queuedDir = next;
    if (!running) {
      beginRun();
    }
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === " " || event.code === "Space") {
      event.preventDefault();
      if (!running) {
        reset();
        beginRun();
      }
      return;
    }

    const dir = KEY_TO_DIR[event.key];
    if (!dir) {
      return;
    }
    event.preventDefault();
    queueDirection(dir);
  });

  restartButton.addEventListener("click", function () {
    reset();
    beginRun();
  });

  reset();
})();

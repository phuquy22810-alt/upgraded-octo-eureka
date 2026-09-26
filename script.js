// ========================================
// 🐍 GAME RẮN SĂN MỒI
// ========================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("score");
const highScoreElement = document.getElementById("highScore");
const statusElement = document.getElementById("status");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const restartBtn = document.getElementById("restartBtn");

const speedSlider = document.getElementById("speed");
const speedValue = document.getElementById("speedValue");

const obstacleSelect = document.getElementById("obstacles");

const musicToggle = document.getElementById("musicToggle");
const soundToggle = document.getElementById("soundToggle");


// ========================================
// CẤU HÌNH GAME
// ========================================

const GRID_SIZE = 25;
const TILE_SIZE = canvas.width / GRID_SIZE;

let snake;
let food;
let obstacles = [];

let direction;
let nextDirection;

let score = 0;
let highScore = Number(localStorage.getItem("snakeHighScore")) || 0;

let gameRunning = false;
let gamePaused = false;

let gameLoop = null;

let speed = 3;


// ========================================
// ÂM THANH
// Không cần tải file MP3 bên ngoài
// ========================================

let audioContext = null;
let musicInterval = null;

function initAudio() {

    if (!audioContext) {
        audioContext = new (
            window.AudioContext ||
            window.webkitAudioContext
        )();
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }
}


// Âm thanh khi ăn mồi
function playEatSound() {

    if (!soundToggle.checked) return;

    initAudio();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "square";

    oscillator.frequency.setValueAtTime(
        500,
        audioContext.currentTime
    );

    oscillator.frequency.exponentialRampToValueAtTime(
        900,
        audioContext.currentTime + 0.1
    );

    gain.gain.setValueAtTime(
        0.15,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.12
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + 0.12
    );
}


// Âm thanh Game Over
function playGameOverSound() {

    if (!soundToggle.checked) return;

    initAudio();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = "sawtooth";

    oscillator.frequency.setValueAtTime(
        300,
        audioContext.currentTime
    );

    oscillator.frequency.exponentialRampToValueAtTime(
        80,
        audioContext.currentTime + 0.5
    );

    gain.gain.setValueAtTime(
        0.15,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + 0.5
    );

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime + 0.5
    );
}


// ========================================
// NHẠC NỀN
// ========================================

function startMusic() {

    if (!musicToggle.checked) return;

    initAudio();

    stopMusic();

    const notes = [
        196,
        220,
        261,
        293,
        261,
        220
    ];

    let index = 0;

    musicInterval = setInterval(() => {

        if (!gameRunning || gamePaused) return;

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        oscillator.type = "sine";

        oscillator.frequency.value =
            notes[index];

        gain.gain.value = 0.025;

        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime + 0.25
        );

        index++;

        if (index >= notes.length) {
            index = 0;
        }

    }, 350);
}


function stopMusic() {

    if (musicInterval) {

        clearInterval(musicInterval);

        musicInterval = null;
    }
}


// ========================================
// KHỞI TẠO GAME
// ========================================

function initGame() {

    snake = [
        {
            x: 12,
            y: 12
        },

        {
            x: 11,
            y: 12
        },

        {
            x: 10,
            y: 12
        }
    ];

    direction = {
        x: 1,
        y: 0
    };

    nextDirection = {
        x: 1,
        y: 0
    };

    score = 0;

    scoreElement.textContent = score;

    highScoreElement.textContent = highScore;

    createObstacles();

    createFood();

    drawGame();

    statusElement.textContent =
        "Nhấn Bắt đầu để chơi";

    statusElement.classList.remove(
        "game-over"
    );
}


// ========================================
// TẠO CHƯỚNG NGẠI VẬT
// ========================================

function createObstacles() {

    obstacles = [];

    const amount =
        Number(obstacleSelect.value);

    for (let i = 0; i < amount; i++) {

        let obstacle;

        let valid = false;

        while (!valid) {

            obstacle = {
                x: Math.floor(
                    Math.random() * GRID_SIZE
                ),

                y: Math.floor(
                    Math.random() * GRID_SIZE
                )
            };

            valid =
                !isOnSnake(obstacle) &&
                !samePosition(obstacle, {
                    x: 12,
                    y: 12
                }) &&
                !obstacles.some(
                    item =>
                        samePosition(
                            item,
                            obstacle
                        )
                );
        }

        obstacles.push(obstacle);
    }
}


// ========================================
// TẠO MỒI
// ========================================

function createFood() {

    let newFood;

    do {

        newFood = {
            x: Math.floor(
                Math.random() * GRID_SIZE
            ),

            y: Math.floor(
                Math.random() * GRID_SIZE
            )
        };

    } while (
        isOnSnake(newFood) ||
        obstacles.some(
            obstacle =>
                samePosition(
                    obstacle,
                    newFood
                )
        )
    );

    food = newFood;
}


// ========================================
// GAME LOOP
// ========================================

function startGame() {

    initAudio();

    if (gameRunning) return;

    gameRunning = true;

    gamePaused = false;

    statusElement.textContent =
        "Đang chơi...";

    startBtn.textContent =
        "▶ Đang chơi";

    startLoop();

    startMusic();
}


function startLoop() {

    clearInterval(gameLoop);

    const speeds = {

        1: 220,

        2: 170,

        3: 130,

        4: 90,

        5: 55
    };

    gameLoop = setInterval(
        updateGame,
        speeds[speed]
    );
}


// ========================================
// CẬP NHẬT GAME
// ========================================

function updateGame() {

    if (!gameRunning || gamePaused) return;

    direction = nextDirection;

    const head = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
    };


    // Đụng tường
    if (
        head.x < 0 ||
        head.x >= GRID_SIZE ||
        head.y < 0 ||
        head.y >= GRID_SIZE
    ) {

        gameOver();

        return;
    }


    // Đụng thân
    if (isOnSnake(head)) {

        gameOver();

        return;
    }


    // Đụng chướng ngại vật
    if (
        obstacles.some(
            obstacle =>
                samePosition(
                    obstacle,
                    head
                )
        )
    ) {

        gameOver();

        return;
    }


    snake.unshift(head);


    // Ăn mồi
    if (
        samePosition(
            head,
            food
        )
    ) {

        score += 10;

        scoreElement.textContent =
            score;

        if (score > highScore) {

            highScore = score;

            highScoreElement.textContent =
                highScore;

            localStorage.setItem(
                "snakeHighScore",
                highScore
            );
        }

        playEatSound();

        createFood();

    } else {

        snake.pop();
    }


    drawGame();
}


// ========================================
// GAME OVER
// ========================================

function gameOver() {

    gameRunning = false;

    gamePaused = false;

    clearInterval(gameLoop);

    stopMusic();

    playGameOverSound();

    statusElement.textContent =
        "💀 GAME OVER - Nhấn Chơi lại";

    statusElement.classList.add(
        "game-over"
    );

    startBtn.textContent =
        "▶ Bắt đầu";
}


// ========================================
// VẼ GAME
// ========================================

function drawGame() {

    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // Nền
    ctx.fillStyle = "#081008";

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    // Lưới
    ctx.strokeStyle =
        "rgba(255,255,255,0.025)";

    ctx.lineWidth = 1;

    for (
        let i = 0;
        i <= GRID_SIZE;
        i++
    ) {

        ctx.beginPath();

        ctx.moveTo(
            i * TILE_SIZE,
            0
        );

        ctx.lineTo(
            i * TILE_SIZE,
            canvas.height
        );

        ctx.stroke();


        ctx.beginPath();

        ctx.moveTo(
            0,
            i * TILE_SIZE
        );

        ctx.lineTo(
            canvas.width,
            i * TILE_SIZE
        );

        ctx.stroke();
    }


    // Chướng ngại vật
    obstacles.forEach(obstacle => {

        drawRoundedRect(
            obstacle.x * TILE_SIZE + 3,
            obstacle.y * TILE_SIZE + 3,
            TILE_SIZE - 6,
            TILE_SIZE - 6,
            5,
            "#6d4632"
        );

        ctx.fillStyle = "#a66b46";

        ctx.fillRect(
            obstacle.x * TILE_SIZE + 8,
            obstacle.y * TILE_SIZE + 8,
            7,
            7
        );
    });


    // Mồi
    drawFood();


    // Rắn
    snake.forEach(
        (part, index) => {

            const padding = 2;

            let color;

            if (index === 0) {

                color = "#b5ff65";

            } else {

                color = "#35bd4a";
            }

            drawRoundedRect(
                part.x * TILE_SIZE + padding,
                part.y * TILE_SIZE + padding,
                TILE_SIZE - padding * 2,
                TILE_SIZE - padding * 2,
                7,
                color
            );
        }
    );


    // Mắt rắn
    drawSnakeEyes();
}


// ========================================
// VẼ MỒI
// ========================================

function drawFood() {

    const centerX =
        food.x * TILE_SIZE +
        TILE_SIZE / 2;

    const centerY =
        food.y * TILE_SIZE +
        TILE_SIZE / 2;

    ctx.beginPath();

    ctx.arc(
        centerX,
        centerY + 1,
        TILE_SIZE * 0.32,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = "#ff3d3d";

    ctx.fill();


    // Lá
    ctx.fillStyle = "#6cff55";

    ctx.beginPath();

    ctx.ellipse(
        centerX + 7,
        centerY - 8,
        6,
        3,
        -0.5,
        0,
        Math.PI * 2
    );

    ctx.fill();
}


// ========================================
// MẮT RẮN
// ========================================

function drawSnakeEyes() {

    const head = snake[0];

    const x =
        head.x * TILE_SIZE;

    const y =
        head.y * TILE_SIZE;

    ctx.fillStyle = "white";

    let eye1;
    let eye2;


    if (direction.x === 1) {

        eye1 = {
            x: x + 17,
            y: y + 7
        };

        eye2 = {
            x: x + 17,
            y: y + 17
        };

    } else if (direction.x === -1) {

        eye1 = {
            x: x + 8,
            y: y + 7
        };

        eye2 = {
            x: x + 8,
            y: y + 17
        };

    } else if (direction.y === -1) {

        eye1 = {
            x: x + 7,
            y: y + 8
        };

        eye2 = {
            x: x + 17,
            y: y + 8
        };

    } else {

        eye1 = {
            x: x + 7,
            y: y + 17
        };

        eye2 = {
            x: x + 17,
            y: y + 17
        };
    }


    ctx.beginPath();

    ctx.arc(
        eye1.x,
        eye1.y,
        3,
        0,
        Math.PI * 2
    );

    ctx.arc(
        eye2.x,
        eye2.y,
        3,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle = "#111";

    ctx.beginPath();

    ctx.arc(
        eye1.x,
        eye1.y,
        1.5,
        0,
        Math.PI * 2
    );

    ctx.arc(
        eye2.x,
        eye2.y,
        1.5,
        0,
        Math.PI * 2
    );

    ctx.fill();
}


// ========================================
// HÀM VẼ HÌNH BO GÓC
// ========================================

function drawRoundedRect(
    x,
    y,
    width,
    height,
    radius,
    color
) {

    ctx.fillStyle = color;

    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        width,
        height,
        radius
    );

    ctx.fill();
}


// ========================================
// KIỂM TRA VỊ TRÍ
// ========================================

function samePosition(a, b) {

    return (
        a.x === b.x &&
        a.y === b.y
    );
}


function isOnSnake(position) {

    return snake.some(
        part =>
            samePosition(
                part,
                position
            )
    );
}


// ========================================
// ĐIỀU KHIỂN
// ========================================

function changeDirection(key) {

    const directions = {

        ArrowUp: {
            x: 0,
            y: -1
        },

        ArrowDown: {
            x: 0,
            y: 1
        },

        ArrowLeft: {
            x: -1,
            y: 0
        },

        ArrowRight: {
            x: 1,
            y: 0
        }
    };


    const selected =
        directions[key];

    if (!selected) return;


    // Không cho quay đầu 180 độ
    if (
        selected.x === -direction.x &&
        selected.y === -direction.y
    ) {

        return;
    }


    nextDirection = selected;
}


// Bàn phím
document.addEventListener(
    "keydown",
    event => {

        const keyMap = {

            w: "ArrowUp",

            W: "ArrowUp",

            s: "ArrowDown",

            S: "ArrowDown",

            a: "ArrowLeft",

            A: "ArrowLeft",

            d: "ArrowRight",

            D: "ArrowRight"
        };


        const key =
            keyMap[event.key] ||
            event.key;


        if (
            [
                "ArrowUp",
                "ArrowDown",
                "ArrowLeft",
                "ArrowRight"
            ].includes(key)
        ) {

            event.preventDefault();

            changeDirection(key);
        }


        // Phím P để tạm dừng
        if (
            event.key === "p" ||
            event.key === "P"
        ) {

            togglePause();
        }
    }
);


// Nút điều khiển điện thoại
document
    .querySelectorAll(".keyboard button")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                changeDirection(
                    button.dataset.key
                );
            }
        );
    });


// ========================================
// NÚT BẮT ĐẦU
// ========================================

startBtn.addEventListener(
    "click",
    () => {

        if (!gameRunning) {

            startGame();
        }
    }
);


// ========================================
// TẠM DỪNG
// ========================================

function togglePause() {

    if (!gameRunning) return;

    gamePaused = !gamePaused;

    if (gamePaused) {

        pauseBtn.textContent =
            "▶ Tiếp tục";

        statusElement.textContent =
            "⏸ Đã tạm dừng";

        stopMusic();

    } else {

        pauseBtn.textContent =
            "⏸ Tạm dừng";

        statusElement.textContent =
            "Đang chơi...";

        startMusic();
    }
}


pauseBtn.addEventListener(
    "click",
    togglePause
);


// ========================================
// CHƠI LẠI
// ========================================

restartBtn.addEventListener(
    "click",
    () => {

        clearInterval(gameLoop);

        stopMusic();

        gameRunning = false;

        gamePaused = false;

        pauseBtn.textContent =
            "⏸ Tạm dừng";

        startBtn.textContent =
            "▶ Bắt đầu";

        initGame();
    }
);


// ========================================
// TỐC ĐỘ
// ========================================

const speedNames = {

    1: "Rất chậm",

    2: "Chậm",

    3: "Trung bình",

    4: "Nhanh",

    5: "Rất nhanh"
};


speedSlider.addEventListener(
    "input",
    () => {

        speed =
            Number(speedSlider.value);

        speedValue.textContent =
            speedNames[speed];


        if (gameRunning) {

            startLoop();
        }
    }
);


// ========================================
// THAY ĐỔI CHƯỚNG NGẠI VẬT
// ========================================

obstacleSelect.addEventListener(
    "change",
    () => {

        if (!gameRunning) {

            createObstacles();

            createFood();

            drawGame();
        }
    }
);


// ========================================
// NHẠC BẬT / TẮT
// ========================================

musicToggle.addEventListener(
    "change",
    () => {

        if (!musicToggle.checked) {

            stopMusic();

        } else if (gameRunning && !gamePaused) {

            startMusic();
        }
    }
);


// ========================================
// KHỞI ĐỘNG
// ========================================

highScoreElement.textContent =
    highScore;

initGame();
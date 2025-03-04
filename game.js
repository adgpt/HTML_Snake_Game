class SnakeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.scoreElement = document.getElementById('score');
        this.finalScoreElement = document.getElementById('finalScore');
        this.gameOverModal = document.getElementById('gameOver');
        this.restartButton = document.getElementById('restartButton');

        // Sound effects
        this.eatSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
        this.gameOverSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2658/2658-preview.mp3');
        
        // Game settings
        this.difficultyLevel = 'normal';
        this.speedMultiplier = 1;
        this.scoreMultiplier = 1;
        this.powerUpActive = false;
        this.powerUpTimeout = null;
        this.highScore = parseInt(localStorage.getItem('snakeHighScore')) || 0;

        // Set canvas size
        this.canvas.width = 400;
        this.canvas.height = 400;
        this.gridSize = 20;

        // Game state
        this.score = 0;
        this.isPaused = false;
        this.gameLoop = null;
        this.powerUp = null;

        // Initialize event listeners
        this.initializeEventListeners();
        
        // Start the game
        this.startGame();
    }

    initializeEventListeners() {
        // Keyboard controls
        document.addEventListener('keydown', this.handleKeyPress.bind(this));

        // Touch controls
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));

        // Restart button
        this.restartButton.addEventListener('click', () => {
            this.gameOverModal.classList.add('hidden');
            this.startGame();
        });

        // Handle window resize
        window.addEventListener('resize', this.handleResize.bind(this));
        this.handleResize();
    }

    handleResize() {
        const maxSize = Math.min(window.innerWidth - 40, window.innerHeight - 200, 400);
        this.canvas.style.width = `${maxSize}px`;
        this.canvas.style.height = `${maxSize}px`;
    }

    startGame() {
        // Initialize snake
        this.snake = [
            { x: 5, y: 5 },
            { x: 4, y: 5 },
            { x: 3, y: 5 }
        ];
        this.direction = 'right';
        this.nextDirection = 'right';

        // Initialize food
        this.generateFood();

        // Reset score
        this.score = 0;
        this.scoreElement.textContent = '0';

        // Start game loop
        if (this.gameLoop) cancelAnimationFrame(this.gameLoop);
        this.lastRenderTime = 0;
        this.gameLoop = requestAnimationFrame(this.update.bind(this));
    }

    generateFood() {
        const isPowerUp = Math.random() < 0.2; // 20% chance for power-up
        do {
            this.food = {
                x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)),
                y: Math.floor(Math.random() * (this.canvas.height / this.gridSize)),
                type: isPowerUp ? this.getRandomPowerUp() : 'normal'
            };
        } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
    }

    update(currentTime) {
        if (this.isPaused) {
            this.gameLoop = requestAnimationFrame(this.update.bind(this));
            return;
        }

        const secondsSinceLastRender = (currentTime - this.lastRenderTime) / 1000;
        const baseSpeed = this.getBaseSpeed();
        if (secondsSinceLastRender < 1 / (baseSpeed * this.speedMultiplier)) {
            this.gameLoop = requestAnimationFrame(this.update.bind(this));
            return;
        }

        this.lastRenderTime = currentTime;

        if (this.moveSnake()) {
            this.draw();
            this.gameLoop = requestAnimationFrame(this.update.bind(this));
        }
    }

    moveSnake() {
        this.direction = this.nextDirection;
        const head = { ...this.snake[0] };

        switch (this.direction) {
            case 'up': head.y = (head.y - 1 + this.canvas.height / this.gridSize) % (this.canvas.height / this.gridSize); break;
            case 'down': head.y = (head.y + 1) % (this.canvas.height / this.gridSize); break;
            case 'left': head.x = (head.x - 1 + this.canvas.width / this.gridSize) % (this.canvas.width / this.gridSize); break;
            case 'right': head.x = (head.x + 1) % (this.canvas.width / this.gridSize); break;
        }

        // Check for collisions
        if (this.checkCollision(head)) {
            this.gameOver();
            return false;
        }

        this.snake.unshift(head);

        // Check if food is eaten
        if (head.x === this.food.x && head.y === this.food.y) {
            this.eatSound.play();
            this.handleFoodCollision();
            this.generateFood();
        } else {
            this.snake.pop();
        }

        return true;
    }

    checkCollision(head) {
        // Only check for self collision since walls are now passable
        return this.snake.some(segment => segment.x === head.x && segment.y === head.y);
    }

    getBaseSpeed() {
        const speeds = {
            'easy': 8,
            'normal': 10,
            'hard': 15
        };
        return speeds[this.difficultyLevel];
    }

    getRandomPowerUp() {
        const powerUps = ['speed', 'score2x', 'score3x'];
        return powerUps[Math.floor(Math.random() * powerUps.length)];
    }

    handleFoodCollision() {
        const basePoints = 10;
        if (this.food.type === 'normal') {
            this.score += basePoints * this.scoreMultiplier;
        } else {
            this.activatePowerUp(this.food.type);
            this.score += basePoints * 2 * this.scoreMultiplier;
        }
        
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('snakeHighScore', this.highScore);
        }
        
        this.scoreElement.textContent = this.score;
    }

    activatePowerUp(type) {
        clearTimeout(this.powerUpTimeout);
        
        switch(type) {
            case 'speed':
                this.speedMultiplier = 1.5;
                break;
            case 'score2x':
                this.scoreMultiplier = 2;
                break;
            case 'score3x':
                this.scoreMultiplier = 3;
                break;
        }

        this.powerUpActive = true;
        this.powerUpTimeout = setTimeout(() => {
            this.speedMultiplier = 1;
            this.scoreMultiplier = 1;
            this.powerUpActive = false;
        }, 5000);
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#fff';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw power-up effect
        if (this.powerUpActive) {
            this.ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        // Draw snake
        this.snake.forEach((segment, index) => {
            this.ctx.fillStyle = index === 0 ? '#2ecc71' : '#27ae60';
            this.ctx.fillRect(
                segment.x * this.gridSize,
                segment.y * this.gridSize,
                this.gridSize - 1,
                this.gridSize - 1
            );
        });

        // Draw food
        this.ctx.fillStyle = this.food.type === 'normal' ? '#e74c3c' : '#f1c40f';
        this.ctx.beginPath();
        this.ctx.arc(
            this.food.x * this.gridSize + this.gridSize/2,
            this.food.y * this.gridSize + this.gridSize/2,
            this.gridSize/2 - 1,
            0,
            Math.PI * 2
        );
        this.ctx.fill();
    }

    handleKeyPress(event) {
        switch (event.key) {
            case 'ArrowUp':
                if (this.direction !== 'down') this.nextDirection = 'up';
                break;
            case 'ArrowDown':
                if (this.direction !== 'up') this.nextDirection = 'down';
                break;
            case 'ArrowLeft':
                if (this.direction !== 'right') this.nextDirection = 'left';
                break;
            case 'ArrowRight':
                if (this.direction !== 'left') this.nextDirection = 'right';
                break;
            case ' ':
                this.isPaused = !this.isPaused;
                break;
        }
    }

    handleTouchStart(event) {
        const touch = event.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const relativeX = touch.clientX - rect.left;
        const relativeY = touch.clientY - rect.top;

        // Calculate touch position relative to canvas center
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const deltaX = relativeX - centerX;
        const deltaY = relativeY - centerY;

        // Determine direction based on which quadrant was touched
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0 && this.direction !== 'left') {
                this.nextDirection = 'right';
            } else if (deltaX < 0 && this.direction !== 'right') {
                this.nextDirection = 'left';
            }
        } else {
            if (deltaY > 0 && this.direction !== 'up') {
                this.nextDirection = 'down';
            } else if (deltaY < 0 && this.direction !== 'down') {
                this.nextDirection = 'up';
            }
        }

        event.preventDefault();
    }

    gameOver() {
        this.gameOverSound.play();
        this.finalScoreElement.textContent = `${this.score} (High Score: ${this.highScore})`;
        this.gameOverModal.classList.remove('hidden');
        cancelAnimationFrame(this.gameLoop);
    }
}

// Initialize game when the page loads
window.addEventListener('load', () => {
    new SnakeGame();
});
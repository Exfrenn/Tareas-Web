/*
 * Implementation of the game of Breakout
 *
 * Based on Pong implementation by Gilberto Echeverria
 * 2024-04-07
 */

"use strict";

// Global variables
const canvasWidth = 800;
const canvasHeight = 600;

// Variable to store the times for the frames
let oldTime;

// Global settings
const paddleVelocity = 1.0;
const initialSpeed = 0.3;  // Reduced from 0.4 to make the ball slower
const brickRows = 5;
const brickCols = 8;
const brickWidth = 80;
const brickHeight = 20;
const brickPadding = 10;
const brickOffsetTop = 30;
const brickOffsetLeft = 30;
const maxLives = 3;  // Maximum number of lives

// Context of the Canvas
let ctx;

// The game object
let game;

// Class for the Breakout ball
class Ball extends GameObject {
    constructor(position, width, height, color) {
        super(position, width, height, color, "ball");
        this.reset();
    }

    update(deltaTime) {
        // Change the position depending on the velocity
        this.position = this.position.plus(this.velocity.times(deltaTime));
    }

    initVelocity() {
        // Define a random angle in the range [-30⁰, 30⁰] but ensure it goes upward
        const angle = Math.random() * Math.PI / 3 - Math.PI / 6;
        // Obtain the direction of the ball movement
        this.velocity = new Vec(Math.sin(angle), -Math.abs(Math.cos(angle))).times(initialSpeed);
        // Randomly select a direction (left or right)
        this.velocity.x *= Math.random() > 0.5 ? 1 : -1;
        this.inPlay = true;
    }

    reset() {
        this.position = new Vec(canvasWidth / 2, canvasHeight - 50);
        this.velocity = new Vec(0, 0);
        this.inPlay = false;
    }
}

// Class for the Breakout paddle
class Paddle extends GameObject {
    constructor(position, width, height, color) {
        super(position, width, height, color, "paddle");
        this.velocity = new Vec(0, 0);
    }

    update(deltaTime) {
        // Change the position depending on the velocity
        this.position = this.position.plus(this.velocity.times(deltaTime));

        // Constrain the motion to be within the canvas size
        if (this.position.x < 0) {
            this.position.x = 0;
        } else if (this.position.x + this.width > canvasWidth) {
            this.position.x = canvasWidth - this.width;
        }
    }
}

// Class for the bricks
class Brick extends GameObject {
    constructor(position, width, height, color, hitsRequired = 1) {
        super(position, width, height, color, "brick");
        this.active = true;
        this.hitsRequired = hitsRequired;
        this.hitsTaken = 0;
    }

    draw(ctx) {
        if (!this.active) return;

        // Draw main brick
        ctx.fillStyle = this.color;
        ctx.fillRect(this.position.x, this.position.y, this.width, this.height);

        // Draw cracks if the brick has been hit once
        if (this.hitsRequired === 2 && this.hitsTaken === 1) {
            // Calculate darker color for cracks
            const darkerColor = this.getDarkerColor(this.color);
            ctx.strokeStyle = darkerColor;
            ctx.lineWidth = 2;

            // Draw crack pattern
            const crackPattern = [
                // Main diagonal crack
                [0.2, 0.2, 0.8, 0.8],
                // Branching cracks
                [0.3, 0.3, 0.1, 0.5],
                [0.3, 0.3, 0.5, 0.1],
                [0.7, 0.7, 0.9, 0.5],
                [0.7, 0.7, 0.5, 0.9],
                // Small cracks
                [0.4, 0.4, 0.6, 0.4],
                [0.4, 0.6, 0.6, 0.6],
                [0.4, 0.4, 0.4, 0.6],
                [0.6, 0.4, 0.6, 0.6]
            ];

            crackPattern.forEach(pattern => {
                ctx.beginPath();
                ctx.moveTo(
                    this.position.x + pattern[0] * this.width,
                    this.position.y + pattern[1] * this.height
                );
                ctx.lineTo(
                    this.position.x + pattern[2] * this.width,
                    this.position.y + pattern[3] * this.height
                );
                ctx.stroke();
            });
        }
    }

    getDarkerColor(color) {
        // Convert hex to RGB
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);

        // Darken the color by 30%
        const darkerR = Math.max(0, Math.floor(r * 0.7));
        const darkerG = Math.max(0, Math.floor(g * 0.7));
        const darkerB = Math.max(0, Math.floor(b * 0.7));

        // Convert back to hex
        return `#${darkerR.toString(16).padStart(2, '0')}${darkerG.toString(16).padStart(2, '0')}${darkerB.toString(16).padStart(2, '0')}`;
    }
}

// Class that controls all the objects in the game
class Game {
    constructor(canvasWidth, canvasHeight) {
        // Create instances for all objects in the game
        this.ball = new Ball(new Vec(canvasWidth / 2, canvasHeight - 50),
                             20, 20, "#2C3E50");  // Changed to a formal dark blue
        this.paddle = new Paddle(new Vec(canvasWidth / 2 - 50, canvasHeight - 20),
                             100, 10, "#34495E");  // Changed to a formal dark slate
        this.topBorder = new GameObject(new Vec(0, 0), canvasWidth, 10, "#34495E", "barrier");
        this.leftBorder = new GameObject(new Vec(0, 0), 10, canvasHeight, "#34495E", "barrier");
        this.rightBorder = new GameObject(new Vec(canvasWidth - 10, 0), 10, canvasHeight, "#34495E", "barrier");
        this.bottomBorder = new GameObject(new Vec(0, canvasHeight - 10), canvasWidth, 10, "#34495E", "goal");

        this.scoreLabel = new TextLabel(new Vec(10, 30), "24px Arial", "#FFFFFF");
        this.livesLabel = new TextLabel(new Vec(canvasWidth - 200, 30), "24px Arial", "#FFFFFF");
        this.levelLabel = new TextLabel(new Vec(canvasWidth / 2 - 50, 30), "24px Arial", "#FFFFFF");
        this.score = 0;
        this.lives = maxLives;
        this.level = 1;

        // Create the bricks
        this.bricks = [];
        this.createBricks();

        this.createEventListeners();
        this.setupNextLevelButton();
    }

    setupNextLevelButton() {
        const nextLevelButton = document.getElementById('nextLevelButton');
        nextLevelButton.addEventListener('click', () => {
            if (this.level < 3) {
                this.level++;
                this.createBricks();
                this.ball.reset();
                this.updateNextLevelButton();
            }
        });
        this.updateNextLevelButton();
    }

    updateNextLevelButton() {
        const nextLevelButton = document.getElementById('nextLevelButton');
        nextLevelButton.disabled = this.level >= 3;
        nextLevelButton.textContent = this.level < 3 ? `Next Level (${this.level + 1})` : 'Max Level';
    }

    createBricks() {
        this.bricks = []; // Clear existing bricks
        
        if (this.level === 1) {
            // Level 1: Standard pattern with dark colors
            const colors = ["#2C3E50", "#34495E", "#7F8C8D", "#95A5A6", "#BDC3C7"];
            const points = [50, 40, 30, 20, 10];
            
            for (let row = 0; row < brickRows; row++) {
                for (let col = 0; col < brickCols; col++) {
                    const brickX = col * (brickWidth + brickPadding) + brickOffsetLeft;
                    const brickY = row * (brickHeight + brickPadding) + brickOffsetTop;
                    const brick = new Brick(
                        new Vec(brickX, brickY),
                        brickWidth,
                        brickHeight,
                        colors[row]
                    );
                    brick.points = points[row];
                    this.bricks.push(brick);
                }
            }
        } else if (this.level === 2) {
            // Level 2: Checkerboard pattern with dark colors
            const colors = ["#2C3E50", "#34495E", "#7F8C8D", "#95A5A6", "#BDC3C7"];
            const points = [100, 80, 60, 40, 20];
            
            for (let row = 0; row < brickRows; row++) {
                for (let col = 0; col < brickCols; col++) {
                    if ((row + col) % 2 === 0) {
                        const brickX = col * (brickWidth + brickPadding) + brickOffsetLeft;
                        const brickY = row * (brickHeight + brickPadding) + brickOffsetTop;
                        const brick = new Brick(
                            new Vec(brickX, brickY),
                            brickWidth,
                            brickHeight,
                            colors[row]
                        );
                        brick.points = points[row];
                        this.bricks.push(brick);
                    }
                }
            }
        } else if (this.level === 3) {
            // Level 3: Mixed pattern with double-hit bricks
            const colors = ["#2C3E50", "#34495E", "#7F8C8D", "#95A5A6", "#BDC3C7"];
            const points = [150, 120, 90, 60, 30];
            
            for (let row = 0; row < brickRows; row++) {
                for (let col = 0; col < brickCols; col++) {
                    const brickX = col * (brickWidth + brickPadding) + brickOffsetLeft;
                    const brickY = row * (brickHeight + brickPadding) + brickOffsetTop;
                    // Every third brick requires two hits
                    const hitsRequired = (row + col) % 3 === 0 ? 2 : 1;
                    const brick = new Brick(
                        new Vec(brickX, brickY),
                        brickWidth,
                        brickHeight,
                        colors[row],
                        hitsRequired
                    );
                    brick.points = points[row];
                    this.bricks.push(brick);
                }
            }
        }
    }

    update(deltaTime) {
        this.paddle.update(deltaTime);
        this.ball.update(deltaTime);

        // Ball collision with paddle
        if (boxOverlap(this.ball, this.paddle)) {
            // Calculate where the ball hit the paddle
            const hitPoint = (this.ball.position.x - this.paddle.position.x) / this.paddle.width;
            // Angle ranges from -60 to 60 degrees
            const angle = (hitPoint - 0.5) * Math.PI / 1.5;
            this.ball.velocity = new Vec(Math.sin(angle), -Math.cos(angle)).times(initialSpeed);
        }

        // Ball collision with walls
        if (boxOverlap(this.ball, this.leftBorder) || boxOverlap(this.ball, this.rightBorder)) {
            this.ball.velocity.x *= -1;
        }
        if (boxOverlap(this.ball, this.topBorder)) {
            this.ball.velocity.y *= -1;
        }

        // Ball collision with bricks
        for (let i = 0; i < this.bricks.length; i++) {
            const brick = this.bricks[i];
            if (brick.active && boxOverlap(this.ball, brick)) {
                brick.hitsTaken++;
                if (brick.hitsTaken >= brick.hitsRequired) {
                    brick.active = false;
                }
                this.ball.velocity.y *= -1;
                this.score += brick.points * this.level;
                break;
            }
        }

        // Check if ball is lost
        if (boxOverlap(this.ball, this.bottomBorder)) {
            this.lives--;
            if (this.lives <= 0) {
                // Game Over
                this.resetGame();
            } else {
                this.ball.reset();
            }
        }

        // Check if all bricks are destroyed
        if (this.bricks.every(brick => !brick.active)) {
            this.level++;
            if (this.level > 3) {
                this.level = 1; // Loop back to level 1
            }
            this.createBricks();
            this.ball.reset();
        }
    }

    resetGame() {
        this.score = 0;
        this.lives = maxLives;
        this.level = 1;
        this.createBricks();
        this.ball.reset();
    }

    draw(ctx) {
        // Set background color
        ctx.fillStyle = "#1A1A1A";
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw all objects in the game
        this.scoreLabel.draw(ctx, `Score: ${this.score}`);
        this.livesLabel.draw(ctx, `Lives: ${this.lives}`);
        this.levelLabel.draw(ctx, `Level: ${this.level}`);
        this.leftBorder.draw(ctx);
        this.rightBorder.draw(ctx);
        this.topBorder.draw(ctx);
        this.bottomBorder.draw(ctx);
        this.paddle.draw(ctx);
        this.ball.draw(ctx);

        // Draw active bricks
        this.bricks.forEach(brick => {
            if (brick.active) {
                brick.draw(ctx);
            }
        });
    }

    createEventListeners() {
        window.addEventListener('keydown', (event) => {
            if (event.key === "ArrowLeft") {
                this.paddle.velocity.x = -paddleVelocity;
            }
            if (event.key === "ArrowRight") {
                this.paddle.velocity.x = paddleVelocity;
            }
        });

        window.addEventListener('keyup', (event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
                this.paddle.velocity.x = 0;
            }
            if (event.key === " ") {
                if (!this.ball.inPlay) {
                    this.ball.initVelocity();
                }
            }
        });
    }
}

function main() {
    // Get a reference to the object with id 'canvas' in the page
    const canvas = document.getElementById('canvas');
    // Resize the element
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    // Get the context for drawing in 2D
    ctx = canvas.getContext('2d');

    game = new Game(canvasWidth, canvasHeight);

    drawScene(0);
}

function drawScene(newTime) {
    if (oldTime == undefined) {
        oldTime = newTime;
    }
    let deltaTime = newTime - oldTime;

    // Clean the canvas so we can draw everything again
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Update all game objects
    game.update(deltaTime);

    // Draw all game objects
    game.draw(ctx);

    // Update the time for the next frame
    oldTime = newTime;
    requestAnimationFrame(drawScene);
} 
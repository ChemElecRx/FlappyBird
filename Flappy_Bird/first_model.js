//board
let board;
let boardWidth = 360;
let boardHeight = 640;
let context;

//bird
let birdWidth = 34;
let birdHeight = 24;
let birdX = boardWidth / 8;
let birdY = boardHeight / 2;
let birdImg;

//pipes
let pipeArray = [];
let pipeWidth = 64;
let pipeHeight = 512;
let pipeX = boardWidth;
let pipeY = 0;

let topPipeImg;
let bottomPipeImg;

//physics
let velocityX = -1;
let gravity = 0.4;

let gameOver = false;
let score = 0;
let highScore = 0;

// NEAT settings
let neat;
const totalBirds = 5000;
let birds = [];
let savedBirds = [];
let bestBird = null;

function initializeNeat() {
  neat = new neataptic.Neat(
    5,
    1,
    null,
    {
      mutation: neataptic.methods.mutation.ALL,
      popsize: totalBirds,
      mutationRate: 0.3,
      elitism: Math.round(0.1 * totalBirds),
      network: new neataptic.architect.Perceptron(5, 10, 1)
    }
  );

  startEvaluation();
}

function startEvaluation() {
  birds = [];
  for (let genome in neat.population) {
    genome = neat.population[genome];
    birds.push(new Bird(genome));
  }
      // Update the NEAT generation variable
  neat.generation++;
}

function endEvaluation() {
  calculateFitness();
  neat.sort();
  let newPopulation = [];

  for (let i = 0; i < neat.elitism; i++) {
    newPopulation.push(neat.population[i]);
  }

  for (let i = 0; i < neat.popsize - neat.elitism; i++) {
    newPopulation.push(neat.getOffspring());
  }

  neat.population = newPopulation;
  neat.mutate();
  startEvaluation();
}

function calculateFitness() {
  let maxScore = 0;
  for (let bird of savedBirds) {
    bird.calculateFitness();
    if (bird.score > maxScore) {
      maxScore = bird.score;
      bestBird = bird;
    }
  }
}

window.onload = function() {
  board = document.getElementById("board");
  board.height = boardHeight;
  board.width = boardWidth;
  context = board.getContext("2d");

  birdImg = new Image();
  birdImg.src = "./flappybird.png";

  topPipeImg = new Image();
  topPipeImg.src = "./toppipe.png";

  bottomPipeImg = new Image();
  bottomPipeImg.src = "./bottompipe.png";

  birdImg.onload = topPipeImg.onload = bottomPipeImg.onload = function() {
    initializeNeat();
    requestAnimationFrame(update);
    setInterval(placePipes, 3000000000000); //every 3000000000 seconds
  }
}

function update() {
  requestAnimationFrame(update);
  if (gameOver) {
    restartGame();
    return;
  }
  context.clearRect(0, 0, board.width, board.height);

  // Pipes
  for (let i = pipeArray.length - 1; i >= 0; i--) {
    let pipe = pipeArray[i];
    pipe.x += velocityX;
    context.drawImage(pipe.img, pipe.x, pipe.y, pipe.width, pipe.height);
    
        // Add console.log statements here
    //console.log("Pipe X:", pipe.x);
    //console.log("Pipe Y:", pipe.y);

    if (!pipe.passed && pipe.x + pipe.width < birdX) {
      score += 1;
      pipe.passed = true;
    }

    if (pipe.x + pipe.width < 0) {
      pipeArray.splice(i, 1);
    }
  }

  if (Math.random() < 0.02 && pipeArray.length < 3) {
    placePipes();
  }

  // Birds
  for (let i = birds.length - 1; i >= 0; i--) {
    let bird = birds[i];
    bird.think(pipeArray);
    bird.update();
    context.drawImage(birdImg, bird.x, bird.y, bird.width, bird.height);

    // Check collision with pipes
    for (let j = 0; j < pipeArray.length; j++) {
      let pipe = pipeArray[j];
      if (detectCollision(bird, pipe)) {
        birds.splice(i, 1);
        savedBirds.push(bird);
        break; // Exit the loop since the bird has collided with a pipe
      }
    }

    // Check collision with ground (y > board.height) or ceiling (y < 0)
    if (bird.y > board.height || bird.y < 0) {
      birds.splice(i, 1);
      savedBirds.push(bird);
    }
  }

  // Check if all birds have died
  if (birds.length === 0) {
    endEvaluation(); // Trigger the evaluation process
    gameOver = true;
  }

  // Score
  context.fillStyle = "white";
  context.font = "20px sans-serif";
  context.fillText("Score: " + score, 5, 25);

  // Display number of birds alive
  context.fillText("Alive: " + birds.length, 5, 45);

  // Display current generation
  context.fillText("Generation: " + neat.generation, 5, 65);

  if (gameOver) {
    context.font = "45px sans-serif";
    context.fillText("GAME OVER", 5, 90);
  }
}

function placePipes() {
  if (gameOver) {
    return;
  }

  let randomPipeY = pipeY - pipeHeight / 4 - Math.random() * (pipeHeight / 2);
  let openingSpace = board.height / 2;

  let topPipe = {
    img: topPipeImg,
    x: pipeX,
    y: randomPipeY,
    width: pipeWidth,
    height: pipeHeight,
    passed: false
  }
  pipeArray.push(topPipe);

  let bottomPipe = {
    img: bottomPipeImg,
    x: pipeX,
    y: randomPipeY + pipeHeight + openingSpace,
    width: pipeWidth,
    height: pipeHeight,
    passed: false
  }
  pipeArray.push(bottomPipe);
}

// Bird class
class Bird {
  constructor(brain) {
    this.x = birdX;
    this.y = birdY;
    this.width = birdWidth;
    this.height = birdHeight;
    this.gravity = gravity;
    this.velocity = 0;
    this.score = 0;
    this.fitness = 0;

    if (brain) {
      this.brain = brain;
    } else {
      this.brain = neataptic.architect.Perceptron(5, 8, 1);
    }
  }

  think(pipes) {
    let inputs = [];

    inputs[0] = this.y / boardHeight;
    inputs[1] = this.velocity / 10;
    inputs[2] = pipes[0].x / boardWidth;
    inputs[3] = pipes[0].y / boardHeight;
    inputs[4] = (pipes[1].y - pipeHeight) / boardHeight;

    let output = this.brain.activate(inputs);
    if (output[0] > 0.5) {
      this.flap();
    }
  }

  flap() {
    this.velocity = -6;
  }

  update() {
    this.velocity += this.gravity;
    this.y += this.velocity;
    this.score++;
  }

  calculateFitness() {
    this.fitness = this.score;
  }
}

function detectCollision(bird, pipe) {
  return (bird.x < pipe.x + pipe.width &&
    bird.x + bird.width > pipe.x &&
    bird.y < pipe.y + pipe.height &&
    bird.y + bird.height > pipe.y);
}

function restartGame() {
  savedBirds = [];
  score = 0;
  gameOver = false;
  pipeArray = [];
  startEvaluation();
} 
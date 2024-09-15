const socket = new WebSocket('ws://localhost:8080'); // Connect to WebSocket server
let playerNumber;
let playerName = '';
let currentQuestionIndex = 0;
let questions = [];
let score = 0;
let totalQuestions = 0;
let gameCode = '';
let isHost = false; // Track if the player is the host

// Show the appropriate section based on the button clicked
document.getElementById('create-game-btn').addEventListener('click', function () {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('create-game-section').style.display = 'block';
});

document.getElementById('join-game-btn').addEventListener('click', function () {
    document.getElementById('main-menu').style.display = 'none';
    document.getElementById('join-game-section').style.display = 'block';
});

// First player: create game
document.getElementById('create-game').addEventListener('click', function () {
    const numQuestions = parseInt(document.getElementById('num-questions').value);
    playerName = document.getElementById('player-name').value.trim();

    if (numQuestions > 0 && playerName) {
        isHost = true;
        totalQuestions = numQuestions;
        socket.send(JSON.stringify({
            type: 'createGame',
            name: playerName,
            numQuestions: numQuestions
        }));
    }
});

// Second player: join game
document.getElementById('join-game').addEventListener('click', function () {
    gameCode = document.getElementById('game-code').value.trim();
    playerName = document.getElementById('player-name-join').value.trim();

    if (gameCode && playerName) {
        socket.send(JSON.stringify({
            type: 'joinGame',
            gameCode: gameCode,
            name: playerName
        }));
    }
});

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);

    // First player receives the game code
    if (data.type === 'gameCode') {
        gameCode = data.gameCode;
        document.getElementById('game-code-display').innerText = `Your Game Code: ${gameCode}`;
    }

    // Assign player number and update the interface
    if (data.type === 'playerNumber') {
        playerNumber = data.player;
        document.getElementById('result').innerText = `You are Player ${playerNumber}`;
    }

    // Handle the start of the game
    if (data.type === 'startGame') {
        document.getElementById('game-area').style.display = 'block';
        document.getElementById('player1-name').innerText = data.player1Name || '';
        document.getElementById('player2-name').innerText = data.player2Name || '';
        questions = data.questions;
        totalQuestions = questions.length; // Update totalQuestions from received data
        currentQuestionIndex = 0; // Reset question index
        showNextQuestion(); // Display the first question
    }

    // Update progress when a player answers correctly
    if (data.type === 'progressUpdate') {
        updateSnailPosition(data.player, data.progress);
    }

	// Handle game over, show the winner and trigger confetti
	if (data.type === 'gameOver') {
        const winner = data.winnerName ? data.winnerName : "Nobody";  // Fallback in case of undefined
        document.getElementById('result').innerText = `${winner} wins! 🎉`;
        document.getElementById('game-area').style.display = 'none';
        document.getElementById('result-section').style.display = 'block';  // Show result section
        triggerConfetti();  // Trigger confetti effect
    }
};

// Function to display the next question
function showNextQuestion() {
    if (currentQuestionIndex < totalQuestions) {
        const question = questions[currentQuestionIndex];
        document.getElementById('question').innerText = question.question;
        
        const answersDiv = document.getElementById('answers');
        answersDiv.innerHTML = '';

        // Create buttons for each answer
        question.answers.forEach((answer, index) => {
            const button = document.createElement('button');
            button.innerText = answer;
            button.addEventListener('click', function () {
                handleAnswer(index);
            });
            answersDiv.appendChild(button);
        });
    }
}

// Function to handle player answer submission
function handleAnswer(answerIndex) {
    socket.send(JSON.stringify({
        type: 'answer',
        player: playerNumber,
        gameCode: gameCode,
		  questionIndex: currentQuestionIndex,
        answerIndex: answerIndex
    }));
    currentQuestionIndex++;
    showNextQuestion();
}

// Function to update snail positions based on progress
function updateSnailPosition(player, progress) {
    const trackWidth = document.getElementById('snail-race').offsetWidth - 50; // 50px for snail width

    // Move snails based on player progress
    if (player === 1) {
        document.getElementById('snail1').style.left = (progress / totalQuestions) * trackWidth + 'px';
    } else if (player === 2) {
        document.getElementById('snail2').style.left = (progress / totalQuestions) * trackWidth + 'px';
    }
}


// Function to trigger confetti effect
function triggerConfetti() {
    var duration = 0.5 * 1000;
    var end = Date.now() + duration;

    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
        });
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
        });

        if (Date.now() < end) {
            requestAnimationFrame(frame);
        }
    }());
}


// Initialize the page and set up the game area
function init() {
    document.getElementById('game-area').style.display = 'none';  // Hide game area until start
    document.getElementById('main-menu').style.display = 'block';  // Show main menu
}

window.onload = init;


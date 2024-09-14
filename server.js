const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

let games = {}; // Store games as { gameCode: { players: {...}, questions: [...], gameStarted: false } }

let predefinedQuestions = [
    { question: "What does 'olla' mean?", answers: ["To be", "To go", "To eat"], correct: 0 },
    { question: "What does 'tehdä' mean?", answers: ["To do", "To drink", "To sleep"], correct: 0 },
    { question: "What does 'mennä' mean?", answers: ["To go", "To come", "To write"], correct: 0 },
    { question: "What does 'tulla' mean?", answers: ["To stay", "To eat", "To come"], correct: 2 },
    { question: "What does 'antaa' mean?", answers: ["To give", "To run", "To see"], correct: 0 },
    { question: "What does 'sanoa' mean?", answers: ["To say", "To hear", "To arrive"], correct: 0 },
    { question: "What does 'nähdä' mean?", answers: ["To see", "To sleep", "To read"], correct: 0 },
    { question: "What does 'syödä' mean?", answers: ["To drink", "To eat", "To dance"], correct: 1 },
    { question: "What does 'juoda' mean?", answers: ["To sleep", "To read", "To drink"], correct: 2 },
    { question: "What does 'puhua' mean?", answers: ["To talk", "To cook", "To swim"], correct: 0 }
];

// Generate a random 5-character game code
function generateGameCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase(); // e.g., "3HJ9A"
}

// Broadcast a message to all players in a game
function broadcast(gameCode, data) {
    const game = games[gameCode];
    if (!game) return;
    Object.values(game.players).forEach(player => {
        if (player.ws.readyState === WebSocket.OPEN) {
            player.ws.send(JSON.stringify(data));
        }
    });
}

// Start the game for both players
function startGame(gameCode) {
    const game = games[gameCode];
    if (Object.keys(game.players).length === 2 && !game.gameStarted) {
        game.gameStarted = true;
        game.currentQuestionIndex = 0;
        console.log(`Game ${gameCode}: Both players connected. Starting the game...`);
        
        // Notify both players that the game has started and send questions
        broadcast(gameCode, {
            type: 'startGame',
            player1Name: game.players[1].name,
            player2Name: game.players[2].name,
            questions: game.questions // Send questions to both players
        });
        
        checkGameEnd(gameCode);
    }
}

// Ask the next question in the game
function checkGameEnd(gameCode) {
    const game = games[gameCode];
    if (game.currentQuestionIndex < game.totalQuestions) {
		// Continue playing, no players have finished
/*
        broadcast(gameCode, {
            type: 'newQuestion',
            question: game.questions[game.currentQuestionIndex]
        });
*/
    } else {
        endGame(gameCode);
    }
}

// Determine the winner of the game
function determineWinner(gameCode) {
    const game = games[gameCode];
    const player1 = game.players[1];
    const player2 = game.players[2];

    if (player1.score > player2.score) {
        return player1.name;
    } else if (player2.score > player1.score) {
        return player2.name;
    }
    return 'Tie';
}

// End the game and announce the winner
function endGame(gameCode) {
    const winnerName = determineWinner(gameCode);
    console.log(`Game ${gameCode}: Game over. Winner: ${winnerName}`);
    broadcast(gameCode, {
        type: 'gameOver',
        winnerName: winnerName
    });
    delete games[gameCode]; // Remove the game after it ends
}

// WebSocket connection setup
wss.on('connection', function (ws) {
    console.log('A player connected.');

    ws.on('message', function (message) {
        const data = JSON.parse(message);
		  console.log('Message received from client:', data);

        // First player creates a game
        if (data.type === 'createGame') {
            const gameCode = generateGameCode();
            games[gameCode] = {
                players: { 1: { ws, name: data.name, score: 0 } },
                questions: predefinedQuestions, // Use predefined questions here
                totalQuestions: data.numQuestions,
                gameStarted: false
            };
				ws.send(JSON.stringify({ type: 'playerNumber', player: 1}));
            console.log(`Game created with code: ${gameCode}`);
            ws.send(JSON.stringify({ type: 'gameCode', gameCode }));
        }

        // Second player joins a game using the game code
        if (data.type === 'joinGame') {
            const game = games[data.gameCode];
            if (game && Object.keys(game.players).length === 1) {
                game.players[2] = { ws, name: data.name, score: 0 };
                console.log(`Player 2 joined game ${data.gameCode}`);

					 // Notify the player of their player number
                ws.send(JSON.stringify({ type: 'playerNumber', player: 2}));
                startGame(data.gameCode);
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Invalid game code or game already full.' }));
            }
        }

		  // Handle starting the game by the host
        if (data.type === 'startGame') {
            const game = games[data.gameCode];
            if (game && game.players[1] && game.players[2]) {
                startGame(data.gameCode);
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'Cannot start game. Both players are not present.' }));
            }
        }

		// Handle player's answer
    if (data.type === 'answer') {
        const game = games[data.gameCode];
        if (!game) return;

        const player = game.players[data.player];
        if (!player) {
            console.error(`Player ${data.player} not found in game ${data.gameCode}`);
            return;
        }

        if (game.questions[data.questionIndex].correct === data.answerIndex) {
            player.score++;
        }

        // Update the player's progress
        broadcast(data.gameCode, {
            type: 'progressUpdate',
            player: data.player,
            progress: player.score
        });

        // Move to the next question
        game.currentQuestionIndex = Math.max(game.currentQuestionIndex, ++data.questionIndex);
        console.log(`currentQuestionIndexIs: ${game.currentQuestionIndex}`);
        checkGameEnd(data.gameCode);
    }
    });

    // Handle player disconnecting
    ws.on('close', function () {
        console.log('A player disconnected.');
    });
});


// DOM Elements
const quizContainer = document.getElementById('quiz');
const resultsContainer = document.getElementById('results');
const submitButton = document.getElementById('submit');
const timerDisplay = document.getElementById('timer');
const timeSpan = document.getElementById('time');
const progressFill = document.getElementById('progress-fill');
const currentQuestionSpan = document.getElementById('current-question');
const totalQuestionsSpan = document.getElementById('total-questions');
const playerNameSpan = document.getElementById('player-name');
const hintContainer = document.getElementById('hint-container');
const hintContent = document.querySelector('.hint-content');
const getHintButton = document.getElementById('get-hint');
const restartQuizButton = document.getElementById('restart-quiz');
const shareResultsButton = document.getElementById('share-results');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalBody = document.getElementById('modal-body');
const modalConfirm = document.getElementById('modal-confirm');
const modalCancel = document.getElementById('modal-cancel');
const closeModal = document.querySelector('.close');

// Quiz state
let currentQuestionIndex = 0;
let score = 0;
let timer;
let hintsUsed = 0;
const maxHints = 3;
const timeLimit = 15;

// Create the socket connection with fallback handling
const socket = io(window.location.hostname.includes('localhost') 
    ? 'http://localhost:5000' 
    : 'http://10.33.75.205:5000', {
    reconnectionAttempts: 3,
    timeout: 10000
});

// Debug helpers and error handling
console.log('Quiz.js initialized');

// Socket connection status handling
socket.on('connect', () => {
    console.log('Socket connected with ID:', socket.id);
    showToast('Connected to game server!');
});

socket.on('connect_error', (error) => {
    console.error('Socket connection error:', error);
    showToast('Connection issue. Using fallback mode...');
    
    // If we can't connect to the socket, try loading questions directly
    setTimeout(() => {
        if (!window.quizQuestions) {
            initializeWithFallback();
        }
    }, 2000);
});

// Emergency fallback initialization if socket fails
async function initializeWithFallback() {
    console.log('Initializing with fallback method');
    const questions = await fetchQuestionsDirectly();
    if (questions && questions.length > 0) {
        window.quizQuestions = questions;
        currentQuestionIndex = 0;
        displayQuestion(window.quizQuestions[currentQuestionIndex]);
        startTimer();
        
        // Initialize scoreboard manually
        initializeScoreboard();
    } else {
        showModal('Error', 'Could not load questions. Please try again later.');
    }
}

// Listen for session questions
socket.on('sessionQuestions', (data) => {
    console.log('Received session questions:', data);
    if (data.questions && data.questions.length > 0) {
        window.quizQuestions = data.questions;
        
        // Update total questions count
        if (totalQuestionsSpan) {
            totalQuestionsSpan.textContent = data.questions.length;
        }
        
        // Start from the given question index or from beginning
        currentQuestionIndex = data.currentQuestionIndex || 0;
        
        // Display the current question
        displayQuestion(window.quizQuestions[currentQuestionIndex]);
        startTimer();
    } else {
        console.error('Received empty or invalid questions data');
    }
});

// Listen for session updates
socket.on('sessionUpdate', (data) => {
    console.log('Received session update:', data);
    if (data.scores && Array.isArray(data.scores)) {
        updateFullScoreboard(data.scores);
    }
});

// Add this function to initialize the scoreboard
function initializeScoreboard() {
    const scoreboardList = document.getElementById('scoreboard-list');
    if (scoreboardList) {
        // Add the current player to the scoreboard initially
        const playerName = localStorage.getItem("playerName") || "Guest";
        scoreboardList.innerHTML = `
            <li class="current-player">
                <span class="rank">1</span>
                <span class="player-name">${playerName} (You)</span>
                <span class="score">0</span>
            </li>
        `;
    } else {
        console.error('Scoreboard list element not found');
    }
}

// Add fallback function to fetch questions directly
async function fetchQuestionsDirectly() {
    const difficulty = localStorage.getItem("difficulty") || "medium";
    const category = localStorage.getItem("category") || "all";
    const questionCount = parseInt(localStorage.getItem("questionCount") || "10");
    
    console.log(`Directly fetching ${questionCount} questions (${difficulty} difficulty, ${category} category)`);
    
    // Adapt URL based on environment - try multiple endpoints as fallback
    const endpoints = [
        `http://10.33.75.205:5000/api/game/questions?difficulty=${difficulty}&category=${category}`,
        `http://localhost:5000/api/game/questions?difficulty=${difficulty}&category=${category}`,
        'data/questions.json'
    ];
    
    // Try each endpoint until one works
    for (const endpoint of endpoints) {
        try {
            console.log(`Trying to fetch from: ${endpoint}`);
            const response = await fetch(endpoint);
            
            if (!response.ok) {
                console.warn(`Endpoint ${endpoint} returned ${response.status}`);
                continue;
            }
            
            const data = await response.json();
            console.log('Data received:', data);
            
            // Handle different response formats
            let questions;
            if (data.questions && Array.isArray(data.questions)) {
                questions = data.questions;
            } else if (Array.isArray(data)) {
                questions = data;
            } else {
                continue;
            }
            
            if (questions.length > 0) {
                // Shuffle and limit questions
                const shuffled = shuffleArray([...questions]);
                return shuffled.slice(0, questionCount);
            }
        } catch (error) {
            console.warn(`Failed to fetch from ${endpoint}:`, error);
        }
    }
    
    // If all else fails, use hardcoded questions
    console.log('Using hardcoded questions as last resort');
    return getHardcodedQuestions();
}

// Provide hardcoded questions as ultimate fallback
function getHardcodedQuestions() {
    return [
        {
            question: "Quelle est la capitale de la France?",
            options: ["Paris", "Londres", "Berlin", "Madrid"],
            answer: "Paris",
            category: "geography"
        },
        {
            question: "Qui a peint la Joconde?",
            options: ["Picasso", "Van Gogh", "Leonard de Vinci", "Michel-Ange"],
            answer: "Leonard de Vinci",
            category: "arts"
        },
        {
            question: "Quelle est la plus grande planète du système solaire?",
            options: ["Terre", "Mars", "Jupiter", "Saturne"],
            answer: "Jupiter",
            category: "science"
        },
        {
            question: "En quelle année a eu lieu la Révolution française?",
            options: ["1789", "1815", "1755", "1801"],
            answer: "1789",
            category: "history"
        },
        {
            question: "Quel est le plus long fleuve du monde?",
            options: ["Amazone", "Nil", "Mississippi", "Yangtsé"],
            answer: "Nil",
            category: "geography"
        }
    ];
}

// Main initialization when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM loaded. Initializing quiz...');
    
    // Debug which elements were found
    console.log('Quiz container found:', !!quizContainer);
    console.log('Results container found:', !!resultsContainer);
    console.log('Submit button found:', !!submitButton);
    console.log('Player name span found:', !!playerNameSpan);
    
    // Check for session ID in URL parameters (for direct joining)
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    
    if (sessionParam) {
        // Store the session ID from URL parameter
        localStorage.setItem("sessionId", sessionParam);
        
        // Remove the session parameter from URL (cleaner appearance)
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
        
        showToast('Joined shared session!');
    }
    
    // Set player name in UI
    const playerName = localStorage.getItem("playerName") || "Guest";
    if (playerNameSpan) {
        playerNameSpan.textContent = playerName;
        console.log(`Set player name to: ${playerName}`);
    } else {
        console.error('Player name span not found in DOM');
    }
    
    // Check if user is a spectator
    const isSpectator = localStorage.getItem("isSpectator") === "true";
    
    // Get quiz preferences from localStorage
    const difficulty = localStorage.getItem("difficulty") || "medium";
    const category = localStorage.getItem("category") || "all";
    const questionCount = parseInt(localStorage.getItem("questionCount") || "10");
    
    // Get the session ID from localStorage
    const sessionId = localStorage.getItem("sessionId") || generateFallbackSessionId();
    console.log(`Using session ID: ${sessionId}`);
    
    // Create session info display
    displaySessionInfo();
    
    if (isSpectator) {
        console.log(`${playerName} is spectating session: ${sessionId}`);
        
        // Join as spectator
        socket.emit('spectateSession', { 
            sessionId, 
            userId: playerName
        });
        
        // Disable answering UI for spectators
        if (submitButton) submitButton.disabled = true;
        if (submitButton) submitButton.style.opacity = "0.5";
        if (getHintButton) getHintButton.disabled = true;
        if (getHintButton) getHintButton.style.opacity = "0.5";
        
        // Add spectator badge
        const spectatorBadge = document.createElement('div');
        spectatorBadge.className = 'spectator-badge';
        spectatorBadge.innerHTML = '<i class="fas fa-eye"></i> Spectator Mode';
        document.querySelector('.quiz-container').prepend(spectatorBadge);
        
        // Apply visual indicator for spectator mode
        document.querySelector('.quiz-container').style.border = '2px solid rgba(155, 89, 182, 0.5)';
    } else {
        // Join as player
        console.log(`Starting quiz for player: ${playerName} with session: ${sessionId}`);
        
        // Join the session and include preferences
        socket.emit('joinSession', { 
            sessionId, 
            userId: playerName,
            difficulty,
            category,
            questionCount
        });
    }
    
    // Initialize UI elements
    initializeScoreboard();
    
    // Set a timer to fetch questions directly if they don't arrive via socket
    const questionsTimeout = setTimeout(async () => {
        if (!window.quizQuestions) {
            console.log('No questions received via socket after timeout, fetching directly...');
            initializeWithFallback();
        } else {
            console.log('Questions already loaded via socket');
        }
    }, 5000); // Wait 5 seconds before trying direct fetch
    
    // Clear the timeout if questions are received via socket
    socket.on('sessionQuestions', () => {
        clearTimeout(questionsTimeout);
    });
    
    // Force-reload the page if nothing appears after 10 seconds
    setTimeout(() => {
        if (!document.querySelector('#quiz h2') && !window.hasReloaded) {
            console.log('Quiz content not loaded after 10 seconds, reloading page...');
            window.hasReloaded = true;
            window.location.reload();
        }
    }, 10000);
});

// Add spectator event listeners
socket.on('spectatorJoined', (data) => {
    // Update spectator count in the UI
    updateSpectatorCount(data.spectatorCount);
    
    // Show notification about new spectator
    const notification = document.createElement('div');
    notification.className = `player-notification spectator`;
    notification.innerHTML = `<i class="fas fa-eye"></i> ${data.userId} is now spectating`;
    document.querySelector('.quiz-container').appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => notification.remove(), 3000);
});

// Add event listener for restart button
document.getElementById('restart-quiz')?.addEventListener('click', () => {
    console.log('Restart button clicked');
    restartQuiz();
});

// Update spectator count
function updateSpectatorCount(count) {
    let spectatorCounter = document.getElementById('spectator-count');
    if (!spectatorCounter) {
        // Create spectator counter if it doesn't exist
        const sessionInfo = document.getElementById('session-info');
        if (sessionInfo) {
            spectatorCounter = document.createElement('p');
            spectatorCounter.id = 'spectator-count';
            spectatorCounter.className = 'spectator-count';
            sessionInfo.appendChild(spectatorCounter);
        }
    }
    
    if (spectatorCounter) {
        spectatorCounter.innerHTML = `<i class="fas fa-eye"></i> Spectators: ${count}`;
    }
}

// Function to handle full scoreboard updates
function updateFullScoreboard(scores) {
    console.log('Updating full scoreboard with scores:', scores);
    const scoreboardList = document.getElementById('scoreboard-list');
    if (!scoreboardList) {
        console.error('Scoreboard list element not found');
        return;
    }
    
    // Validate scores array
    if (!Array.isArray(scores) || scores.length === 0) {
        console.warn('No valid scores to display');
        return;
    }
    
    // Clear the current scoreboard
    scoreboardList.innerHTML = '';
    
    // Sort scores by score value (highest first)
    const sortedScores = [...scores].sort((a, b) => b.score - a.score);
    const currentPlayer = localStorage.getItem("playerName") || "Guest";
    
    // Add each player to the scoreboard
    sortedScores.forEach((scoreData, index) => {
        if (!scoreData.playerName) {
            console.warn('Skipping score entry without playerName', scoreData);
            return;
        }
        
        const playerEntry = document.createElement('li');
        playerEntry.id = `player-${scoreData.playerName}`;
        
        // Highlight the current player
        const isCurrentPlayer = scoreData.playerName === currentPlayer;
        if (isCurrentPlayer) {
            playerEntry.classList.add('current-player');
        }
        
        // Add rank number and handle ties
        let rank = index + 1;
        if (index > 0 && sortedScores[index-1].score === scoreData.score) {
            const previousRankElement = scoreboardList.lastChild.querySelector('.rank');
            if (previousRankElement) {
                rank = parseInt(previousRankElement.textContent);
            }
        }
        
        playerEntry.innerHTML = `
            <span class="rank">${rank}</span>
            <span class="player-name">${scoreData.playerName}${isCurrentPlayer ? ' (You)' : ''}</span>
            <span class="score">${scoreData.score}</span>
        `;
        scoreboardList.appendChild(playerEntry);
    });
}

// Creates and displays session info
function displaySessionInfo() {
    const sessionId = localStorage.getItem("sessionId");
    if (sessionId) {
        // Create a session info div if it doesn't exist
        let sessionInfo = document.getElementById('session-info');
        if (!sessionInfo) {
            sessionInfo = document.createElement('div');
            sessionInfo.id = 'session-info';
            sessionInfo.className = 'session-info';
            
            const quizContainer = document.querySelector('.quiz-container');
            const header = document.querySelector('header');
            
            if (quizContainer && header) {
                quizContainer.insertBefore(sessionInfo, header.nextSibling);
            } else {
                console.error('Quiz container or header not found');
                return;
            }
        }
        
        sessionInfo.innerHTML = `
            <p>Session Code: <strong>${sessionId}</strong></p>
            <p>Share this code with friends to play together or spectate!</p>
        `;
        
        // Add spectator count if not exists
        if (!document.getElementById('spectator-count')) {
            const spectatorCounter = document.createElement('p');
            spectatorCounter.id = 'spectator-count';
            spectatorCounter.className = 'spectator-count';
            spectatorCounter.innerHTML = `<i class="fas fa-eye"></i> Spectators: 0`;
            sessionInfo.appendChild(spectatorCounter);
        }
        
        // Add a spectator link to session info for sharing
        const spectateLink = document.createElement('p');
        spectateLink.className = 'spectate-link';
        spectateLink.innerHTML = `<button id="copy-spectate-link" class="btn btn-small">
            <i class="fas fa-copy"></i> Copy Spectator Link
        </button>`;
        sessionInfo.appendChild(spectateLink);
        
        // Add copy functionality
        document.getElementById('copy-spectate-link')?.addEventListener('click', () => {
            const currentUrl = window.location.origin;
            const spectateUrl = `${currentUrl}/index.html?spectate=${sessionId}`;
            
            navigator.clipboard.writeText(spectateUrl).then(() => {
                showToast('Spectator link copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy:', err);
                showToast('Failed to copy link');
            });
        });
    }
}

// Function to restart the quiz
function restartQuiz() {
    // Reset quiz state
    currentQuestionIndex = 0;
    score = 0;
    hintsUsed = 0;
    
    // Hide results section
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
    }
    
    // Show quiz elements
    if (quizContainer) {
        quizContainer.style.display = 'flex';
    }
    
    const timerContainer = document.querySelector('.timer-container');
    if (timerContainer) {
        timerContainer.style.display = 'block';
    }
    
    const buttonGroup = document.querySelector('.button-group');
    if (buttonGroup) {
        buttonGroup.style.display = 'flex';
    }
    
    // Hide quiz controls
    const quizControls = document.querySelector('.quiz-controls');
    if (quizControls) {
        quizControls.style.display = 'none';
    }
    
    // Create a new session
    const playerName = localStorage.getItem("playerName") || "Guest";
    const sessionId = generateFallbackSessionId();
    localStorage.setItem("sessionId", sessionId);
    
    // Get quiz preferences
    const difficulty = localStorage.getItem("difficulty") || "medium";
    const category = localStorage.getItem("category") || "all";
    const questionCount = parseInt(localStorage.getItem("questionCount") || "10");
    
    console.log(`Restarting quiz for player: ${playerName} with new session: ${sessionId}`);
    
    // Join session with preferences
    socket.emit('joinSession', { 
        sessionId, 
        userId: playerName,
        difficulty,
        category,
        questionCount
    });
    
    // Initialize UI
    initializeScoreboard();
    displaySessionInfo();
}

// Generate session ID if one doesn't exist
function generateFallbackSessionId() {
    const characters = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Removed confusing chars
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    console.log('Generated fallback session ID:', result);
    return result;
}

// Handle question display
function displayQuestion(question) {
    console.log('Displaying question:', question);
    
    if (!question) {
        console.error('No question to display');
        return;
    }
    
    if (!quizContainer) {
        console.error('Quiz container not found');
        return;
    }
    
    try {
        // Update progress bar
        const totalQuestions = window.quizQuestions ? window.quizQuestions.length : 10;
        const progress = ((currentQuestionIndex + 1) / totalQuestions) * 100;
        
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
        }
        
        // Update question counter
        if (currentQuestionSpan) currentQuestionSpan.textContent = currentQuestionIndex + 1;
        if (totalQuestionsSpan) totalQuestionsSpan.textContent = totalQuestions;
        
        // Update player name if not set already
        if (playerNameSpan && !playerNameSpan.textContent) {
            playerNameSpan.textContent = localStorage.getItem("playerName") || "Guest";
        }
        
        // Make sure question has options
        if (!question.options || !Array.isArray(question.options) || question.options.length < 2) {
            console.warn('Question has no options, using defaults');
            question.options = ['Option 1', 'Option 2', 'Option 3', 'Option 4'];
            if (!question.answer) question.answer = 'Option 1';
        }
        
        // Shuffle the answer options
        const shuffledOptions = shuffleArray([...question.options]);
        
        // Store the shuffled options on the window object for later reference
        window.currentShuffledOptions = shuffledOptions;
        
        quizContainer.innerHTML = `
            <h2 id="question">${question.question}</h2>
            <ul>
                ${shuffledOptions.map((option, index) => `
                    <li>
                        <input type="radio" name="answer" value="${option}" id="option${index}">
                        <label for="option${index}">${option}</label>
                    </li>
                `).join('')}
            </ul>
        `;
        
        // Handle hints
        if (hintContainer) {
            hintContainer.style.display = 'none';
            hintContainer.classList.remove('visible');
        }
        
        // Update hint button
        if (getHintButton) {
            getHintButton.innerHTML = `<i class="fas fa-lightbulb"></i> Obtenir un indice`;
            getHintButton.disabled = hintsUsed >= maxHints;
        }
        
        // Emit event to synchronize with other players
        const sessionId = localStorage.getItem("sessionId");
        if (sessionId) {
            socket.emit('startQuizQuestion', {
                sessionId,
                questionIndex: currentQuestionIndex,
                question
            });
        }
    } catch (error) {
        console.error('Error displaying question:', error);
        showToast('Error displaying question. Please try again.');
    }
}

// Handle get hint button click
if (getHintButton) {
    getHintButton.addEventListener('click', async () => {
        if (hintsUsed >= maxHints) {
            showModal('Limite d\'indices atteinte', 'Vous avez utilisé tous vos indices disponibles.');
            return;
        }
        
        if (!window.quizQuestions || !window.quizQuestions[currentQuestionIndex]) {
            showModal('Erreur', 'Impossible de générer un indice pour cette question.');
            return;
        }
        
        hintsUsed++;
        getHintButton.innerHTML = `<i class="fas fa-lightbulb"></i> Indices utilisés: ${hintsUsed}/${maxHints}`;
        
        if (hintsUsed >= maxHints) {
            getHintButton.disabled = true;
        }
        
        const question = window.quizQuestions[currentQuestionIndex].question;
        
        // Show loading state
        hintContainer.classList.add('visible');
        hintContainer.style.display = 'flex';
        hintContent.textContent = 'Génération de l\'indice...';
        
        try {
            // Try multiple endpoints in case one fails
            let hintData = null;
            const endpoints = [
                'http://10.33.75.205:5000/api/ai/generate-hint',
                'http://localhost:5000/api/ai/generate-hint'
            ];
            
            for (const endpoint of endpoints) {
                try {
                    const response = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ question }),
                    });
                    
                    if (response.ok) {
                        hintData = await response.json();
                        break;
                    }
                } catch (err) {
                    console.warn(`Failed to get hint from ${endpoint}:`, err);
                }
            }
            
            if (hintData && hintData.hint) {
                hintContent.textContent = hintData.hint;
            } else {
                // Fallback hint
                hintContent.textContent = 'Relisez attentivement la question et considérez toutes les réponses possibles.';
            }
        } catch (error) {
            console.error('Error getting hint:', error);
            hintContent.textContent = 'Impossible de générer un indice. Essayez à nouveau.';
        }
    });
}

// Add handler for when other players move to a question
socket.on('quizQuestionStarted', (data) => {
    // Only update if we're not the one who sent this event
    if (data.questionIndex !== currentQuestionIndex) {
        currentQuestionIndex = data.questionIndex;
        displayQuestion(data.question);
        startTimer(); // Restart the timer
    }
});

// Listen for player joined events
socket.on('playerJoined', (data) => {
    // Update player count in the UI
    updatePlayerCount();
    
    // Show notification about new player
    const notification = document.createElement('div');
    notification.className = `player-notification join`;
    notification.innerHTML = `<i class="fas fa-user-plus"></i> ${data.userId} joined the game`;
    document.querySelector('.quiz-container')?.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => notification.remove(), 3000);
});

// Function to update player count
function updatePlayerCount() {
    const playerCountElement = document.getElementById('player-count');
    if (playerCountElement) {
        const sessionId = localStorage.getItem("sessionId");
        // Request current player count from server
        socket.emit('getSessionInfo', { sessionId });
    }
}

// Add handler for when other players answer
socket.on('playerAnswered', (data) => {
    // Show a notification about the other player's answer
    const { userId, isCorrect } = data;
    
    const notification = document.createElement('div');
    notification.className = `player-answer ${isCorrect ? 'correct' : 'incorrect'}`;
    notification.innerHTML = `<i class="fas fa-${isCorrect ? 'check' : 'times'}-circle"></i> ${userId} answered ${isCorrect ? 'correctly' : 'incorrectly'}`;
    document.querySelector('.quiz-container')?.appendChild(notification);
    
    // Remove the notification after 3 seconds
    setTimeout(() => notification.remove(), 3000);
});

// Handle answer submission
if (submitButton) {
    submitButton.addEventListener('click', () => {
        const selectedOption = document.querySelector('input[name="answer"]:checked');
        if (selectedOption) {
            const answer = selectedOption.value;
            checkAnswer(answer);
            currentQuestionIndex++;
            if (window.quizQuestions && currentQuestionIndex < window.quizQuestions.length) {
                displayQuestion(window.quizQuestions[currentQuestionIndex]);
                startTimer();
            } else {
                clearInterval(timer);
                showResults();
            }
        } else {
            showModal('Selection requise', 'Veuillez sélectionner une réponse avant de continuer.');
        }
    });
}

// Check the selected answer
function checkAnswer(answer) {
    if (!window.quizQuestions || !window.quizQuestions[currentQuestionIndex]) {
        console.error('No current question to check answer against');
        return;
    }
    
    const currentQuestion = window.quizQuestions[currentQuestionIndex];
    const playerName = localStorage.getItem("playerName") || "Guest";
    const sessionId = localStorage.getItem("sessionId") || "fallback-session";

    if (answer === currentQuestion.answer) {
        score++;
        
        // Create a notification for correct answer
        const feedback = document.createElement('div');
        feedback.className = 'answer-feedback correct';
        feedback.innerHTML = `<i class="fas fa-check-circle"></i> Bonne réponse !`;
        document.querySelector('.quiz-container')?.appendChild(feedback);
        
        // Remove the notification after 2 seconds
        setTimeout(() => feedback.remove(), 2000);
        
        // Update score locally
        updateScoreboard(playerName, score);
        
        // Update score on server
        socket.emit('updateScore', { 
            sessionId, 
            playerName, 
            playerScore: score 
        });
        
        // Also notify other players
        socket.emit('answerSelected', {
            sessionId,
            userId: playerName,
            questionIndex: currentQuestionIndex,
            selectedOption: answer,
            isCorrect: true
        });
    } else {
        // Create a notification for incorrect answer
        const feedback = document.createElement('div');
        feedback.className = 'answer-feedback incorrect';
        feedback.innerHTML = `<i class="fas fa-times-circle"></i> Mauvaise réponse. La bonne réponse était : ${currentQuestion.answer}`;
        document.querySelector('.quiz-container')?.appendChild(feedback);
        
        // Remove the notification after 2 seconds
        setTimeout(() => feedback.remove(), 2000);
        
        // Notify other players
        socket.emit('answerSelected', {
            sessionId,
            userId: playerName,
            questionIndex: currentQuestionIndex,
            selectedOption: answer,
            isCorrect: false
        });
    }
}

// Show modal dialog
function showModal(title, message) {
    if (!modal || !modalTitle || !modalBody) {
        console.error('Modal elements not found');
        alert(`${title}: ${message}`); // Fallback to alert
        return;
    }
    
    modalTitle.textContent = title;
    modalBody.textContent = message;
    modal.style.display = 'block';
    
    // Close modal handlers
    if (closeModal) {
        closeModal.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    if (modalCancel) {
        modalCancel.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    if (modalConfirm) {
        modalConfirm.onclick = () => {
            modal.style.display = 'none';
        };
    }
    
    window.onclick = (event) => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    };
}

// Timer function for each question
function startTimer() {
    if (!timerDisplay || !timeSpan) {
        console.error('Timer elements not found');
        return;
    }
    
    clearInterval(timer);

    let timeLeft = timeLimit;
    timeSpan.textContent = timeLeft;
    timerDisplay.classList.remove('warning');

    timer = setInterval(() => {
        timeLeft--;
        timeSpan.textContent = timeLeft;
        
        if (timeLeft <= 5) {
            timerDisplay.classList.add('warning');
        }

        if (timeLeft <= 0) {
            clearInterval(timer);
            showModal('Temps écoulé !', 'Vous avez dépassé le temps imparti pour cette question.');
            
            currentQuestionIndex++;
            if (window.quizQuestions && currentQuestionIndex < window.quizQuestions.length) {
                displayQuestion(window.quizQuestions[currentQuestionIndex]);
                startTimer();
            } else {
                showResults();
            }
        }
    }, 1000);
}

// Show results after quiz completion
function showResults() {
    if (!resultsContainer) {
        console.error('Results container not found');
        showModal('Quiz Completed', `Your score: ${score}`);
        return;
    }
    
    const playerName = localStorage.getItem("playerName") || "Guest";
    const totalQuestions = window.quizQuestions ? window.quizQuestions.length : 0;
    const percentage = totalQuestions > 0 ? Math.round((score / totalQuestions) * 100) : 0;
    
    let resultMessage = '';
    let resultEmoji = '';
    
    if (percentage >= 90) {
        resultMessage = 'Excellent ! Vous êtes un expert en culture générale !';
        resultEmoji = '🌟';
    } else if (percentage >= 70) {
        resultMessage = 'Très bien ! Vous avez une bonne culture générale !';
        resultEmoji = '👍';
    } else if (percentage >= 50) {
        resultMessage = 'Bien ! Continuez à enrichir votre culture générale !';
        resultEmoji = '💪';
    } else {
        resultMessage = 'Continuez à apprendre ! La culture générale s\'enrichit avec le temps !';
        resultEmoji = '📚';
    }
    
    // Request updated session data for final results
    const sessionId = localStorage.getItem("sessionId");
    socket.emit('getSessionInfo', { sessionId });
    
    resultsContainer.innerHTML = `
        <h2>${resultEmoji} Quiz terminé ! ${resultEmoji}</h2>
        <p>${playerName}, votre score : ${score} sur ${totalQuestions} (${percentage}%)</p>
        <p>${resultMessage}</p>
        <div class="results-details">
            <p>Indices utilisés : ${hintsUsed} sur ${maxHints}</p>
            <p>Temps par question : ${timeLimit} secondes</p>
        </div>
        <div class="final-ranking">
            <h3>Classement Final</h3>
            <ul id="final-ranking-list"></ul>
        </div>
    `;
    
    // Update the final ranking when session info is received
    socket.once('sessionUpdate', (data) => {
        const finalRankingList = document.getElementById('final-ranking-list');
        if (finalRankingList && data.scores) {
            // Sort scores by score value (highest first)
            const sortedScores = [...data.scores].sort((a, b) => b.score - a.score);
            
            finalRankingList.innerHTML = sortedScores.map((scoreData, index) => {
                const isCurrentPlayer = scoreData.playerName === playerName;
                let rank = index + 1;
                
                // Handle ties (same score gets same rank)
                if (index > 0 && sortedScores[index-1].score === scoreData.score) {
                    // Find the previous player's rank
                    const prevElement = document.querySelector(`#final-ranking-list li:nth-child(${index})`);
                    if (prevElement) {
                        const prevRank = prevElement.querySelector('.rank').textContent;
                        rank = parseInt(prevRank);
                    }
                }
                
                return `
                    <li class="${isCurrentPlayer ? 'current-player' : ''}">
                        <span class="rank">${rank}</span>
                        <span class="player-name">${scoreData.playerName}${isCurrentPlayer ? ' (You)' : ''}</span>
                        <span class="score">${scoreData.score}</span>
                    </li>
                `;
            }).join('');
        }
    });
    
    // Hide quiz elements
    if (quizContainer) quizContainer.style.display = 'none';
    const timerContainer = document.querySelector('.timer-container');
    if (timerContainer) timerContainer.style.display = 'none';
    const buttonGroup = document.querySelector('.button-group');
    if (buttonGroup) buttonGroup.style.display = 'none';
    
    // Show quiz controls
    const quizControls = document.querySelector('.quiz-controls');
    if (quizControls) quizControls.style.display = 'flex';
    resultsContainer.style.display = 'flex';
}

// Update scoreboard with a player's score
function updateScoreboard(playerName, playerScore) {
    // Instead of directly updating the UI, send to server
    const sessionId = localStorage.getItem("sessionId") || "fallback-session";
    socket.emit('updateScore', { 
        sessionId, 
        playerName, 
        playerScore 
    });
}

// Show toast notification
function showToast(message) {
    // Remove existing toast if present
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 300);
    }, 3000);
}

// Shuffle array (used for answer options)
function shuffleArray(array) {
    if (!Array.isArray(array)) {
        console.error('shuffleArray called with non-array:', array);
        return [];
    }
    
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}
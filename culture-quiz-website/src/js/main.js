// Main JavaScript file for the K-Culture Quiz Website

// Function to initialize the application
function init() {
    // Check if the user is on the homepage
    if (window.location.pathname === '/index.html') {
        document.getElementById('start-button').addEventListener('click', startQuiz);
    }
}

// Function to navigate to the quiz page
function startQuiz() {
    window.location.href = 'quiz.html';
}

document.addEventListener("DOMContentLoaded", () => {
    const startButton = document.getElementById("start-quiz");
    startButton.addEventListener("click", () => {
        window.location.href = "quiz.html"; // Redirect to the quiz page
    });
});
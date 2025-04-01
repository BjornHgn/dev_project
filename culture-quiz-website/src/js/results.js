// results.js

document.addEventListener('DOMContentLoaded', () => {
    const score = localStorage.getItem('quizScore');
    const totalQuestions = localStorage.getItem('totalQuestions');
    const incorrectAnswers = JSON.parse(localStorage.getItem('incorrectAnswers')) || [];

    const scoreElement = document.getElementById('score');
    const totalElement = document.getElementById('total');
    const explanationElement = document.getElementById('explanations');

    scoreElement.textContent = `Your Score: ${score} out of ${totalQuestions}`;
    totalElement.textContent = `Total Questions: ${totalQuestions}`;

    if (incorrectAnswers.length > 0) {
        explanationElement.innerHTML = '<h3>Explanations for Incorrect Answers:</h3>';
        incorrectAnswers.forEach(answer => {
            explanationElement.innerHTML += `<p>${answer.question} - Correct Answer: ${answer.correctAnswer}</p>`;
        });
    } else {
        explanationElement.textContent = 'Congratulations! You answered all questions correctly!';
    }

    // Clear local storage for the next quiz attempt
    localStorage.removeItem('quizScore');
    localStorage.removeItem('totalQuestions');
    localStorage.removeItem('incorrectAnswers');
});
// --- Quiz Data (Will be loaded from XML) ---
let quizData = [];

// --- Global State Variables ---
let currentQuestions = []; // Shuffled array of questions for the current quiz session
let currentQuestionIndex = 0;
let score = 0;
let selectedAnswer = null;
let answerLocked = false; // To prevent multiple selections per question

// --- DOM Element References ---
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultsScreen = document.getElementById('results-screen');

const startQuizButton = document.getElementById('start-quiz-button');
const loadingStatusDiv = document.getElementById('loading-status'); // New element
const questionIndicator = document.getElementById('question-indicator');
const hanziDisplay = document.getElementById('hanzi-display');
const pinyinDisplay = document.getElementById('pinyin-display');
const optionsGrid = document.getElementById('options-grid');
const feedbackMessage = document.getElementById('feedback-message');
const nextQuestionButton = document.getElementById('next-question-button');

const scoreValueDisplay = document.getElementById('score-value');
const percentageTextDisplay = document.getElementById('percentage-text');
const resultsFeedbackMessage = document.getElementById('feedback-message-results');
const playAgainButton = document.getElementById('play-again-button');

// --- Helper Functions ---

/**
 * Shuffles an array in place (Fisher-Yates algorithm).
 * @param {Array} array - The array to shuffle.
 */
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

/**
 * Displays a specific screen and hides others.
 * @param {HTMLElement} screenToShow - The screen element to display.
 */
function showScreen(screenToShow) {
    [startScreen, quizScreen, resultsScreen].forEach(screen => {
        if (screen === screenToShow) {
            screen.classList.remove('hidden');
        } else {
            screen.classList.add('hidden');
        }
    });
}

/**
 * Displays a status message to the user.
 * @param {string} message - The message to display.
 * @param {string} type - The type of message ('info' or 'error').
 */
function showStatusMessage(message, type) {
    loadingStatusDiv.textContent = message;
    loadingStatusDiv.className = 'loading-status'; // Reset classes
    loadingStatusDiv.classList.add(type);
    loadingStatusDiv.classList.remove('hidden');
}

/**
 * Hides the status message.
 */
function hideStatusMessage() {
    loadingStatusDiv.classList.add('hidden');
    loadingStatusDiv.textContent = '';
}

/**
 * Resets the state for a new question.
 */
function resetQuestionState() {
    selectedAnswer = null;
    answerLocked = false;
    feedbackMessage.classList.add('hidden');
    nextQuestionButton.classList.add('hidden');
    // Clear any previous correct/incorrect styling from options
    Array.from(optionsGrid.children).forEach(button => {
        button.classList.remove('correct-answer', 'incorrect-answer', 'dim-unselected');
        button.disabled = false; // Re-enable for new question
    });
}

// --- XML Loading and Parsing ---

/**
 * Fetches and parses the quiz questions from the quiz.xml file.
 * @returns {Promise<Array>} A promise that resolves with an array of question objects.
 */
async function loadQuizDataFromXML() {
    showStatusMessage('Loading quiz data...', 'info');
    startQuizButton.disabled = true; // Disable button while loading

    try {
        const response = await fetch('quiz.xml');
        if (!response.ok) {
            // Throw an error if the HTTP status is not OK (e.g., 404, 500)
            throw new Error(`HTTP error! Status: ${response.status} - Could not load quiz.xml. Ensure it's in the same directory and a local server is running.`);
        }
        const xmlText = await response.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');

        const questions = [];
        const questionNodes = xmlDoc.querySelectorAll('question');

        questionNodes.forEach(node => {
            const id = node.getAttribute('id');
            const hanzi = node.querySelector('hanzi')?.textContent || '';
            const pinyin = node.querySelector('pinyin')?.textContent || '';
            const correct = node.querySelector('correct')?.textContent || '';
            const options = Array.from(node.querySelectorAll('options option')).map(opt => opt.textContent);

            questions.push({ id, hanzi, pinyin, options, correct });
        });
        hideStatusMessage(); // Hide message on success
        return questions;
    } catch (error) {
        console.error("Error loading or parsing quiz.xml:", error);
        showStatusMessage(`Error loading quiz data: ${error.message}. Please check your browser console for details.`, 'error');
        return []; // Return empty array to prevent app crash
    } finally {
        startQuizButton.disabled = false; // Re-enable button after load attempt
    }
}

// --- Render Functions ---

/**
 * Renders the current question on the quiz screen.
 */
function renderQuestion() {
    resetQuestionState(); // Reset state for the new question

    const question = currentQuestions[currentQuestionIndex];
    if (!question) {
        // If no question (e.g., end of quiz), show results
        renderResultsScreen();
        return;
    }

    // Update question indicator
    questionIndicator.textContent = `Question ${currentQuestionIndex + 1} / ${currentQuestions.length}`;

    // Update Hanzi and Pinyin displays
    hanziDisplay.textContent = question.hanzi;
    pinyinDisplay.textContent = question.pinyin;

    // Clear previous options
    optionsGrid.innerHTML = '';

    // Create and append option buttons
    question.options.forEach(option => {
        const button = document.createElement('button');
        button.textContent = option;
        button.classList.add('option-button');
        button.addEventListener('click', () => handleOptionClick(option, question.correct));
        optionsGrid.appendChild(button);
    });

    showScreen(quizScreen);
}

/**
 * Renders the results screen with the final score.
 */
function renderResultsScreen() {
    scoreValueDisplay.textContent = `${score} / ${currentQuestions.length}`;

    const percentage = currentQuestions.length > 0 ? ((score / currentQuestions.length) * 100).toFixed(0) : 0;
    percentageTextDisplay.textContent = `${percentage}%`;

    let feedback = '';
    if (percentage >= 80) feedback = "Excellent work! Keep it up!";
    else if (percentage >= 50) feedback = "Good effort! Practice makes perfect.";
    else feedback = "Keep studying! You'll get there.";
    resultsFeedbackMessage.textContent = feedback;

    showScreen(resultsScreen);
}

// --- Event Handlers ---

/**
 * Handles the click event on an option button.
 * @param {string} clickedOption - The text of the option that was clicked.
 * @param {string} correctAnswer - The correct answer for the current question.
 */
function handleOptionClick(clickedOption, correctAnswer) {
    if (answerLocked) return; // Prevent multiple clicks

    answerLocked = true;
    selectedAnswer = clickedOption;
    feedbackMessage.classList.remove('hidden');
    nextQuestionButton.classList.remove('hidden');

    // Display feedback message
    if (selectedAnswer === correctAnswer) {
        feedbackMessage.textContent = 'Correct!';
        feedbackMessage.classList.remove('incorrect');
        feedbackMessage.classList.add('correct');
        score++; // Increment score only if correct
    } else {
        feedbackMessage.textContent = `Incorrect. The correct answer was: ${correctAnswer}`;
        feedbackMessage.classList.remove('correct');
        feedbackMessage.classList.add('incorrect');
    }

    // Apply styling to all option buttons based on correctness and selection
    Array.from(optionsGrid.children).forEach(button => {
        button.disabled = true; // Disable all buttons after selection
        if (button.textContent === correctAnswer) {
            button.classList.add('correct-answer');
        } else if (button.textContent === selectedAnswer) {
            button.classList.add('incorrect-answer');
        } else {
            button.classList.add('dim-unselected');
        }
    });
}

/**
 * Moves to the next question or shows results if the quiz is complete.
 */
function handleNextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuestions.length) {
        renderQuestion();
    } else {
        renderResultsScreen();
    }
}

/**
 * Initializes and starts the quiz.
 */
async function startQuiz() {
    // Only load quizData if it hasn't been loaded yet
    if (quizData.length === 0) {
        quizData = await loadQuizDataFromXML();
        if (quizData.length === 0) {
            // If quizData is still empty after loading attempt, do not proceed
            return;
        }
    }
    currentQuestions = [...quizData]; // Make a copy
    shuffleArray(currentQuestions); // Shuffle questions
    currentQuestionIndex = 0;
    score = 0;
    renderQuestion(); // Start rendering the first question
}

/**
 * Resets the quiz to the start screen.
 */
function resetQuiz() {
    currentQuestions = [];
    currentQuestionIndex = 0;
    score = 0;
    selectedAnswer = null;
    answerLocked = false;
    showScreen(startScreen);
    hideStatusMessage(); // Hide any previous error messages
}

// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Show the start screen initially
    showScreen(startScreen);

    // Attach event listeners to buttons
    startQuizButton.addEventListener('click', startQuiz);
    nextQuestionButton.addEventListener('click', handleNextQuestion);
    playAgainButton.addEventListener('click', resetQuiz);

    // Attempt to load quiz data when the page loads, but don't start the quiz yet.
    // This pre-loads the data if possible and provides immediate feedback if there's an issue.
    loadQuizDataFromXML();
});

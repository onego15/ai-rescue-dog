import { TurnBasedGame } from './game-turnbased.js';

// ゲームの開始
window.addEventListener('DOMContentLoaded', () => {
    const startButton = document.getElementById('start-button');
    const apiKeyInput = document.getElementById('api-key-input');
    const setupScreen = document.getElementById('setup-screen');
    const uiContainer = document.getElementById('ui-container');

    startButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value.trim();

        // セットアップ画面を非表示
        setupScreen.style.display = 'none';
        uiContainer.style.display = 'block';

        // ゲーム開始
        if (apiKey) {
            console.log('🚀 Starting game with OpenAI API');
            new TurnBasedGame(apiKey);
        } else {
            console.log('🚀 Starting game without OpenAI API (Fallback mode)');
            new TurnBasedGame(null);
        }
    });
});

import Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';
import { gameConfig } from './game/config';
import { gameClient, type GameRoom } from './network/ColyseusClient';

const loginScreen = document.getElementById('login-screen') as HTMLDivElement;
const usernameInput = document.getElementById('username-input') as HTMLInputElement;
const joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
const chatMessages = document.getElementById('chat-messages') as HTMLDivElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;

let game: Phaser.Game | null = null;

joinBtn.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  if (!name) return;

  try {
    joinBtn.disabled = true;
    joinBtn.textContent = 'Connecting...';

    const room = await gameClient.connect(name);

    loginScreen.style.display = 'none';
    chatContainer.style.display = 'flex';

    game = new Phaser.Game(gameConfig);
    console.log('Game started', game);

    setupChat(room);
  } catch (error) {
    console.error('Failed to connect:', error);
    joinBtn.disabled = false;
    joinBtn.textContent = 'Join World';
    alert('Failed to connect to server');
  }
});

function setupChat(room: Room<GameRoom>) {
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const message = chatInput.value.trim();
      if (message) {
        room.send('chat', { message });
        chatInput.value = '';
      }
    }
  });

  room.onMessage('chat', (data: { from: string; message: string }) => {
    const msgEl = document.createElement('div');
    msgEl.textContent = `${data.from}: ${data.message}`;
    chatMessages.appendChild(msgEl);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

/// <reference types="vite/client" />
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
const gameContainer = document.getElementById('game-container') as HTMLDivElement;

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

    gameContainer.addEventListener('click', () => {
      chatInput.blur();
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && document.activeElement !== chatInput) {
        chatInput.focus();
      }
    });

    setupChat(room);

    // Dev-only debug interface
    if (import.meta.env.DEV) {
      (window as any).__ocw = {
        getMyState: () => gameClient.getMyEntity(),
        findEntity: (id: string) => gameClient.findEntity(id),
        getRoom: () => gameClient.currentRoom,
        sendMessage: (type: string, data: any) => gameClient.currentRoom?.send(type, data),
      };
    }
  } catch (error) {
    console.error('Failed to connect:', error);
    joinBtn.disabled = false;
    joinBtn.textContent = 'Join World';
    alert('Failed to connect to server');
  }
});

function setupChat(room: Room<GameRoom>) {
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.isComposing) {
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

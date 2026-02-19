/// <reference types="vite/client" />
import Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';
import { gameConfig } from './game/config';
import { gameClient, type GameRoom, type ChannelInfo } from './network/ColyseusClient';

const loginScreen = document.getElementById('login-screen') as HTMLDivElement;
const channelSelect = document.getElementById('channel-select') as HTMLDivElement;
const channelListEl = document.getElementById('channel-list') as HTMLDivElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const nameInput = document.getElementById('name-input') as HTMLDivElement;
const selectedChannelLabel = document.getElementById('selected-channel-label') as HTMLParagraphElement;
const usernameInput = document.getElementById('username-input') as HTMLInputElement;
const joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
const chatMessages = document.getElementById('chat-messages') as HTMLDivElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const gameContainer = document.getElementById('game-container') as HTMLDivElement;

let game: Phaser.Game | null = null;
let selectedChannelId: string | null = null;

async function loadChannels(): Promise<void> {
  channelListEl.textContent = 'Loading...';
  const channels = await gameClient.fetchChannels();

  if (channels.length === 0) {
    channelListEl.innerHTML = '<p style="color:#aaa;">No channels yet — one will be created on join.</p>';
    selectChannel('channel-1', 'channel-1 (new)');
    return;
  }

  channelListEl.innerHTML = '';
  for (const ch of channels) {
    const btn = document.createElement('button');
    btn.className = 'channel-btn';
    btn.textContent = `${ch.channelId} (${ch.occupancy}/${ch.maxOccupancy})`;
    btn.disabled = ch.occupancy >= ch.maxOccupancy;
    btn.addEventListener('click', () => selectChannel(ch.channelId, btn.textContent!));
    channelListEl.appendChild(btn);
  }
}

function selectChannel(channelId: string, label: string): void {
  selectedChannelId = channelId;
  selectedChannelLabel.textContent = label;
  channelSelect.style.display = 'none';
  nameInput.style.display = 'block';
  usernameInput.focus();
}

refreshBtn.addEventListener('click', () => void loadChannels());

backBtn.addEventListener('click', () => {
  nameInput.style.display = 'none';
  channelSelect.style.display = 'block';
  selectedChannelId = null;
});

joinBtn.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  if (!name) return;

  try {
    joinBtn.disabled = true;
    joinBtn.textContent = 'Connecting...';

    const room = await gameClient.connect(name, selectedChannelId ?? undefined);

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
      (window as unknown as Record<string, unknown>).__ocw = {
        getMyState: () => gameClient.getMyEntity(),
        findEntity: (id: string) => gameClient.findEntity(id),
        getRoom: () => gameClient.currentRoom,
        sendMessage: (type: string, data: unknown) => gameClient.currentRoom?.send(type, data),
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

// Load channels on page load
void loadChannels();

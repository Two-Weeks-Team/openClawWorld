/// <reference types="vite/client" />
import Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';
import { gameConfig } from './game/config';
import { gameClient, type GameRoom, type ChannelInfo } from './network/ColyseusClient';

const loginScreen = document.getElementById('login-screen') as HTMLDivElement;
const channelSelect = document.getElementById('channel-select') as HTMLDivElement;
const channelListEl = document.getElementById('channel-list') as HTMLDivElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const nameInputArea = document.getElementById('name-input-area') as HTMLDivElement;
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
  try {
    const channels = await gameClient.fetchChannels();

    if (channels.length === 0) {
      // No channels yet — show default option
      channelListEl.innerHTML = '';
      const btn = document.createElement('button');
      btn.className = 'channel-btn';
      btn.innerHTML = `Channel 1 <span class="occupancy">0/30</span>`;
      btn.addEventListener('click', () => selectChannel('channel-1', 0, 30));
      channelListEl.appendChild(btn);
      return;
    }

    channelListEl.innerHTML = '';
    channels.forEach((ch: ChannelInfo) => {
      const btn = document.createElement('button');
      const isFull = ch.occupancy >= ch.maxOccupancy;
      btn.className = `channel-btn${isFull ? ' full' : ''}`;
      btn.disabled = isFull;

      const label = ch.channelId.replace('channel-', 'Channel ');
      btn.innerHTML = `${label} <span class="occupancy">${ch.occupancy}/${ch.maxOccupancy}</span>`;

      if (!isFull) {
        btn.addEventListener('click', () => selectChannel(ch.channelId, ch.occupancy, ch.maxOccupancy));
      }
      channelListEl.appendChild(btn);
    });
  } catch {
    channelListEl.textContent = 'Failed to load channels';
  }
}

function selectChannel(channelId: string, occupancy: number, maxOccupancy: number): void {
  selectedChannelId = channelId;
  const label = channelId.replace('channel-', 'Channel ');
  selectedChannelLabel.textContent = `${label} (${occupancy}/${maxOccupancy})`;
  channelSelect.style.display = 'none';
  nameInputArea.style.display = 'block';
  usernameInput.focus();
}

backBtn.addEventListener('click', () => {
  nameInputArea.style.display = 'none';
  channelSelect.style.display = 'block';
  selectedChannelId = null;
  loadChannels();
});

refreshBtn.addEventListener('click', () => loadChannels());

joinBtn.addEventListener('click', async () => {
  const name = usernameInput.value.trim();
  if (!name || !selectedChannelId) return;

  try {
    joinBtn.disabled = true;
    joinBtn.textContent = 'Connecting...';

    const room = await gameClient.connect(name, selectedChannelId);

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
    alert('Failed to connect to server. The channel may be full.');
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
loadChannels();

/// <reference types="vite/client" />
import Phaser from 'phaser';
import type { Room } from '@colyseus/sdk';
import { gameConfig } from './game/config';
import { gameClient, type RoomState, type ChannelInfo } from './network/ColyseusClient';

const loginScreen = document.getElementById('login-screen') as HTMLDivElement;
const channelSelectDiv = document.getElementById('channel-select') as HTMLDivElement;
const channelListEl = document.getElementById('channel-list') as HTMLDivElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;
const nameInputDiv = document.getElementById('name-input') as HTMLDivElement;
const selectedChannelLabel = document.getElementById(
  'selected-channel-label'
) as HTMLParagraphElement;
const usernameInput = document.getElementById('username-input') as HTMLInputElement;
const joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
const backBtn = document.getElementById('back-btn') as HTMLButtonElement;
const chatContainer = document.getElementById('chat-container') as HTMLDivElement;
const chatMessages = document.getElementById('chat-messages') as HTMLDivElement;
const chatInput = document.getElementById('chat-input') as HTMLInputElement;
const gameContainer = document.getElementById('game-container') as HTMLDivElement;

let game: Phaser.Game | null = null;
let selectedChannelId: string | null = null;

async function loadChannels() {
  channelListEl.textContent = 'Loading...';
  const channels: ChannelInfo[] = await gameClient.fetchChannels();

  if (channels.length === 0) {
    channelListEl.textContent = 'No channels available. Server may be offline.';
    return;
  }

  channelListEl.innerHTML = '';
  for (const ch of channels) {
    const btn = document.createElement('button');
    btn.className = 'channel-btn';
    btn.textContent = `${ch.channelId}  (${ch.occupancy}/${ch.maxOccupancy})`;
    const full = ch.occupancy >= ch.maxOccupancy;
    btn.disabled = full;
    btn.addEventListener('click', () =>
      selectChannel(ch.channelId, btn.textContent ?? ch.channelId)
    );
    channelListEl.appendChild(btn);
  }
}

function selectChannel(channelId: string, label: string) {
  selectedChannelId = channelId;
  selectedChannelLabel.textContent = label;
  channelSelectDiv.style.display = 'none';
  nameInputDiv.style.display = 'block';
  usernameInput.focus();
}

refreshBtn.addEventListener('click', () => void loadChannels());

backBtn.addEventListener('click', () => {
  selectedChannelId = null;
  nameInputDiv.style.display = 'none';
  channelSelectDiv.style.display = 'block';
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
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes('full') || msg.includes('Channel is full')) {
      alert('선택한 채널이 가득 찼습니다. 다시 채널을 선택해 주세요.');
      nameInputDiv.style.display = 'none';
      channelSelectDiv.style.display = 'block';
      selectedChannelId = null;
      void loadChannels();
    } else {
      alert('연결에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }
});

function setupChat(room: Room<Record<string, unknown>, RoomState>) {
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

void loadChannels();

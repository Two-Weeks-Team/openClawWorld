import type { FacilityService, FacilityActionHandler } from '../services/FacilityService.js';
import type { FacilitySchema } from '../schemas/FacilitySchema.js';

const receptionDeskHandlers: Record<string, FacilityActionHandler> = {
  check_in: (facility: FacilitySchema, _entityId: string) => ({
    type: 'ok',
    message: `Welcome! You've been checked in at ${facility.id}`,
  }),
  get_info: (_facility: FacilitySchema) => ({
    type: 'ok',
    message: 'Reception desk provides information and check-in services.',
  }),
};

const kanbanTerminalHandlers: Record<string, FacilityActionHandler> = {
  view_tasks: (_facility: FacilitySchema, _entityId: string) => ({
    type: 'ok',
    message: 'Viewing task board...',
  }),
  create_task: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const title = (params.title as string) || 'New Task';
    return {
      type: 'ok',
      message: `Task "${title}" created on kanban board`,
    };
  },
  update_task: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const taskId = params.taskId as string;
    const status = params.status as string;
    if (!taskId) {
      return { type: 'invalid_action', message: 'Task ID required' };
    }
    return {
      type: 'ok',
      message: `Task ${taskId} updated to ${status || 'done'}`,
    };
  },
};

const whiteboardHandlers: Record<string, FacilityActionHandler> = {
  view: () => ({
    type: 'ok',
    message: 'Viewing whiteboard contents...',
  }),
  draw: (_facility: FacilitySchema, _entityId: string, _params: Record<string, unknown>) => ({
    type: 'ok',
    message: 'Drawing on whiteboard',
  }),
  clear: () => ({
    type: 'ok',
    message: 'Whiteboard cleared',
  }),
};

const printerHandlers: Record<string, FacilityActionHandler> = {
  print: (_facility: FacilitySchema, _entityId: string, _params: Record<string, unknown>) => ({
    type: 'ok',
    message: 'Document sent to printer',
  }),
  check_status: () => ({
    type: 'ok',
    message: 'Printer is ready',
  }),
};

const cafeCounterHandlers: Record<string, FacilityActionHandler> = {
  order: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const item = (params.item as string) || 'coffee';
    return {
      type: 'ok',
      message: `Ordered ${item} from cafe`,
    };
  },
  view_menu: () => ({
    type: 'ok',
    message: 'Menu: Coffee, Tea, Pastries, Sandwiches',
  }),
};

const vendingMachineHandlers: Record<string, FacilityActionHandler> = {
  purchase: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const item = (params.item as string) || 'snack';
    return {
      type: 'ok',
      message: `Dispensing ${item}...`,
    };
  },
  view_items: () => ({
    type: 'ok',
    message: 'Available: Chips, Candy, Drinks, Energy Bars',
  }),
};

const scheduleKioskHandlers: Record<string, FacilityActionHandler> = {
  view_schedule: () => ({
    type: 'ok',
    message: 'Viewing meeting schedule...',
  }),
  book_room: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const time = params.time as string;
    const room = params.room as string;
    return {
      type: 'ok',
      message: `Booked ${room || 'Room A'} at ${time || '14:00'}`,
    };
  },
};

const votingKioskHandlers: Record<string, FacilityActionHandler> = {
  vote: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const option = params.option as string;
    if (!option) {
      return { type: 'invalid_action', message: 'Vote option required' };
    }
    return {
      type: 'ok',
      message: `Vote cast for "${option}"`,
    };
  },
  view_results: () => ({
    type: 'ok',
    message: 'Viewing vote results...',
  }),
};

const noticeBoardHandlers: Record<string, FacilityActionHandler> = {
  read: () => ({
    type: 'ok',
    message: 'Reading notice board...',
  }),
  post: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const message = params.message as string;
    return {
      type: 'ok',
      message: `Posted notice: "${message || 'New announcement'}"`,
    };
  },
};

const gateHandlers: Record<string, FacilityActionHandler> = {
  enter: () => ({
    type: 'ok',
    message: 'Entering through gate...',
  }),
  exit: () => ({
    type: 'ok',
    message: 'Exiting through gate...',
  }),
};

const fountainHandlers: Record<string, FacilityActionHandler> = {
  view: () => ({
    type: 'ok',
    message: 'Admiring the fountain...',
  }),
  toss_coin: () => ({
    type: 'ok',
    message: 'You tossed a coin and made a wish!',
  }),
};

const arcadeCabinetsHandlers: Record<string, FacilityActionHandler> = {
  play: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const game = (params.game as string) || 'arcade game';
    return {
      type: 'ok',
      message: `Playing ${game}...`,
    };
  },
  view_highscores: () => ({
    type: 'ok',
    message: 'Viewing high scores...',
  }),
};

const stageHandlers: Record<string, FacilityActionHandler> = {
  perform: () => ({
    type: 'ok',
    message: 'Starting performance on stage...',
  }),
  view: () => ({
    type: 'ok',
    message: 'Watching the stage...',
  }),
};

const roomDoorHandlers: Record<string, FacilityActionHandler> = {
  enter: (facility: FacilitySchema) => ({
    type: 'ok',
    message: `Entering ${facility.id}...`,
  }),
  knock: (facility: FacilitySchema) => ({
    type: 'ok',
    message: `Knocking on ${facility.id}...`,
  }),
};

const agendaPanelHandlers: Record<string, FacilityActionHandler> = {
  view: () => ({
    type: 'ok',
    message: 'Viewing meeting agenda...',
  }),
  add_item: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const item = params.item as string;
    return {
      type: 'ok',
      message: `Added "${item || 'New item'}" to agenda`,
    };
  },
};

const watercoolerHandlers: Record<string, FacilityActionHandler> = {
  drink: () => ({
    type: 'ok',
    message: 'Refreshing! You had some water.',
  }),
  chat: () => ({
    type: 'ok',
    message: 'Having a watercooler chat...',
  }),
};

const gameTableHandlers: Record<string, FacilityActionHandler> = {
  play: (_facility: FacilitySchema, _entityId: string, params: Record<string, unknown>) => {
    const game = (params.game as string) || 'board game';
    return {
      type: 'ok',
      message: `Playing ${game} at the table...`,
    };
  },
  join: () => ({
    type: 'ok',
    message: 'Joining the game...',
  }),
};

const pondEdgeHandlers: Record<string, FacilityActionHandler> = {
  view: () => ({
    type: 'ok',
    message: 'Watching the fish swim peacefully...',
  }),
  feed: () => ({
    type: 'ok',
    message: 'Feeding the fish...',
  }),
};

export function registerAllFacilityHandlers(facilityService: FacilityService): void {
  const facilityTypes: Record<string, Record<string, FacilityActionHandler>> = {
    reception_desk: receptionDeskHandlers,
    kanban_terminal: kanbanTerminalHandlers,
    whiteboard: whiteboardHandlers,
    printer: printerHandlers,
    cafe_counter: cafeCounterHandlers,
    vending_machine: vendingMachineHandlers,
    schedule_kiosk: scheduleKioskHandlers,
    voting_kiosk: votingKioskHandlers,
    notice_board: noticeBoardHandlers,
    gate: gateHandlers,
    fountain: fountainHandlers,
    game_table: arcadeCabinetsHandlers,
    stage: stageHandlers,
    room_door_a: roomDoorHandlers,
    room_door_b: roomDoorHandlers,
    room_door_c: roomDoorHandlers,
    agenda_panel: agendaPanelHandlers,
    watercooler: watercoolerHandlers,
    arcade_cabinets: gameTableHandlers,
    pond_edge: pondEdgeHandlers,
  };

  for (const [facilityType, handlers] of Object.entries(facilityTypes)) {
    for (const [action, handler] of Object.entries(handlers)) {
      facilityService.registerHandler(facilityType, action, handler);
    }
  }

  console.log(
    `[FacilityHandlers] Registered handlers for ${Object.keys(facilityTypes).length} facility types`
  );
}

export const FACILITY_AFFORDANCES: Record<string, string[]> = {
  reception_desk: ['check_in', 'get_info'],
  kanban_terminal: ['view_tasks', 'create_task', 'update_task'],
  whiteboard: ['view', 'draw', 'clear'],
  printer: ['print', 'check_status'],
  cafe_counter: ['order', 'view_menu'],
  vending_machine: ['purchase', 'view_items'],
  schedule_kiosk: ['view_schedule', 'book_room'],
  voting_kiosk: ['vote', 'view_results'],
  notice_board: ['read', 'post'],
  gate: ['enter', 'exit'],
  fountain: ['view', 'toss_coin'],
  game_table: ['play', 'view_highscores'],
  stage: ['perform', 'view'],
  room_door_a: ['enter', 'knock'],
  room_door_b: ['enter', 'knock'],
  room_door_c: ['enter', 'knock'],
  agenda_panel: ['view', 'add_item'],
  watercooler: ['drink', 'chat'],
  arcade_cabinets: ['play', 'join'],
  pond_edge: ['view', 'feed'],
};

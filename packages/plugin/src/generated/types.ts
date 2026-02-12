/**
 * Generated Types
 * AUTO-GENERATED from OpenAPI spec - DO NOT EDIT
 */

export type GeneratedToolName =
  | 'ocw.observe'
  | 'ocw.move_to'
  | 'ocw.interact'
  | 'ocw.chat_send'
  | 'ocw.chat_observe'
  | 'ocw.poll_events';

export interface GeneratedToolInfo {
  name: GeneratedToolName;
  operationId: string;
  path: string;
  tag: string;
  required: boolean;
  sideEffects: 'none' | 'world' | 'chat';
}

export const GENERATED_TOOLS: GeneratedToolInfo[] = [
  {
    name: 'ocw.observe',
    operationId: 'observe',
    path: '/observe',
    tag: 'Observation',
    required: true,
    sideEffects: 'none',
  },
  {
    name: 'ocw.move_to',
    operationId: 'moveTo',
    path: '/moveTo',
    tag: 'Actions',
    required: false,
    sideEffects: 'world',
  },
  {
    name: 'ocw.interact',
    operationId: 'interact',
    path: '/interact',
    tag: 'Actions',
    required: false,
    sideEffects: 'world',
  },
  {
    name: 'ocw.chat_send',
    operationId: 'chatSend',
    path: '/chatSend',
    tag: 'Chat',
    required: false,
    sideEffects: 'chat',
  },
  {
    name: 'ocw.chat_observe',
    operationId: 'chatObserve',
    path: '/chatObserve',
    tag: 'Chat',
    required: false,
    sideEffects: 'chat',
  },
  {
    name: 'ocw.poll_events',
    operationId: 'pollEvents',
    path: '/pollEvents',
    tag: 'Events',
    required: true,
    sideEffects: 'none',
  },
];

import type { Request, Response } from 'express';
import { matchMaker } from 'colyseus';
import type { SkillListRequest, AicErrorObject, SkillDefinition } from '@openclawworld/shared';
import type { GameRoom } from '../../rooms/GameRoom.js';
import { getColyseusRoomId } from '../roomRegistry.js';

function createErrorResponse(
  code: AicErrorObject['code'],
  message: string,
  retryable: boolean
): { status: 'error'; error: AicErrorObject } {
  return {
    status: 'error',
    error: {
      code,
      message,
      retryable,
    },
  };
}

export async function handleSkillList(req: Request, res: Response): Promise<void> {
  const body = req.validatedBody as SkillListRequest;
  const { agentId, roomId, category, installed } = body;

  try {
    const colyseusRoomId = getColyseusRoomId(roomId);

    if (!colyseusRoomId) {
      res
        .status(404)
        .json(createErrorResponse('not_found', `Room with id '${roomId}' not found`, false));
      return;
    }

    const gameRoom = matchMaker.getLocalRoomById(colyseusRoomId) as GameRoom | undefined;

    if (!gameRoom) {
      res
        .status(503)
        .json(createErrorResponse('room_not_ready', `Room '${roomId}' is not ready`, true));
      return;
    }

    const skillService = gameRoom.getSkillService();

    if (!skillService) {
      res.status(503).json(createErrorResponse('room_not_ready', `Skill service not ready`, true));
      return;
    }

    let skills: SkillDefinition[] = category
      ? skillService.getSkillsByCategory(category)
      : skillService.getAllSkills();

    if (installed !== undefined) {
      const agentSkills = skillService.getAgentSkills(agentId);
      const installedSkillIds = new Set(agentSkills.map((s: { skillId: string }) => s.skillId));

      skills = installed
        ? skills.filter(s => installedSkillIds.has(s.id))
        : skills.filter(s => !installedSkillIds.has(s.id));
    }

    res.status(200).json({
      status: 'ok',
      data: {
        skills,
        serverTsMs: Date.now(),
      },
    });
  } catch (error) {
    console.error(`[SkillListHandler] Error processing skillList request:`, error);
    res
      .status(500)
      .json(
        createErrorResponse('internal', 'Internal server error processing skillList request', true)
      );
  }
}

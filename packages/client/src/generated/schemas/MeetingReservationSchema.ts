// 
// THIS FILE HAS BEEN GENERATED AUTOMATICALLY
// DO NOT CHANGE IT MANUALLY UNLESS YOU KNOW WHAT YOU'RE DOING
// 
// GENERATED USING @colyseus/schema 4.0.14
// 

import { Schema, type, ArraySchema, MapSchema, SetSchema, DataChange } from '@colyseus/schema';


export class MeetingReservationSchema extends Schema {
    @type("string") public id!: string;
    @type("string") public meetingRoomId!: string;
    @type("string") public orgId!: string;
    @type("string") public creatorId!: string;
    @type("string") public name!: string;
    @type("number") public startTime!: number;
    @type("number") public endTime!: number;
    @type("string") public status!: string;
    @type("string") public colyseusRoomId!: string;
}

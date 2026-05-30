export type RoomType = 'Single' | 'Double' | 'Twin' | 'Family' | 'Suite';

export interface Room {
  roomid: number;
  roomName: string;
  type: RoomType;
  accessible: boolean;
  image: string;
  description: string;
  features: string[];
  roomPrice: number;
}

export interface RoomListResponse {
  rooms: Room[];
}

/** Body accepted by POST/PUT /room. The server assigns roomid on create. */
export interface RoomPayload {
  roomName: string;
  type: RoomType;
  accessible: boolean;
  description: string;
  image: string;
  features: string[];
  roomPrice: number;
}

export interface CreateRoomResponse {
  success: boolean;
}

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

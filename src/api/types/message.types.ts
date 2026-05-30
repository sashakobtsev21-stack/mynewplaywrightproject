/**
 * Contact messages. The live platform is inconsistent across endpoints: the list
 * keys each row as `id`, while the detail view returns the same row keyed as
 * `messageid`. Both shapes are modelled here so callers don't have to guess.
 */
export interface CreateMessagePayload {
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
}

export interface MessageListItem {
  id: number;
  name: string;
  subject: string;
  read: boolean;
}

export interface MessageListResponse {
  messages: MessageListItem[];
}

export interface MessageDetail {
  messageid: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  description: string;
}

export interface MessageCount {
  count: number;
}

export interface CreateMessageResponse {
  success: boolean;
}

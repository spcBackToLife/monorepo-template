
export interface Message {

  id: string;

  role: "user" | "assistant";

  text: string;

  timestamp: number;

}


export interface ChatSendResponse {

  userMessage: Message;

  aiReply: Message;

}


export interface ChatSendParams {

  text: string;

}



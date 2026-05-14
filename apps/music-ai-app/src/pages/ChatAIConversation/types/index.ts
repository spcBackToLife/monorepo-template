
export interface Message {

  id: string;

  role: string;

  text: string;

}


export interface ChatSendResponse {

  userMessage: Message;

  aiReply: Message;

}


export interface ChatSendParams {

  text: string;

}



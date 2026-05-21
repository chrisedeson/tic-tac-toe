// frontend/app/utils/socketEvents.ts
// Socket.IO event names — the wire contract shared with the server.
// Keep in sync with backend/src/socket/events.js
export const EVENTS = {
  // Connection
  CONNECTION: "connection",
  DISCONNECT: "disconnect",

  // User Status & List
  USER_ONLINE: "user:online",
  USER_OFFLINE: "user:offline",
  USER_LIST_UPDATED: "user:list_updated",
  GET_USER_LIST: "user:get_list",

  // Chat
  CHAT_MESSAGE_SEND: "chat:message:send",
  CHAT_MESSAGE_RECEIVE: "chat:message:receive",
  CHAT_PRIVATE_MESSAGE_SEND: "chat:private_message:send",
  CHAT_PRIVATE_MESSAGE_RECEIVE: "chat:private_message:receive",
  CHAT_FETCH_MESSAGES: "chat:fetch_messages",

  // Game & Challenge
  CHALLENGE_SEND: "challenge:send",
  CHALLENGE_RECEIVE: "challenge:receive",
  CHALLENGE_RESPONSE: "challenge:response",
  CHALLENGE_RESULT: "challenge:result",
  GAME_START: "game:start",
  GAME_MOVE_MAKE: "game:move:make",
  GAME_MOVE_RECEIVE: "game:move:receive",
  GAME_STATE_UPDATE: "game:state_update",
  GAME_TIMER_UPDATE: "game:timer_update",
  GAME_TIMEOUT: "game:timeout",
  GAME_END: "game:end",
  REMATCH_REQUEST: "rematch:request",
  REMATCH_RECEIVE: "rematch:receive",
  REMATCH_RESPONSE: "rematch:response",
  REMATCH_RESULT: "rematch:result",

  // Notifications
  NOTIFICATION_RECEIVE: "notification:receive",

  // Christopher (AI) specific
  CHALLENGE_CHRISTOPHER: "christopher:challenge",
};

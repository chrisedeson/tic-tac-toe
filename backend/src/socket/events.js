// backend/src/socket/events.js
export const EVENTS = {
  // Connection
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // User Status & List
  USER_ONLINE: 'user:online',             // Client -> Server (when user provides name and connects)
  USER_OFFLINE: 'user:offline',           // Server -> Clients (when a user disconnects)
  USER_LIST_UPDATED: 'user:list_updated', // Server -> Clients (sends updated list of online users)
  GET_USER_LIST: 'user:get_list',         // Client -> Server (request for current online users)

  // Chat
  CHAT_MESSAGE_SEND: 'chat:message:send',       // Client -> Server
  CHAT_MESSAGE_RECEIVE: 'chat:message:receive', // Server -> Clients (for public chat)
  CHAT_PRIVATE_MESSAGE_SEND: 'chat:private_message:send', // Client -> Server
  CHAT_PRIVATE_MESSAGE_RECEIVE: 'chat:private_message:receive', // Server -> Specific Client
  CHAT_FETCH_MESSAGES: 'chat:fetch_messages',

  // Game & Challenge
  CHALLENGE_SEND: 'challenge:send',               // Client -> Server (to challenge a user)
  CHALLENGE_RECEIVE: 'challenge:receive',         // Server -> Specific Client (the challenged user)
  CHALLENGE_RESPONSE: 'challenge:response',       // Client -> Server (accept/decline)
  CHALLENGE_RESULT: 'challenge:result',           // Server -> Both Clients (challenge accepted/declined/cancelled)
  GAME_START: 'game:start',                     // Server -> Both Clients in a game
  GAME_MOVE_MAKE: 'game:move:make',             // Client -> Server
  GAME_MOVE_RECEIVE: 'game:move:receive',       // Server -> Both Clients in a game (or just opponent)
  GAME_STATE_UPDATE: 'game:state_update',       // Server -> Both Clients (full game state or significant event)
  GAME_TIMER_UPDATE: 'game:timer_update',       // Server -> Client (current player)
  GAME_TIMEOUT: 'game:timeout',                 // Server -> Both Clients
  GAME_END: 'game:end',                         // Server -> Both Clients (winner/draw)
  REMATCH_REQUEST: 'rematch:request',           // Client -> Server
  REMATCH_RECEIVE: 'rematch:receive',           // Server -> Opponent
  REMATCH_RESPONSE: 'rematch:response',         // Client -> Server
  REMATCH_RESULT: 'rematch:result',             // Server -> Both Clients

  // Notifications (general purpose, can be piggybacked on other events or specific)
  NOTIFICATION_RECEIVE: 'notification:receive', // Server -> Client

  // Christopher (AI) specific
  CHALLENGE_CHRISTOPHER: 'christopher:challenge', // Client -> Server
};

// export default { EVENTS };
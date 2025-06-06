// frontend/app/pages/GamePage.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useGame } from '../contexts/GameContext'; // Assuming GameContext handles game state

import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import NameInputDialog from '../components/game/NameInputDialog';
import Board from '../components/game/Board';
import Scoreboard from '../components/game/Scoreboard';
import Timer from '../components/game/Timer';
import GameEndModal from '../components/game/GameEndModal';
import ChatWindow from '../components/chat/ChatWindow';
import UserList from '../components/chat/UserList'; // For online players display & challenge
import ChatIcon from '../components/chat/ChatIcon';

// Assuming EVENTS are imported or defined
import { EVENTS } from '../../../backend/src/socket/events'; // Adjust path
import { toast } from 'react-toastify';


interface OnlineUser {
  userId: string;
  username: string;
  lastSeen?: string; // e.g., "Online", "Last seen: 5 mins ago"
  socketId?: string; // useful for direct targeting if needed, but prefer userId
}


const GamePage: React.FC = () => {
  const { darkMode } = useTheme();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { socket, isConnected } = useSocket();
  const {
    board, setBoard, currentPlayer, setCurrentPlayer, winner, setWinner,
    gameActive, setGameActive, timeLeft, setTimeLeft, scores, setScores,
    // ... other game states from GameContext
  } = useGame();

  const [showNameDialog, setShowNameDialog] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlineUser[]>([]);
  // const [playingAgainstChristopher, setPlayingAgainstChristopher] = useState(false); // Manage in GameContext

  // Effect to show name dialog if not authenticated
  useEffect(() => {
    if (!authLoading) {
      setShowNameDialog(!isAuthenticated);
    }
  }, [isAuthenticated, authLoading]);


  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.emit(EVENTS.GET_USER_LIST); // Request user list on connect or page load

    socket.on(EVENTS.USER_LIST_UPDATED, (users: OnlineUser[]) => {
      setOnlinePlayers(users.filter(p => p.userId !== user?.id)); // Exclude self
    });

    socket.on(EVENTS.CHALLENGE_RECEIVE, ({ fromUser }: { fromUser: OnlineUser }) => {
      // Use toast with actions for accept/decline
      toast(
        ({ closeToast }) => (
          <div>
            <p>{fromUser.username} challenges you to a game!</p>
            <div style={{ marginTop: '10px' }}>
              <button
                onClick={() => {
                  socket.emit(EVENTS.CHALLENGE_RESPONSE, { toUserId: fromUser.userId, accepted: true });
                  closeToast && closeToast();
                }}
                style={{ marginRight: '10px', padding: '5px', background: 'green', color: 'white' }}
              >
                Accept
              </button>
              <button
                onClick={() => {
                  socket.emit(EVENTS.CHALLENGE_RESPONSE, { toUserId: fromUser.userId, accepted: false });
                  closeToast && closeToast();
                }}
                style={{ padding: '5px', background: 'red', color: 'white' }}
              >
                Decline
              </button>
            </div>
          </div>
        ),
        { autoClose: false, closeOnClick: false, draggable: false, type: 'info' }
      );
      // Play a sound
    });

    socket.on(EVENTS.CHALLENGE_RESULT, ({ message, gameData }: { message: string, gameData?: any }) => {
      toast.info(message);
      if (gameData) {
        // Start game using gameData (includes opponent, startingPlayer, gameId etc.)
        // setGameActive(true); setBoard(...); setCurrentPlayer(...)
        // This logic should be centralized in GameContext or a game service
      }
    });

    // ... other game event listeners (GAME_START, GAME_MOVE_RECEIVE, GAME_END, etc.)
    // These should update the GameContext state

    return () => {
      socket.off(EVENTS.USER_LIST_UPDATED);
      socket.off(EVENTS.CHALLENGE_RECEIVE);
      socket.off(EVENTS.CHALLENGE_RESULT);
      // ... unregister other listeners
    };
  }, [socket, isConnected, user]);


  const handleStartNewGame = (vsChristopher: boolean) => {
    if (vsChristopher) {
      // Logic for challenging Christopher
      socket?.emit(EVENTS.CHALLENGE_CHRISTOPHER, { userId: user?.id });
      toast.info("Challenging Christopher...");
    } else {
      // This button would likely be removed in favor of challenging specific users
      // Or it could be a "find random match" feature
      toast.info("Select a player from the list to challenge.");
    }
    // setGameActive(true); // Actual game start is handled by server response
    // Reset local state (or better, this should be a message to server to start a new game state)
  };

  const handleChallengePlayer = (targetUser: OnlineUser) => {
    if (!user) {
      toast.error("You must be logged in to challenge players.");
      return;
    }
    if (targetUser.userId === 'christopher') { // Assuming a special ID for Christopher
        socket?.emit(EVENTS.CHALLENGE_CHRISTOPHER, { userId: user.id });
        toast.info(`Challenging Christopher...`);
    } else {
        socket?.emit(EVENTS.CHALLENGE_SEND, { fromUserId: user.id, fromUsername: user.username, toUserId: targetUser.userId });
        toast.info(`Challenge sent to ${targetUser.username}!`);
    }
  };


  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (showNameDialog && !isAuthenticated) {
    return <NameInputDialog setShowDialog={setShowNameDialog} />;
  }

  return (
    <div className={`min-h-screen w-full flex flex-col ${darkMode ? 'dark bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <Header />

      <main className="flex-grow flex flex-col md:flex-row p-4 md:p-6 gap-6">
        {/* Left Side: Game Area & Scoreboard (for small screens) */}
        <div className="flex-grow md:w-[70%] flex flex-col items-center">
          {gameActive && (
            <div className="w-full max-w-md mb-4">
              <Timer timeLeft={timeLeft} currentPlayer={currentPlayer} />
            </div>
          )}
          <Board /> {/* Board component will use GameContext */}
          {!gameActive && !winner && (
            <div className="mt-8 flex flex-col items-center space-y-4 md:space-y-0 md:space-x-4 md:flex-row">
              <p className="text-lg">Challenge a player from the list to start a game!</p>
              {/* Button to play vs Christopher directly (if preferred over list challenge) */}
               <button
                 onClick={() => handleChallengePlayer({userId: 'christopher', username: 'Christopher'})} // Special object for Christopher
                 className="px-6 py-3 bg-gradient-to-r from-[#B635D9] to-[#FF4F8B] text-white font-semibold rounded-lg shadow hover:opacity-90 transition-opacity"
               >
                 Play vs Christopher
               </button>
            </div>
          )}
          {winner && (
            <GameEndModal /* Props from GameContext or passed down */ />
          )}
          <div className="md:hidden mt-6 w-full max-w-md"> {/* Scoreboard for mobile */}
            <Scoreboard scores={scores} />
          </div>
        </div>

        {/* Right Side: Scoreboard, Online Players (Sidebar) */}
        <aside className="w-full md:w-[30%] lg:w-[25%] p-4 dark:bg-gray-800 bg-gray-100 rounded-lg shadow">
          <div className="hidden md:block mb-6">
            <Scoreboard scores={scores} />
          </div>
          <UserList
            users={onlinePlayers}
            onChallenge={handleChallengePlayer}
            currentUser={user}
          />
        </aside>
      </main>

      <Footer />
      <ChatIcon onClick={() => setShowChat(prev => !prev)} />
      {showChat && (
        <ChatWindow
            onClose={() => setShowChat(false)}
            currentUser={user} // Pass current user for message alignment
            onlineUsersForChat={onlinePlayers} // Pass for private chat selection
            onChallengePlayer={handleChallengePlayer} // Allow challenging from chat
        />
      )}
    </div>
  );
};

export default GamePage;
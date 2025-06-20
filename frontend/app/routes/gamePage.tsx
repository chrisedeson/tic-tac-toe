// frontend/app/pages/GamePage.tsx
import React, { useState, useEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useGame } from "../contexts/GameContext";
import type { OnlineUser } from "../types";

import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import NameInputDialog from "../components/game/NameInputDialog";
import Board from "../components/game/Board";
import Scoreboard from "../components/game/Scoreboard";
import Timer from "../components/game/Timer";
import GameEndModal from "../components/game/GameEndModal";
import ChatWindow from "../components/chat/ChatWindow";
import UserList from "../components/chat/UserList";
import ChatIcon from "../components/chat/ChatIcon";
import api from "../services/api";

import { EVENTS } from "../../../backend/src/socket/events";
import { toast } from "react-toastify";

const GamePage: React.FC = () => {
  const { darkMode } = useTheme();
  const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { socket, isConnected } = useSocket();
  const { gameActive, timeLeft, currentPlayerId, scores, winner } = useGame();

  const [showNameDialog, setShowNameDialog] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const [onlinePlayers, setOnlinePlayers] = useState<OnlineUser[]>([]);
  const [allUsers, setAllUsers] = useState<OnlineUser[]>([]);
  const [offlinePlayers, setOfflinePlayers] = useState<OnlineUser[]>([]);
  const [isChallengeInProgress, setIsChallengeInProgress] = useState(false);

  useEffect(() => {
    if (!authLoading) {
      setShowNameDialog(!isAuthenticated);
    }
  }, [isAuthenticated, authLoading]);

  useEffect(() => {
    const fetchAllUsers = async () => {
      try {
        const response = await api.get("/users");
        setAllUsers(response.data || []);
      } catch (error) {
      }
    };
    fetchAllUsers();
  }, []);

  useEffect(() => {
    if (!socket || !isConnected || !user) return;

    socket.emit(EVENTS.GET_USER_LIST);

    const handleUserListUpdate = (users: OnlineUser[]) => {
      const filteredOnline = users.filter((u) => u.userId !== user.userID);
      setOnlinePlayers(filteredOnline);

      const offline = allUsers.filter(
        (u) =>
          u.userId !== user.userID &&
          !filteredOnline.some((online) => online.userId === u.userId)
      );
      setOfflinePlayers(offline);
    };

    const handleChallengeReceive = async ({ fromUser }: { fromUser: OnlineUser }) => {
      toast(
        ({ closeToast }) => (
          <div>
            <p>
              <strong>{fromUser.username}</strong> challenges you to a game!
            </p>
            <div style={{ marginTop: 10 }}>
              <button
                onClick={async () => {
                  try {
                    const resp = await api.get(`/users/${fromUser.userId}`);
                    const { gameStatus } = resp.data.user;
                    if (gameStatus === "offline") {
                      socket.emit(EVENTS.CHALLENGE_RESPONSE, {
                        toUserId: fromUser.userId,
                        accepted: true,
                      });
                    } else {
                      toast.info(`${fromUser.username} is currently busy.`, {
                        autoClose: 1000,
                      });
                    }
                  } catch {
                    toast.error(
                      "Could not verify user status. Try again later.",
                      { autoClose: 1000 }
                    );
                  }
                  closeToast?.();
                }}
                style={{
                  marginRight: 8,
                  padding: "6px 12px",
                  background: "green",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Accept
              </button>
              <button
                onClick={() => {
                  socket.emit(EVENTS.CHALLENGE_RESPONSE, {
                    toUserId: fromUser.userId,
                    accepted: false,
                  });
                  closeToast?.();
                }}
                style={{
                  padding: "6px 12px",
                  background: "crimson",
                  color: "white",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Decline
              </button>
            </div>
          </div>
        ),
        {
          autoClose: false,
          closeOnClick: false,
          draggable: false,
          type: "info",
        }
      );
    };

    const handleChallengeResult = ({ message }: { message: string }) => {
      toast.success(message, { autoClose: 2000 });
    };

    socket.on(EVENTS.USER_LIST_UPDATED, handleUserListUpdate);
    socket.on(EVENTS.CHALLENGE_RECEIVE, handleChallengeReceive);
    socket.on(EVENTS.CHALLENGE_RESULT, handleChallengeResult);

    return () => {
      socket.off(EVENTS.USER_LIST_UPDATED, handleUserListUpdate);
      socket.off(EVENTS.CHALLENGE_RECEIVE, handleChallengeReceive);
      socket.off(EVENTS.CHALLENGE_RESULT, handleChallengeResult);
    };
  }, [socket, isConnected, user, allUsers]);

  useEffect(() => {
    if (!socket) return;
    const onNew = () => {
      if (!showChat) setHasUnread(true);
    };
    socket.on(EVENTS.CHAT_MESSAGE_RECEIVE, onNew);
    socket.on(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, onNew);
    return () => {
      socket.off(EVENTS.CHAT_MESSAGE_RECEIVE, onNew);
      socket.off(EVENTS.CHAT_PRIVATE_MESSAGE_RECEIVE, onNew);
    };
  }, [socket, showChat]);

  const handleChallengePlayer = async (targetUser: OnlineUser) => {
    if (!user || !socket) {
      toast.error("You must be logged in to challenge players.");
      // clear stored credentials
      logout();
      setShowNameDialog(true);
      return;
    }
    if (gameActive) {
      toast.info("A game is currently in progress. Please wait.");
      return;
    }
    if (isChallengeInProgress) {
      toast.info("You are already challenging someone. Please wait...");
      return;
    }

    setIsChallengeInProgress(true);

    if (targetUser.userId === "christopher") {
      socket.emit(EVENTS.CHALLENGE_CHRISTOPHER);
      toast.info("Challenging Christopher...");
      setTimeout(() => setIsChallengeInProgress(false), 10000);
      return;
    }

    try {
      const resp = await api.get(`/users/${targetUser.userId}`);
      const { gameStatus } = resp.data.user;

      if (gameStatus === "playing") {
        toast.info(`${targetUser.username} is currently busy.`, {
          autoClose: 2000,
        });
      } else {
        socket.emit(EVENTS.CHALLENGE_SEND, { toUserId: targetUser.userId });
        toast.info(`Challenge sent to ${targetUser.username}!`);
      }
    } catch (err) {
      toast.error("Could not verify user status. Try again later.", {
        autoClose: 2000,
      });
    }

    setTimeout(() => setIsChallengeInProgress(false), 10000);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (showNameDialog && !isAuthenticated) {
    return <NameInputDialog setShowDialog={setShowNameDialog} />;
  }

  return (
    <div
      className={`min-h-screen w-full flex flex-col ${
        darkMode ? "dark bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      <Header />

      <main className="flex-grow flex flex-col md:flex-row p-4 md:p-6 gap-6">
        <div className="flex-grow md:w-[70%] flex flex-col items-center">
          {gameActive && (
            <div className="w-full max-w-md mb-4">
              <Timer timeLeft={timeLeft} currentPlayerId={currentPlayerId} />
            </div>
          )}
          <Board />
          {!gameActive && !winner && (
            <div className="mt-8 flex flex-col items-center space-y-4 md:space-y-0 md:space-x-4 md:flex-row">
              <p className="text-lg">
                Challenge a player from the list to start a game!
              </p>
              <button
                onClick={() =>
                  handleChallengePlayer({
                    userId: "christopher",
                    username: "Christopher",
                  })
                }
                disabled={gameActive || isChallengeInProgress}
                className="px-6 py-3 bg-gradient-to-r from-[#B635D9] to-[#FF4F8B] text-white font-semibold rounded-lg shadow hover:opacity-90 transition-opacity"
              >
                Play vs Christopher
              </button>
            </div>
          )}
          {winner && <GameEndModal />}
          <div className="md:hidden mt-6 w-full max-w-md">
            <Scoreboard scores={scores} />
          </div>
        </div>

        <aside className="w-full md:w-[30%] lg:w-[25%] p-4 dark:bg-gray-800 bg-gray-100 rounded-lg shadow">
          <div className="hidden md:block mb-6">
            <Scoreboard scores={scores} />
          </div>
          <UserList
            onChallenge={handleChallengePlayer}
            currentUser={user}
            onlineUsers={onlinePlayers}
            offlineUsers={offlinePlayers}
            gameActive={gameActive}
          />
        </aside>
      </main>

      <Footer />

      <ChatIcon
        onClick={() => {
          setShowChat((open) => !open);
          setHasUnread(false);
        }}
        unread={hasUnread}
      />

      {showChat && (
        <ChatWindow
          onClose={() => setShowChat(false)}
          // currentUser={user!}
          onlineUsersForChat={onlinePlayers}
          onChallengePlayer={handleChallengePlayer}
        />
      )}
    </div>
  );
};

export default GamePage;

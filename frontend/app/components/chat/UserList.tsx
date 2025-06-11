// frontend/app/components/chat/UserList.tsx
import React from "react";
import type { OnlineUser, User } from "../../types";
import { Button } from "../ui/Button";
import { formatDistanceToNow } from "date-fns";

interface UserListProps {
  onlineUsers: (OnlineUser & { status?: string })[];
  offlineUsers: (OnlineUser & { status?: string })[];
  onChallenge: (user: OnlineUser) => void;
  currentUser: User | null;
  gameActive: boolean;
}

const AI_USER: OnlineUser & { status: string } = {
  userId: "christopher",
  username: "Christopher",
  status: "online",
};

const UserListItem: React.FC<{
  player: OnlineUser & { status?: string };
  onChallenge: (user: OnlineUser) => void;
  gameActive: boolean;
}> = ({ player, onChallenge, gameActive }) => {
  const isOnline = player.status === "online";

  return (
    <li className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
      <div className="flex items-center">
        <div
          className={`h-2.5 w-2.5 rounded-full mr-3 shrink-0 ${
            isOnline ? "bg-green-500" : "bg-gray-500"
          }`}
        />
        <div className="flex flex-col">
          <span className="font-medium">{player.username}</span>
          {!isOnline && player.lastSeen ? (
            <span className="text-xs text-gray-500">
              Last seen{" "}
              {formatDistanceToNow(new Date(player.lastSeen), {
                addSuffix: true,
              })}
            </span>
          ) : null}
        </div>
      </div>

      {isOnline && (
        <Button
          size="sm"
          onClick={() => onChallenge(player)}
          disabled={gameActive}
        >
          Challenge
        </Button>
      )}
    </li>
  );
};

const UserList: React.FC<UserListProps> = ({
  onlineUsers,
  offlineUsers,
  onChallenge,
  currentUser,
  gameActive,
}) => {
  const isCurrentUser = (u: OnlineUser) => u.userId === currentUser?.userID;

  // Combine all users except current user and AI
  const allUsers = [...onlineUsers, ...offlineUsers].filter(
    (u) => !isCurrentUser(u) && u.userId !== AI_USER.userId
  );

  // Filter online users
  const online = allUsers.filter((u) => u.status === "online");

  // Filter offline users and reverse their order (flip upside down)
  const offline = allUsers.filter((u) => u.status !== "online").reverse();

  return (
    <div className="tiny-scrollbar">
      <h2 className="text-xl font-bold mb-4 border-b pb-2 dark:border-gray-700">
        Players
      </h2>
      <ul className="space-y-1 max-h-96 overflow-y-auto">
        {/* AI always on top */}
        <UserListItem
          key={AI_USER.userId}
          player={AI_USER}
          onChallenge={onChallenge}
          gameActive={gameActive}
        />

        {/* Online users */}
        {online.map((player) => (
          <UserListItem
            key={player.userId}
            player={player}
            onChallenge={onChallenge}
            gameActive={gameActive}
          />
        ))}

        {/* Divider */}
        {offline.length > 0 && (
          <hr className="my-2 border-gray-300 dark:border-gray-600" />
        )}

        {/* Offline users reversed */}
        {offline.map((player) => (
          <UserListItem
            key={player.userId}
            player={player}
            onChallenge={onChallenge}
            gameActive={gameActive}
          />
        ))}
      </ul>
    </div>
  );
};

export default UserList;

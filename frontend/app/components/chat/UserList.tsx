// frontend/app/components/chat/UserList.tsx
import React from "react";
import type { OnlineUser, User } from "../../types";
import { Button } from "../ui/Button";
import { formatDistanceToNow } from "date-fns";

interface UserListProps {
  onlineUsers: OnlineUser[];
  offlineUsers: OnlineUser[];
  onChallenge: (user: OnlineUser) => void;
  currentUser: User | null;
}

const UserListItem: React.FC<{player: OnlineUser, isOnline: boolean, onChallenge: (user: OnlineUser) => void}> = ({ player, isOnline, onChallenge }) => {
    return (
        <li className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
            <div className="flex items-center">
                <div className={`h-2.5 w-2.5 rounded-full mr-3 shrink-0 ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                <div className="flex flex-col">
                    <span className="font-medium">{player.username}</span>
                    {!isOnline && player.lastSeen && (
                        <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(player.lastSeen), { addSuffix: true })}
                        </span>
                    )}
                </div>
            </div>
            {isOnline && <Button size="sm" onClick={() => onChallenge(player)}>Challenge</Button>}
        </li>
    );
};


const UserList: React.FC<UserListProps> = ({ onlineUsers, offlineUsers, onChallenge, currentUser }) => {
  const allOnlineUsers = [{ userId: 'christopher', username: 'Christopher' }, ...onlineUsers.filter(u => u.userId !== currentUser?.id)];
  const allOfflineUsers = offlineUsers.filter(u => u.userId !== currentUser?.id);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 border-b pb-2 dark:border-gray-700">Players</h2>
      <ul className="space-y-1 max-h-96 overflow-y-auto">
        {allOnlineUsers.map(player => (
            <UserListItem key={player.userId} player={player} isOnline={true} onChallenge={onChallenge} />
        ))}
        {allOfflineUsers.length > 0 && <hr className="my-2 border-gray-300 dark:border-gray-600"/>}
        {allOfflineUsers.map(player => (
            <UserListItem key={player.userId} player={player} isOnline={false} onChallenge={onChallenge} />
        ))}
      </ul>
    </div>
  );
};

export default UserList;
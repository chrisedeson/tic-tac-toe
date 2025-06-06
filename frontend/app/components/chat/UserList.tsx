// frontend/app/components/chat/UserList.tsx
import React from "react";
import type { OnlineUser, User } from "../../types";
import { Button } from "../ui/Button";

interface UserListProps {
  users: OnlineUser[];
  onChallenge: (user: OnlineUser) => void;
  currentUser: User | null;
}

const UserList: React.FC<UserListProps> = ({ users, onChallenge }) => {
  const allUsers = [
    { userId: "christopher", username: "Christopher" },
    ...users,
  ];

  return (
    <div>
      <h2 className="text-xl font-bold mb-4 border-b pb-2 dark:border-gray-700">
        Online Players
      </h2>
      <ul className="space-y-2 max-h-96 overflow-y-auto">
        {allUsers.map((player) => (
          <li
            key={player.userId}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <div className="flex items-center">
              <div className="h-2.5 w-2.5 rounded-full bg-green-500 mr-3 shrink-0"></div>
              <span className="font-medium">{player.username}</span>
              {player.userId === "christopher" && (
                <span className="ml-2 text-xs text-gray-500">(AI)</span>
              )}
            </div>
            <Button size="sm" onClick={() => onChallenge(player)}>
              Challenge
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default UserList;

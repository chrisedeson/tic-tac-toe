// frontend/app/components/game/NameInputDialog.tsx
import React, { useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";

interface NameInputDialogProps {
  setShowDialog: (show: boolean) => void;
}

const NameInputDialog: React.FC<NameInputDialogProps> = ({ setShowDialog }) => {
  const [name, setName] = useState("");
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      try {
        await login(name.trim());
        setShowDialog(false);
      } catch (err) {
        console.error("Failed to login", err);
        // Add user-facing error message here
      }
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Welcome to Tic-Tac-Toe</DialogTitle>
          <DialogDescription>
            Please enter your name to start playing.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <Input
            id="name"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Button type="submit" disabled={isLoading || !name.trim()}>
            {isLoading ? "Joining..." : "Start Playing"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
export default NameInputDialog;

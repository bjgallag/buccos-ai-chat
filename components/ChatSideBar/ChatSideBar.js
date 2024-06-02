import {
  faMessage,
  faPlus,
  faRightFromBracket,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";
import { useEffect, useState } from "react";

export const ChatSideBar = ({ chatId }) => {
  const [chatsList, setChatsList] = useState([]);

  useEffect(() => {
    const loadChatList = async () => {
      const response = await fetch("/api/chat/getChatList", {
        method: "POST",
      });
      const json = await response.json();
      setChatsList(json?.chats ?? []);
    };
    loadChatList();
  }, [chatId]);
  return (
    <div className="b-chat-sidebar flex h-screen flex-col overflow-hidden bg-gray-800 text-white">
      <Link href="/chat" className="side-menu-item btn hover:bg-yellow-700">
        <FontAwesomeIcon icon={faPlus}></FontAwesomeIcon>
        New Chat
      </Link>
      <div className="flex-1 overflow-auto bg-gray-950">
        {chatsList.map((chat) => (
          <Link
            key={chat._id}
            href={`/chat/${chat._id}`}
            className={`side-menu-item ${chatId === chat._id ? "bg-gray-700 hover:bg-gray-700" : ""}`}
          >
            <FontAwesomeIcon icon={faMessage} className="text-white/50"></FontAwesomeIcon>
              <span title={chat.title} className="whitespace-nowrap overflow-hidden text-ellipsis">{chat.title}</span>
          </Link>
        ))}
      </div>
      <Link href="/api/auth/logout" className="side-menu-item">
        <FontAwesomeIcon icon={faRightFromBracket}></FontAwesomeIcon>
        Logout
      </Link>
    </div>
  );
};

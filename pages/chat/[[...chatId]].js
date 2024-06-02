import { getSession } from "@auth0/nextjs-auth0";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { ChatSideBar } from "components/ChatSideBar";
import { Message } from "components/Message";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";
import { redirect } from "next/dist/server/api-utils";
import Head from "next/head";
import { useRouter } from "next/router";
import { streamReader } from "openai-edge-stream";
import { useEffect, useState } from "react";
import { v4 as uuid } from "uuid";

export default function ChatPage({chatId, title, messages = []}) {
  const [incomingMessage, setIncomingMessage] = useState("");
  const [messageText, setMessageText] = useState("");
  const [newChatMessages, setNewChatMessages] = useState([]);
  const [generatingResponse, setGeneratingResponse] = useState(false);
  const [newChatId, setNewChatId] = useState(null);
  const [fullMessage, setFullMessage] = useState("");
  const [originalChatId, setOriginalChatId] = useState(chatId);
  const router = useRouter();

  const routeHasChanged = chatId !== originalChatId;

  // when route changes, reset state
  useEffect(() => {
    setNewChatMessages([]);
    setNewChatId(null);
  }, [chatId]);

  // save newly streamed message to new chat messages
  useEffect(() => {
    if (!routeHasChanged && !generatingResponse && fullMessage) {
      setNewChatMessages(prev => [...prev, {
        _id: uuid(),
        role: 'assistant',
        content: fullMessage
      }]);
      setFullMessage('');
    }
  }, [generatingResponse, fullMessage, routeHasChanged]);

  // if navigating to new chat
  useEffect(() => {
    if (!generatingResponse && newChatId) {
      setNewChatId(null);
      router.push(`/chat/${newChatId}`);
    }
  }, [newChatId, generatingResponse, router]);

  const handleSubmit = async (e) => {
    setOriginalChatId(chatId);
    e.preventDefault();
    setGeneratingResponse(true);
    // adds user message to the chat window
    setNewChatMessages((previous) => {
      const newMessages = [
        ...previous,
        {
          _id: uuid(),
          role: "user",
          content: messageText,
        },
      ];
      return newMessages;
    });

    setMessageText("");

    const sendMessageResponse = await fetch("/api/chat/sendMessage", {
      method: "POST",
      contentType: "application/json",
      body: JSON.stringify({
        message: messageText,
        chatId
      }),
    });

    const data = sendMessageResponse.body;
    if (!data) {
      return;
    }

    const reader = data.getReader();
    let text = "";
    const responseData = await streamReader(reader, (returnMessage) => {
      if (returnMessage.event == 'newChatId') {
        setNewChatId(returnMessage.content);
      } else {
        setIncomingMessage((s) => (s ?? "") + returnMessage.content);
        text += returnMessage.content;  
      }
    });

    setFullMessage(text);
    console.log("responseData", responseData);
    const incomingMessageText = `${text}`;
    setNewChatMessages((previous) => {
      const newMessages = [
        ...previous,
        {
          _id: uuid(),
          role: "assistant",
          content: incomingMessageText,
        },
      ];
      return newMessages;
    });

    setFullMessage('');
    setIncomingMessage("");
    setGeneratingResponse(false);
  };

  const allMessages = [...messages, ...newChatMessages];

  return (
    <>
      <Head>
        <title>New Chat</title>
      </Head>
      <div className="grid h-screen grid-cols-[260px_1fr]">
        <ChatSideBar chatId={chatId}/>
        <div className="flex flex-col overflow-hidden bg-gray-700">
          <div className="flex-1 flex flex-col-reverse overflow-y-scroll text-white">
            {
              !allMessages.length && !incomingMessage && (<div className="m-auto justify-center flex flex-auto items-center text-center">
                <div>
                  <FontAwesomeIcon icon={faRobot} className="text-6xl text-yellow-500"/> 
                  <h1 className="text-4xl font-bold text-white/50 mt-2">Ask me a question!</h1> 
                </div>
              </div>)
            }
            {!!allMessages.length && <div className="mb-auto">
              {allMessages.map((message) => {
                return (
                  <Message
                    key={message._id}
                    role={message.role}
                    content={message.content}
                  />
                );
              })}
              {!!incomingMessage && !routeHasChanged && (
                <Message role="assistant" content={incomingMessage} />
              )}
              {!!incomingMessage && routeHasChanged && (
                <Message role="notice" content="Only one message at a time. Please allow any other messages to complete before sending other messages" />
              )}
            </div> }
          </div>
          <footer className="bg-gray-800 p-10">
            <form onSubmit={handleSubmit}>
              <fieldset className="flex gap-2" disabled={generatingResponse}>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  className="w-full resize-none rounded-md bg-gray-700 p-2 text-white focus:border-yellow-500 focus:bg-gray-600 focus:outline-yellow-500 "
                  placeholder={
                    generatingResponse
                      ? "Response is coming back from OpenAI..."
                      : "Send a message..."
                  }
                />
                <button type="submit" className="btn">
                  Send
                </button>
              </fieldset>
            </form>
          </footer>
        </div>
      </div>
    </>
  );
}

// name.js makes a route to the /name endpoint
// [name].js makes a dynamic route for a specific param (/chat/xxxxx)
// [...name].js matches any route from the base folder (/chat/xxx, /chat/xxx/xxx)
// [[...name]].js is an optional dynamic route (matches /chat, /chat/xsss, /chat/xxxxd/eeerde)

export const getServerSideProps = async (context) => {
  const chatId = context.params?.chatId?.[0] || null;
  if (chatId) {
    let objectId;
    try {
      objectId = new ObjectId(chatId);
    } catch(e) {
      console.error("chatID is not a valid MongoDB id.", chatId);
      return {
        redirect: {
          destination: '/chat',
        }
      }
    }
    const {user} = await getSession(context.req, context.res);
    const client = await clientPromise;
    const db = client.db("ChattyPiratePete");
    const chat = await db.collection("chats").findOne({
      userId: user.sub,
      _id: objectId,
    });
    if (!chat) {
      return {
        redirect: {
          destination: '/chat',
        }
      };
    }
    return {
      props: {
        chatId, 
        title: chat.title,
        messages: chat.messages.map((message) => ({
          ...message,
          _id: uuid(),
        })),
      }
    }
  }
  return {
    props: {}
  }
}
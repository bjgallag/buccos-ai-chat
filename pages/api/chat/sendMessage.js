import { cookies, headers } from "next/dist/client/components/headers";
import { OpenAIEdgeStream } from "openai-edge-stream";

export const config = {
  runtime: "edge",
};

export default async function handler(req, res) {
  try {
    const { chatId: chatIdFromParam, message } = await req.json();
    if (!message || typeof message !== 'string' || message.length > 200) {
      return new Response(
        {isSuccess: false, message: 'Message was not in the proper format or was more than 200 characters.'},
        {status: 422}
      );
    }
    let chatId = chatIdFromParam;
    const defaultMessageContext = {
      role: "system",
      content:
        "Your name is Pirate Pete. You are a baseball officianto who is very knowledgeable about the Pittsburgh Pirates. You know everything there is about their history and stats. You must format your responses in markdown.",
    };

    let newChatId;

    let response;
    let chatMessages = [];
    let json = {};
    let usedTokens = 0;
    let messagesToInclude = [];
    if (chatIdFromParam) {
      // add message to chat
       response = await fetch(
        `${req.headers.get("origin")}/api/chat/addMessageToChat`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: req.headers.get("cookie")
          },
          body: JSON.stringify({
            chatId,
            role: 'user',
            content: message,
          }),
       });
       json = await response.json();
       chatMessages = json.chat.messages || [];
       console.log('add on route', chatMessages);
    } else {
      // can get the domain name from the client on the request
      response = await fetch(`${req.headers.get("origin")}/api/chat/createNewChat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: req.headers.get("cookie")
        },
        body: JSON.stringify({
          message,
        }),
      });
      json = await response.json();
      newChatId = json._id;
      chatId = json._id;
      chatMessages = json.messages || [];
      console.log('createRoute',chatMessages);
    }

    // implement throttle to allow messages to be sent if they are under the limit
    chatMessages.reverse();

    for(let chatMessage of chatMessages) {
      usedTokens += (chatMessage.content.length / 4) || 0;
      if (usedTokens <= 2000) {
        messagesToInclude.push(chatMessage);
      } 
    }

    messagesToInclude.reverse();

    console.log(messagesToInclude);
    // end of throttling implementation
    const stream = await OpenAIEdgeStream(
      "https://api.openai.com/v1/chat/completions",
      {
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${process.env.OPEN_AI_KEY}`,
        },
        method: "POST",
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            defaultMessageContext,
            ...messagesToInclude
            // {
            //   content: message,
            //   role: "user",
            // },
          ],
          stream: true,
        }),
      },
      {
        onBeforeStream: ({emit}) => {
          if (newChatId) {
            emit(newChatId, "newChatId");
          }
        },
        onAfterStream: async ({fullContent}) => {
          await fetch(`${req.headers.get("origin")}/api/chat/addMessageToChat`, {
            method: "POST",
            headers: {
              'content-type': 'application/json',
              cookie: req.headers.get('cookie')
            },
            body: JSON.stringify({
              chatId: chatId || chatIdFromParam,
              role: 'assistant',
              content: fullContent
            })
          })
        }
      }
    );
    return new Response(stream);
} catch (e) {
    return new Response({
      message: "An error occurred in send message",
    }, {
      status: 500
    });
  }
}

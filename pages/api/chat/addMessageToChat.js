import { getSession } from "@auth0/nextjs-auth0";
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
    try {
        const {user} = await getSession(req, res);
        const client = await clientPromise;
        const db = client.db("ChattyPiratePete");
        
        const {chatId, role, content} = req.body;

        let objectId;

        try {
            objectId = new ObjectId(chatId);
        } catch (e) {
            res.status(422).json({
                message: "Chat ID was not a valid chat ID."
            });
            return;
        }

        // validate role
        if (role !== 'user' && role !== 'assistant') {
            res.status(422).json(
                {isSuccess: false, message: 'Role must be either user or assistant. Role was ' + role + '.' }
              );
              return;
        }

        // validate content for user
        if (role === 'user' && (!content || typeof content !== 'string' || content.length > 200)) {
            res.status(422).json(
              {isSuccess: false, message: 'Message was not in the proper format or was more than 200 characters.'}
            );
            return;
        }

        if (role === 'assistant' && (!content || typeof content !== 'string' || content.length > 100_000)) {
            res.status(422).json(
              {isSuccess: false, message: 'Message from assistant was not in the proper format or was more than 100,000 characters.'}
            );
            return;
        }
        const chat = await db.collection("chats").findOneAndUpdate({
            _id: objectId,
            userId: user.sub,
        }, {
            $push: {
                messages: {
                    role,
                    content
                }
            }
        }, {
            returnDocument: "after"
        });

        res.status(200).json({
            chat: {...chat.value},
            _id: chat.value._id.toString(),
        });
    } catch (error) {
        res.status(500).json({message: 'an error occurred when trying to add a message to the chat.'});
    }
}
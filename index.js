const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const app = express()
const port = process.env.PORT || 3001;


app.use(cors());
app.use(express.json());




const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://chat1122:chat1122@cluster0.4gy1j38.mongodb.net/?appName=Cluster0";

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});



async function run() {
    try {

        await client.connect();
        console.log(" You successfully connected to MongoDB!✅");

        const messagesCollection = client.db("chatDB").collection("messages");



        const io = new Server(httpServer, {
            cors: {
                origin: "*",
            }
        })


        io.on('connection', (socket) => {
            console.log('a user connected:', socket.id, "is connected");

            // handle join room
            socket.on("user_join_Room", async (data) => {
                const { username, roomId } = data || {};

                socket.join(roomId);

                // notify others in room
                socket.to(roomId).emit("user_join_Room", {
                    text: `${username} has joined the chat room.`,
                });

                // 1️⃣ Fetch previous messages from MongoDB and send to this user
                try {
                    const messages = await messagesCollection
                        .find({ roomId })
                        .sort({ timestamp: 1 })
                        .toArray();

                    // Send previous messages ONLY to the joining user
                    socket.emit("room_messages", messages);
                } catch (error) {
                    console.error("Error fetching messages from MongoDB:", error);
                }


                console.log(`user with id: ${username} joined room: ${roomId}`);

                // broadcast the message  to everyone in the room
                socket.on("send_message", async ({ username, roomId, text }) => {

                    try {
                        // Save message to MongoDB
                        const messageDocument = {
                            username,
                            roomId,
                            text,
                            type: "regular",
                            timestamp: new Date(),
                        };
                        const result = await messagesCollection.insertOne(messageDocument);

                        // 2️⃣ Emit message to everyone in the room (including sender)
                        socket.to(roomId).emit("message", {
                            // _id: result.insertedId,
                            ...messageDocument,
                        });

                    } catch (error) {
                        console.error("Error saving message to MongoDB:", error);
                    }

                    // socket.to(roomId).emit("message", { username, text, type: "regular" });
                })

                // handle user disconnect
                socket.on("user_left_Room", ({ username, roomId }) => {
                    socket.to(roomId).emit("message", {
                        username,
                        text: `${username} has left the chat room.`, type: 'notif',
                    });

                })

                // Detecting typing activity
                socket.on("user_typing", ({ username, roomId }) => {
                    // send to everyone in room EXCEPT sender
                    socket.to(roomId).emit("user_typing", { username });
                });

            })
        })



    } catch (error) {
        console.error("Error connecting to MongoDB:❌", error);
    }
}
run();

const httpServer = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

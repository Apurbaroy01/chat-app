const express = require('express');
const { Server } = require('socket.io');
const app = express()
const port = process.env.PORT || 3001;


const httpServer = app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

const io = new Server(httpServer, {
    cors: {
        origin: "*",
    }
})

io.on('connection', (socket) => {
    console.log('a user connected:', socket.id, "is connected");

    // handle join room
    socket.on("user_join_Room", (data) => {
        const { username, roomId } = data || {};

        socket.join(roomId);

        // notify others in room
        socket.to(roomId).emit("user_join_Room", {
            text: `${username} has joined the chat room.`,
        });

        console.log(`user with id: ${username} joined room: ${roomId}`);

        // broadcast the message  to everyone in the room
        socket.on("send_message", ({ username, roomId, text }) => {
            socket.to(roomId).emit("message", { username, text, type: "regular" });
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
const {Server, Socket} = require('socket.io')

let io;

function initSocket(httpServer) {
    io = new Server(httpServer, {
        cors: {origin: '*', methods: ['GET', 'POST']}
    });

    io.on('connection', socket => {
        socket.on('auth:join', (userId) => {
            if(userId) socket.join(String(userId));
        });
        socket.on('disconnect', _ => {})
    })

    return io;
}

function getIO() {
    if(!io) throw new Error('Socket.io not initialized');
    return io;
}


module.exports = {initSocket, getIO}
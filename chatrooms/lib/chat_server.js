var socketio = require('socket.io');
var io,
    guestNumber = 1,
    nickNames = {},
    namesUsed = [],
    currentRoom = {};

/**
 * 启动 socket.io 服务器，确定如何处理每个进来的连接
 * @param  {[type]} server [description]
 * @return {[type]}        [description]
 */
exports.listen = function(server){
    io = socketio.listen(server);
    io.set('log level', 1);

    io.sockets.on('connection', function(socket){ // 每个用户连接的处理逻辑
        guestNumber = assignGuestName(socket, guestNumber, nickNames, namesUsed); // 赋予访问名

        joinRoom(socket, 'Lobby'); // 放到聊天室 Lobby

        handleMessageBroadcasting(socket, nickNames); // 处理消息
        handleNameChangeAttempts(socket, nickNames, namesUsed); // 处理更名
        handleRoomJoining(socket); // 处理聊天室变更

        socket.on('rooms', function(){ // 用户发请求时，向其提供已被占用的聊天室的列表
            socket.emit('rooms', io.sockets.manager.rooms); // 所有房间信息， socket.join(room)时就会加入其中
        });

        handleClientDisconnection(socket, nickNames, namesUsed); // 断开连接后的清理
    });
};

/**
 * 分配昵称
 */
function assignGuestName(socket, guestNumber, nickNames, namesUsed){
    var name = 'Guest' + guestNumber;
    nickNames[socket.id] = name; // 把用户昵称与客户端连接ID关联起来
    socket.emit('nameResult',{
        success: true,
        name: name
    });
    namesUsed.push(name); // 记录已用昵称
    return guestNumber + 1;
}

/**
 * 进入房间
 */
function joinRoom(socket, room){
    socket.join(room); // 进房间

    if(currentRoom[socket.id]){ // 不是第一次加入，是换房，告诉之前房间的人，他走了
        socket.broadcast.to(currentRoom[socket.id]).emit('message',{ 
            text: nickNames[socket.id] + ' has leave ' + currentRoom[socket.id] + ' for ' + room + '.'
        });
    }

    currentRoom[socket.id] = room; // 记录当前房间

    socket.emit('joinResult', {room: room}); // 告诉用户他进了房间

    socket.broadcast.to(room).emit('message',{ // 广播到该房间，有人进来了
        text: nickNames[socket.id] + ' has joined ' + room + '.'
    });

    var usersInRoom = io.sockets.clients(room);
    if(usersInRoom.length > 1){ // 如果该房间不止一人，汇总下都有谁
        var usersInRoomSummary = 'Users currently in ' + room + ': ';
        for(var index in usersInRoom){
            var userSocketId = usersInRoom[index].id; // 就是每位用户的 socket.id
            if(userSocketId != socket.id){ // 不是当前用户，就记录进去
                if(index > 0){
                    usersInRoomSummary += ',';
                }
                usersInRoomSummary += nickNames[userSocketId];
            }
        }
        usersInRoomSummary += '.';
        socket.emit('message', {text: usersInRoomSummary}); // 告诉用户有哪些人在该房间
    }
}

/**
 * 变更昵称
 * 不能是 Guest 开头，不能是已占用的昵称
 */
function handleNameChangeAttempts(socket, nickNames, namesUsed){
    socket.on('nameAttempt', function(name){ // 添加 nameAttempt 事件监听器
        if(name.indexOf('Guest')==0){ // 昵称不能 Guest 开头
            socket.emit('nameResult',{
                success: false,
                message: 'Names cannot begin with "Guest".'
            });
        }else{
            if(namesUsed.indexOf(name) == -1){ // 可以使用该昵称
                var previousName = nickNames[socket.id];
                var previousNameIndex = namesUsed.indexOf(previousName);
                namesUsed.push(name); // 记录改名到已使用
                nickNames[socket.id] = name; // 改名
                delete namesUsed[previousNameIndex]; // 删除之前的已使用
                socket.emit('nameResult',{
                    success: true,
                    name: name
                });
                socket.broadcast.to(currentRoom[socket.id]).emit('message',{
                    text: previousName + ' is now known as ' + name + '.'
                });
            }else{ // 已使用
                socket.emit('nameResult', {
                    success: false,
                    message: 'That name is already in use.'
                });
            }
        }
    });
}

/**
 * 发送聊天消息
 */
function handleMessageBroadcasting(socket){
    socket.on('message', function(message){ // 添加 message 事件，每次用户发送信息时触发
        socket.broadcast.to(message.room).emit('message',{
            text: nickNames[socket.id] + ':' + message.text
        });
    })
}

/**
 * 加入已有房间，或创建房间
 */
function handleRoomJoining(socket){
    socket.on('join', function(room){ // room 是客户端传过来的
        socket.leave(currentRoom[socket.id]); // 跳出当前房间
        joinRoom(socket, room.newRoom);
    })
}

/**
 * 用户断开连接，删除昵称，已使用昵称
 */
function handleClientDisconnection(socket){
    socket.on('disconnect', function(){
        var nameIndex = namesUsed.indexOf(nickNames[socket.id]);
        delete namesUsed[nameIndex];
        delete nickNames[socket.id];
    });
}

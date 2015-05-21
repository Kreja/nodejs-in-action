/**
 * 初始化
 */
var socket = io.connect();

$(document).ready(function(){
    var chatApp = new Chat(socket);

    // 更名的结果
    socket.on('nameResult', function(result){
        var message;

        if(result.success){
            message = 'You are now known as ' + result.name + '.';
        }else{
            message = result.message;
        }

        $('#messages').append(divSystemContentElement(message));
    });

    // 换房的结果
    socket.on('joinResult', function(result){
        $('#room').text(result.room);
        $('#messages').append(divSystemContentElement('Room changed.'));
    });

    // 显示接收到的信息
    socket.on('message', function(message){
        var newElement = $('<div></div>').text(message.text);
        $('#messages').append(newElement);
    });

    // 显示可用房间
    socket.on('rooms', function(rooms){
        $('#room-list').empty();

        for(var room in rooms){
            room = room.substring(1, room.length);
            if(room != ''){
                $('#room-list').append(divEscapedContentElement(room));
            }
        }

        $('#room-list div').click(function(){ // 点击切换房间
            chatApp.processCommand('/join ' + $(this).text());
            $('#send-message').focus();
        });
    });

    // 定期请求房间列表
    setInterval(function(){
        socket.emit('rooms');
    }, 1000);

    $('#send-message').focus();

    // 提价表单，发送消息
    $('#send-form').submit(function(){
        processUserInput(chatApp, socket);
        return false;
    });
});

/**
 * 显示可疑文本
 */
function divEscapedContentElement(message){
    return $('<div></div>').text(message); // 会转义，防止 xss ？？
}

/**
 * 显示可信文本
 */
function divSystemContentElement(message){
    return $('<div></div>').html('<i>' + message + '</i>');
}

/**
 * 处理用户输入
 * 输入内容以 / 开头，就作为命令处理
 * 不是以 / 开头，就作为聊天消息，发给服务器，然后广播给别人，并添加到用户所在聊天室的记录中
 */
function processUserInput(chatApp, socket){
    var message = $('#send-message').val();
    var systemMessage;

    if(message.charAt(0)=='/'){ // 是命令
        systemMessage = chatApp.processCommand(message);
        if(systemMessage){
            $('#messages').append(divSystemContentElement(systemMessage)); // 系统返回的，可信信息
        }
    }else{ // 不是命令，发送聊天信息 
        chatApp.sendMessage($('#room').text(), message);
        $('#messages').append(divEscapedContentElement(message)); // 用户输入的，可疑信息
        $('messages').scrollTop($('#messages').prop('scrollHeight'));
    }

    $('#send-message').val('');
}
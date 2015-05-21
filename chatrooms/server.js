var http = require('http'),
    fs = require('fs'),
    path = require('path'),
    mime = require('mime');

var cache = {};

/**
 * 处理 404 错误
 * @param  {[type]} response [description]
 * @return {[type]}          [description]
 */
function send404(response){
    // response.writeHead(404, {'Content-Type': 'text/plain'}); // http 头
    // response.write('Error 404: not found.'); // 内容
    // response.end();
} 

/**
 * 发送文件
 * @param  {[type]} response     [description]
 * @param  {[type]} filePath     [文件路径]
 * @param  {[type]} fileContents [文件内容]
 * @return {[type]}              [description]
 */
function sendFile(response, filePath, fileContents){
    response.writeHead(200,{'Content-Type':mime.lookup(path.basename(filePath))}); // http 头
    response.end(fileContents);
}

/**
 * 提供静态文件
 * @param  {[type]} response [description]
 * @param  {[type]} cache    [缓存，之前定义的全局变量]
 * @param  {[type]} absPath  [文件路径]
 * @return {[type]}          [description]
 */
function serverStatic(response, cache, absPath){
    if(cache[absPath]){ // 检查文件是否缓存再内存中
        sendFile(response, absPath, cache[absPath]); // 是，就返回静态文件
    }else{ // 没缓存
        fs.exists(absPath, function(exists){ // 检查文件是否存在

            if(exists){ // 存在
                fs.readFile(absPath, function(err, data){ // 从硬盘读取文件

                    if(err){
                        send404(response);
                    }else{
                        cache[absPath] = data; // 缓存到内存
                        sendFile(response, absPath, data) // 返回文件
                    }

                })
            }else{ // 不存在
                send404(response);
            }

        })
    }
}

/**
 * 创建服务器
 * @param  {[type]} request     [description]
 * @param  {[type]} response){                  var filePath [description]
 * @return {[type]}             [description]
 */
var server = http.createServer(function(request, response){ // 对每个请求的处理
    var filePath = false;

    if(request.url == '/'){
        filePath = 'public/index.html';
    }else{
        filePath = 'public' + request.url;
    }
    var absPath = './' + filePath;
    serverStatic(response, cache, absPath); // 发送文件
});

/**
 * 启动服务器
 * @param  {[type]} ){  } [description]
 * @return {[type]}     [description]
 */
server.listen(3000, function(){
    console.log('Server listening on port 3000.');
});

/**
 * 设置 socket.io 服务器
 */
var chatServer = require('./lib/chat_server');
chatServer.listen(server); // 启动 socket.io 服务器，给他 server 使它跟 server 共享一个端口
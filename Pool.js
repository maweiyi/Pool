/**
 * Created by maweiyi on 7/18/16.
 */

var Event = require('events');

/**
 *
 * @param size 连接池的大小
 * @param build 创建连接池的函数
 * @constructor
 */
function Pool(size, build) {

    this.size = size; //连接池的大小
    this.connectionPool = []; //池中的连接,以IP+PORT作为键值对
    this.pending = 0; //正在使用的连接
    this.generator =null; // socket生成器

    if(build) {
        this.factory(build);
    }
}


Pool.prototype.factory = function factory (build) {

    if (typeof build !== 'function') {
        throw new Error("build必须是个函数");
    }

    this.generator = build;
    return this;
};

/**
 *
 * @param IP
 * @param PORT
 * @param fn
 * @returns {Pool}
 */

Pool.prototype.allocate = function (IP, PORT, fn) {
    if (!this.generator) {
        fn(new Error("没有指定build"));
        return this;
    }
    self = this;

    function either(err) {
        this.removeListener('connect', either);
        this.removeListener('timeout', timeout);

        // Add to the pool
        if (!err) self.connectionPool[IP + PORT] = connection;
        self.pending--;
        fn(err, this);
    }

    function timeout() {
        this.removeListener('timeout', timeout);
        self.pending--;
        fn(new Error('Timed out while trying to establish connection'), this);
    }
    var connection;
    connection = this.connectionPool[IP + PORT];
    if (connection == undefined) {
        //没有可用的需要重新创建一个
        if((this.connectionPool.length + this.pending) < this.size) {
            connection = this.generator(PORT, IP);//生成一个
            connection.setKeepAlive(true);

            if (connection) {
                this.pending++;
                this.listen(connection, fn);

            }
                connection.on('connect', either)
                .on('timeout', timeout)
        } else {
            var i = 0;
            for (var key in Object.keys(this.connectionPool)) {
                if (i < 10) delete this.connectionPool[key];
            }
        }

    } else {
        probability = this.isAvailable(IP, PORT, connection);
        if (probability === 100) {
            console.log("发现了一个可以使用的TCP");
            fn(undefined, connection);
        }
    }



};

//检测是否可用
Pool.prototype.isAvailable = function isAvailable (IP, PORT, socket) {
    var writable = socket.readyState === 'open' || socket.readyState === 'writeOnly';
    if (writable && this.connectionPool[IP + PORT] === socket) {
        //console.log("IP + PORT", IP, PORT);
        //console.log("socket", socket);
       // console.log("connectionPool", this.connectionPool);
        return 100;
    } else {
        return 0;
    }
};

Pool.prototype.listen = function listen(net, fn) {
    if (!net) return this;
    var self = this;

    function rege() {

        fn("错误", null);
        net.destroySoon();

        self.remove(net);

        net.removeListener('error', rege);
        net.removeListener('end', rege);
    }

    net.once('error', rege)

};

Pool.prototype.release = function release(net) {
    var index = this.connectionPool.indexOf(net);
    if (index === -1) return false;
    if (net) net.destroy();
    this.connectionPool.splice(index, 1);
};

Pool.prototype.remove = Pool.prototype.release;

module.exports = Pool;

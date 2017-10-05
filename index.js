let chalk = require('chalk'),
    {inspect} = require("util");

/**
 * @function log
 * @description Logs a message with the given title.
 * @param {string} title The log title.
 * @param {object} styles The title and message styles, using chalk or similar.
 * @param {function(title: string)} [styles.title=chalk.gray] The title styler.
 * @param {function(message: string)} [styles.message=chalk.white] The message styler.
 * @param {function(message: string)} [stream=console.log] The function to log output with.
 * @param {[*]} messages The message to be logged.
 */
let log = function(title, styles, stream, ...messages) {
    let titleStyle = styles.title || chalk.gray;
    let messageStyle = styles.message || chalk.white;
    stream = stream || console.log;
    if (messages[0].toLowerCase().startsWith(`${title.toLowerCase()}: `)) {
        messages[0] = messages[0].slice(title.length + 2);
    }
    let output = [chalk.gray(new Date().toLocaleString() + " |"), titleStyle(`${title}:`)].concat(messages.map(message => messageStyle(
        typeof message === "string" ? message : inspect(message)
    )));
    stream.apply(undefined, output);
};

let loggers = {
    // General
    log,
    info:       log.bind(undefined, "Info", {title: chalk.white}, undefined),
    verbose:    log.bind(undefined, "Verbose", {title: chalk.gray.italic, message: chalk.gray.italic}, undefined),
    warn:       log.bind(undefined, "Warning", {title: chalk.yellow, message: chalk.white.italic}, undefined),
    error:      log.bind(undefined, "Error", {title: chalk.red.bold, message: chalk.red}, undefined),
    // Semantic
    setup:      log.bind(undefined, "Setup", {}, undefined),
    create:      log.bind(undefined, "Create", {title: chalk.green}, undefined),
    notFound:   log.bind(undefined, "Not Found", {title: chalk.red}, undefined),
    incomingRequest:    log.bind(undefined, "Incoming Request", {title: chalk.pink}, undefined),
    outgoingResponse:    log.bind(undefined, "Outgoing Response", {title: chalk.pink}, undefined),
    success:    log.bind(undefined, "Success", {title: chalk.green}, undefined),
    failure:    log.bind(undefined, "Failure", {title: chalk.red}, undefined),
    event:      log.bind(undefined, "Event", {title: chalk.blue}, undefined)
};

loggers.important = function(log, message) {
    log("/" + "-".repeat(message.length + 2) + "\\");
    log(`| ${message} |`);
    log("\\" + "-".repeat(message.length + 2) + "/");
};

loggers.middleware = {
    inboundRequests: function(req, res, next) {
        loggers.incomingRequest(
            ` ${chalk.cyan(`HTTP ${req.httpVersion}`)} ` +
            `${chalk.magenta(req.method)} ` +
            `${chalk.green(req.originalUrl)} ` +
            `from http://${req.ip}/`
        );
        next();
    },
    outboundResponses: function (req, res, next) {
        let oldSend = res.send;
        res.send = function(data) {
            let outgoingMessage =
                `${chalk.cyan(`HTTP ${req.httpVersion}`)} ` +
                `${chalk.magenta(req.method)} ` +
                `${chalk.green(req.originalUrl)} ` +
                `to http://${req.ip}/, ` +
                `status: ${res.statusCode}`;
            if (res.statusCode < 400 && data) { // Log errors separately
                loggers.outgoingResponse(outgoingMessage, ", data: ", data);
            } else {
                loggers.outgoingResponse(outgoingMessage);
            }
            res.send = oldSend;
            res.send.apply(res, arguments);
        };
        next();
    },
    errorred: function(err, req, res, next) {
        loggers.error(err.stack);
        next(err);
    },
    notFound: function(req, res, next) {
        loggers.notFound(`Inbound request to ${req.originalUrl}`);
        next();
    }
};

loggers.injectPromiseMethods = () => {
    Promise.prototype.log = function(log, message) {
        return this.then(val => {
            log(message);
        return val;
    });
    };
    Promise.prototype.logError = function(log, message) {
        return this.catch(err => {
            log(`${message}\nError: ${inspect(err)}`);
        throw err;
    });
    };
    Promise.prototype.isAttemptingTo = function(action) {
        return this
            .log(loggers.success, action)
            .logError(loggers.failure, action)
    };
    return true;
};


/**
 * @module logging
 * @author Max Ainatchi
 */
module.exports = loggers;
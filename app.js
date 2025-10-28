"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Load environment variables from .env file
const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const path = require("path");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const index_1 = require("./routes/index");
const user_1 = require("./routes/user");
const dxf_processor_1 = require("./routes/dxf-processor");
const canvas_renderer_1 = require("./routes/canvas-renderer");
const config_1 = require("./config");
const request_id_middleware_1 = require("./middleware/request-id.middleware");
const debug = require('debug')('my express app');
const app = express();
// Request ID middleware (must be first)
app.use(request_id_middleware_1.requestIdMiddleware);
// Logging middleware
if (config_1.default.logging.enabled) {
    app.use(morgan(config_1.default.logging.format));
}
// CORS configuration
if (config_1.default.cors.enabled) {
    app.use(cors({
        origin: config_1.default.cors.origins,
        credentials: config_1.default.cors.credentials,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id'],
    }));
}
// Body parser middleware
app.use(bodyParser.json({ limit: '50mb' })); // Large limit for glyph data
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.use(express.static(path.join(__dirname, 'public')));
// Serve static files from storage directory (for preview images)
app.use('/storage', express.static(path.join(__dirname, 'storage')));
app.use('/', index_1.default);
app.use('/users', user_1.default);
app.use('/api', dxf_processor_1.default); // Mount DXF processor routes under /api
app.use('/api', canvas_renderer_1.default); // Mount Canvas renderer routes under /api
// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err['status'] = 404;
    next(err);
});
// error handlers
// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use((err, req, res, next) => {
        res.status(err['status'] || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}
// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});
app.set('port', config_1.default.port);
const server = app.listen(app.get('port'), function () {
    const address = server.address();
    console.log(`==============================================`);
    console.log(`  API Canvas Server`);
    console.log(`  Environment: ${config_1.default.environment}`);
    console.log(`  Port: ${address.port}`);
    console.log(`  Auth: ${config_1.default.auth.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`  CORS: ${config_1.default.cors.enabled ? 'Enabled' : 'Disabled'}`);
    console.log(`  Progress Tracking: ${config_1.default.processing.enableProgress ? 'Enabled' : 'Disabled'}`);
    console.log(`==============================================`);
    debug(`Express server listening on port ${address.port}`);
});
exports.default = app;
//# sourceMappingURL=app.js.map
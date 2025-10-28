// Load environment variables from .env file
import * as dotenv from 'dotenv';
dotenv.config();

import * as express from 'express';
import { AddressInfo } from 'net';
import * as path from 'path';
import * as cors from 'cors';
import * as bodyParser from 'body-parser';
import * as morgan from 'morgan';

import routes from './routes/index';
import users from './routes/user';
import dxfProcessor from './routes/dxf-processor';
import canvasRenderer from './routes/canvas-renderer';
import config from './config';
import { requestIdMiddleware } from './middleware/request-id.middleware';

const debug = require('debug')('my express app');
const app = express();

// Request ID middleware (must be first)
app.use(requestIdMiddleware);

// Logging middleware
if (config.logging.enabled) {
  app.use(morgan(config.logging.format));
}

// CORS configuration
if (config.cors.enabled) {
  app.use(cors({
    origin: config.cors.origins,
    credentials: config.cors.credentials,
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

app.use('/', routes);
app.use('/users', users);
app.use('/api', dxfProcessor); // Mount DXF processor routes under /api
app.use('/api', canvasRenderer); // Mount Canvas renderer routes under /api

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new Error('Not Found');
    err[ 'status' ] = 404;
    next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use((err, req, res, next) => { // eslint-disable-line @typescript-eslint/no-unused-vars
        res.status(err[ 'status' ] || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
// no stacktraces leaked to user
app.use((err, req, res, next) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

app.set('port', config.port);

const server = app.listen(app.get('port'), function () {
  const address = server.address() as AddressInfo;
  console.log(`==============================================`);
  console.log(`  API Canvas Server`);
  console.log(`  Environment: ${config.environment}`);
  console.log(`  Port: ${address.port}`);
  console.log(`  Auth: ${config.auth.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  CORS: ${config.cors.enabled ? 'Enabled' : 'Disabled'}`);
  console.log(`  Progress Tracking: ${config.processing.enableProgress ? 'Enabled' : 'Disabled'}`);
  console.log(`==============================================`);
  debug(`Express server listening on port ${address.port}`);
});

export default app;
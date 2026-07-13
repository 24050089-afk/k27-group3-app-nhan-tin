const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const router = require('./routers');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', router);

app.use(errorMiddleware);

module.exports = app;

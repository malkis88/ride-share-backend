require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./src/routes/authRoutes');
const rideRoutes = require('./src/routes/rideRoutes');
const uploadRoutes = require('./src/routes/uploadRoutes');
const initSockets = require('./src/sockets');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/upload', uploadRoutes);


app.get('/', (req, res) => res.send('Ride share API running'));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

// make io accessible in controllers via app
app.set('io', io);
initSockets(io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => console.error('MongoDB connection error:', err));
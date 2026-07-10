module.exports = function initSockets(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // driver broadcasts live location
    socket.on('driver:location', (data) => {
      // data: { rideId, driverId, lat, lng }
      io.emit(`driver:location:${data.rideId}`, data);
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });
};
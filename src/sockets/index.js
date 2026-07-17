module.exports = function initSockets(io) {
  // userId -> socket.id
  const onlineUsers = new Map();

  io.on("connection", (socket) => {
    console.log("Socket connected:", socket.id);

    // ============================
    // REGISTER USER
    // ============================
    socket.on("register", ({ userId, role }) => {
      if (!userId) return;

      onlineUsers.set(userId, socket.id);

      socket.userId = userId;
      socket.role = role;

      socket.join(`user:${userId}`);

      if (role === "driver") {
        socket.join("drivers");
      }

      console.log(`${role} registered: ${userId}`);
    });

    // ============================
    // JOIN RIDE ROOM
    // ============================
    socket.on("joinRide", ({ rideId }) => {
      if (!rideId) return;

      socket.join(`ride:${rideId}`);

      console.log(`${socket.userId} joined ride ${rideId}`);
    });

    // ============================
    // LEAVE RIDE ROOM
    // ============================
    socket.on("leaveRide", ({ rideId }) => {
      socket.leave(`ride:${rideId}`);
    });

    // ============================
    // DRIVER LIVE LOCATION
    // ============================
    socket.on("driver:location", (data) => {
      if (!data?.rideId) return;

      io.to(`ride:${data.rideId}`).emit(
        "driver:location",
        data
      );
    });

    // ============================
    // DISCONNECT
    // ============================
    socket.on("disconnect", () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
      }

      console.log("Socket disconnected:", socket.id);
    });
  });

  // Make helper available everywhere
  io.onlineUsers = onlineUsers;
};
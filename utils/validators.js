function validateBooking({ room, start, end }) {
  if (!room || !start || !end) {
    return "All fields (room, start, end) are required.";
  }
  if (new Date(start) >= new Date(end)) {
    return "Start time must be before end time.";
  }
  return null;
}

function validateUser({ username, password, role }) {
  if (!username || !password || !role) {
    return "Username, password, and role are required.";
  }
  if (!["admin", "user"].includes(role)) {
    return "Role must be admin or user.";
  }
  return null;
}

module.exports = { validateBooking, validateUser };

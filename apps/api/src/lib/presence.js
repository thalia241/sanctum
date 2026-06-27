const connectionCounts = new Map();

function normalizeUserId(userId) {
  return String(userId);
}

function markUserOnline(userId) {
  const key = normalizeUserId(userId);
  const current = connectionCounts.get(key) || 0;
  connectionCounts.set(key, current + 1);
  return current === 0;
}

function markUserOffline(userId) {
  const key = normalizeUserId(userId);
  const current = connectionCounts.get(key) || 0;

  if (current <= 1) {
    connectionCounts.delete(key);
    return true;
  }

  connectionCounts.set(key, current - 1);
  return false;
}

function isUserOnline(userId) {
  const key = normalizeUserId(userId);
  return (connectionCounts.get(key) || 0) > 0;
}

function getPresenceSnapshot(userIds = []) {
  const snapshot = {};

  for (const userId of userIds) {
    const key = normalizeUserId(userId);
    snapshot[key] = {
      isOnline: isUserOnline(key),
    };
  }

  return snapshot;
}

module.exports = {
  markUserOnline,
  markUserOffline,
  isUserOnline,
  getPresenceSnapshot,
}; 
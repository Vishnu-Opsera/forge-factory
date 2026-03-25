const USERS_KEY = 'forge_users';
const SESSION_KEY = 'forge_session';

function hashPassword(pw) {
  return btoa(encodeURIComponent(pw + '_forge_2024_salt'));
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
}

function createSession(user) {
  const session = {
    userId: user.id,
    name: user.name,
    email: user.email,
    token: crypto.randomUUID(),
    at: Date.now(),
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; }
}

export function hasAnyUser() {
  return getUsers().length > 0;
}

export function isEmailRegistered(email) {
  return getUsers().some(u => u.email.toLowerCase() === email.trim().toLowerCase());
}

export function registerUser(name, email, password) {
  const users = getUsers();
  if (users.some(u => u.email.toLowerCase() === email.trim().toLowerCase())) {
    throw new Error('An account with this email already exists. Please log in.');
  }
  const user = {
    id: crypto.randomUUID(),
    name: name.trim(),
    email: email.trim().toLowerCase(),
    passwordHash: hashPassword(password),
    createdAt: Date.now(),
  };
  users.push(user);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
  return createSession(user);
}

export function loginUser(email, password) {
  const user = getUsers().find(u => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user) throw new Error('No account found with this email.');
  if (user.passwordHash !== hashPassword(password)) throw new Error('Incorrect password.');
  return createSession(user);
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

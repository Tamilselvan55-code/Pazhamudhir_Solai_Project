export const validatePasswordPolicy = (password, policy = 'Medium') => {
  if (!password) return false;
  if (policy === 'Low') {
    return password.length >= 6;
  }
  if (policy === 'Medium') {
    // Min 8 characters, at least 1 letter and 1 number
    return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  }
  if (policy === 'High') {
    // Min 10 characters, at least 1 uppercase, 1 lowercase, 1 number, and 1 special character
    return password.length >= 10 &&
           /[a-z]/.test(password) &&
           /[A-Z]/.test(password) &&
           /[0-9]/.test(password) &&
           /[^A-Za-z0-9]/.test(password);
  }
  return password.length >= 6;
};

export const handleFailedLogin = async (account) => {
  // Account could be Admin or User document
  account.loginAttempts = (account.loginAttempts || 0) + 1;
  return account.save();
};

export const resetFailedLogin = async (account) => {
  account.loginAttempts = 0;
  account.lockUntil = null;
  return account.save();
};

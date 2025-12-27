// Function to check password complexity
const isPasswordComplex = (password) => {
  // Minimum length of 8 characters
  if (password.length < 8) {
    return false;
  }
  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return false;
  }
  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return false;
  }
  // Must contain at least one digit
  if (!/\d/.test(password)) {
    return false;
  }
  // Must contain at least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return false;
  }
  return true;
};

module.exports = isPasswordComplex;

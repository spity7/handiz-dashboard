const isTokenValidForUser = (decoded, user) => {
  if (!user?.passwordChangedAt || !decoded?.iat) {
    return true;
  }

  return decoded.iat * 1000 >= user.passwordChangedAt.getTime();
};

module.exports = isTokenValidForUser;

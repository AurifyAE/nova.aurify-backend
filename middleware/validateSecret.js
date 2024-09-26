const isSecretValid = (providedSecret) => {
    return providedSecret === process.env.CHAT_SECRET;
  };
export { isSecretValid };
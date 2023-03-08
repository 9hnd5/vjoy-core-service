export const generateNumber = (length: number) => {
  return Math.floor(Math.random() * 9 * Math.pow(10, length - 1)) + Math.pow(10, length - 1);
};

export const CI_DEFAULT_PART_SIZE = 16 * 1024 * 1024;
export const CI_MIN_PART_SIZE = 5 * 1024 * 1024;

export const CI_PART_SIZE = (() => {
  const fromEnv = parseInt(process.env.CI_PART_SIZE || '', 10);
  if (fromEnv > 0) {
    return Math.max(CI_MIN_PART_SIZE, fromEnv);
  }
  return CI_DEFAULT_PART_SIZE;
})();

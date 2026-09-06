export const CI_DEFAULT_PART_SIZE = 16 * 1024 * 1024;

export const CI_PART_SIZE = (() => {
  const fromEnv = parseInt(process.env.CI_PART_SIZE || '', 10);
  return fromEnv > 0 ? fromEnv : CI_DEFAULT_PART_SIZE;
})();
/** A deep $state proxy, for tests that mutate state a component reads. */
export function reactive<T extends object>(value: T): T {
  const proxy = $state(value);
  return proxy;
}

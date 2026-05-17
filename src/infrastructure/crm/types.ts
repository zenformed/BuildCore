/** Repository return type: mock implementations may return synchronously; API returns Promises. */
export type CrmRepositoryResult<T> = T | Promise<T>;

export async function resolveCrmRepositoryResult<T>(result: CrmRepositoryResult<T>): Promise<T> {
  return Promise.resolve(result);
}

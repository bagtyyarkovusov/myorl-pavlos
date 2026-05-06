/**
 * Discriminant values for {@link CmsError}.
 */
export type CmsErrorKind = "network" | "timeout" | "not_found" | "server_error" | "validation";

const ERROR_PREFIX = "[CMS]" as const;

/**
 * Structured error thrown by the CMS layer.
 *
 * Carries a machine-readable `kind`, optional HTTP `status`, validation
 * `issues`, and the raw response payload for debugging.
 */
export class CmsError extends Error {
  readonly kind: CmsErrorKind;
  readonly type: CmsErrorKind;
  readonly url: string;
  readonly status?: number;
  readonly issues?: { path: (string | number)[]; message: string }[];
  readonly raw?: unknown;

  constructor(
    kind: CmsErrorKind,
    message: string,
    options?: {
      status?: number;
      url?: string;
      issues?: { path: (string | number)[]; message: string }[];
      raw?: unknown;
      cause?: Error;
    },
  ) {
    super(`${ERROR_PREFIX} ${kind}: ${message}`);
    this.name = "CmsError";
    this.kind = kind;
    this.type = kind;
    this.url = options?.url ?? "";
    this.status = options?.status;
    this.issues = options?.issues;
    this.raw = options?.raw;
    if (options?.cause) {
      this.cause = options.cause;
    }
  }
}

/**
 * Checks whether an error represents a timeout or network failure.
 *
 * Returns `true` for {@link CmsError} with kind `"timeout"` or `"network"`,
 * or for generic `Error` instances whose message mentions "aborted" or
 * "timeout".
 *
 * @param error - Any thrown value.
 * @returns `true` if the error is timeout-like.
 */
export function isTimeoutError(error: unknown): boolean {
  if (error instanceof CmsError) {
    return error.kind === "timeout" || error.kind === "network";
  }
  if (error instanceof Error) {
    return error.message.includes("aborted") || error.message.includes("timeout");
  }
  return false;
}

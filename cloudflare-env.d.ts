declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    ADMIN_PASSWORD?: string;
    BUCKET?: R2Bucket;
  }
}

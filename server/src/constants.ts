export const __prod__ = process.env.NODE_ENV === 'production';  // <= Are we in production?
export const COOKIE_NAME = 'qid';   // <= Unique name for our cookie
export const FORGET_PASSWORD_PREFIX = "forget-password:";   // <= Prefix for forget token URL

export const __express__ = {
    port: (process.env.EXPRESS_PORT || process.env.PORT || 4000)  // <= process.env.EXPRESS_PORT
}

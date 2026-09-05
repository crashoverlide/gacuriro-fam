import Redis from "ioredis";
const redis = new Redis();

export async function cacheMiddleware(req, res, next) {
  const key = req.originalUrl;
  const cached = await redis.get(key);
  if (cached) {
    return res.json(JSON.parse(cached));
  }
  res.sendResponse = res.json;
  res.json = (body) => {
    redis.set(key, JSON.stringify(body), "EX", 60); // cache 1 min
    res.sendResponse(body);
  };
  next();
}

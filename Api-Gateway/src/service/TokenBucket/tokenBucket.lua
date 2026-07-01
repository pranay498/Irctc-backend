local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2]) -- tokens refilled per second
local nowMs = tonumber(ARGV[3])
local cost = tonumber(ARGV[4])

-- Retrieve current bucket state
local rateLimitInfo = redis.call("HMGET", key, "tokens", "lastUpdated")
local tokens = tonumber(rateLimitInfo[1])
local lastUpdated = tonumber(rateLimitInfo[2])

if not tokens or not lastUpdated then
    -- First time configuration: start full
    tokens = capacity
    lastUpdated = nowMs
else
    -- Refill tokens based on elapsed time (in milliseconds)
    local elapsed = nowMs - lastUpdated
    if elapsed > 0 then

        local refill = (elapsed * refillRate) / 1000
        tokens = math.min(capacity, tokens + refill)
        lastUpdated = nowMs
    end
end

local allowed = 0
local retryAfterMs = 0

if tokens >= cost then
    allowed = 1
    tokens = tokens - cost
else
    local tokensNeeded = cost - tokens
 
    retryAfterMs = math.ceil((tokensNeeded * 1000) / refillRate)
end


redis.call("HMSET", key, "tokens", tokens, "lastUpdated", lastUpdated)


local timeToFillSec = math.ceil(capacity / refillRate)
redis.call("EXPIRE", key, math.max(timeToFillSec * 2, 3600))

return { allowed, math.floor(tokens), retryAfterMs }
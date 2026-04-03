"""
Clerk JWT verification for FastAPI.
Fetches JWKS from Clerk and verifies the session token.
"""
import httpx
from fastapi import Depends, HTTPException, Header
from jose import jwt, JWTError
from core.config import CLERK_JWKS_URL, CLERK_SECRET_KEY
import os

_jwks_cache: dict | None = None

async def _get_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    url = CLERK_JWKS_URL or f"https://api.clerk.com/v1/jwks"
    async with httpx.AsyncClient() as client:
        r = await client.get(url, headers={"Authorization": f"Bearer {CLERK_SECRET_KEY}"})
        r.raise_for_status()
        _jwks_cache = r.json()
        return _jwks_cache


async def verify_clerk_token(authorization: str = Header(...)) -> dict:
    """FastAPI dependency — returns decoded Clerk claims."""
    token = authorization.removeprefix("Bearer ").strip()
    try:
        jwks = await _get_jwks()
        payload = jwt.decode(
            token,
            jwks,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return payload
    except JWTError as e:
        raise HTTPException(401, f"Invalid token: {e}")


def clerk_id_from(claims: dict = Depends(verify_clerk_token)) -> str:
    """Return the Clerk user ID (sub) from the verified JWT."""
    return claims["sub"]

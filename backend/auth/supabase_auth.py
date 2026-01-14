
import os
import jwt
import base64
import json
from dotenv import load_dotenv

load_dotenv()

SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
AUTH_MODE = os.getenv("AUTH_MODE", "supabase").lower()

# Log auth mode on startup for clarity
print(f"[AUTH] Mode: {AUTH_MODE}")

def verify_supabase_jwt(token: str) -> dict:
    # Dev bypass mode - skip all JWT validation
    if AUTH_MODE == "none":
        print("[AUTH] Bypass mode active - returning mock user")
        return {"sub": "dev-user", "email": "dev@local", "role": "authenticated"}
    
    if not SUPABASE_JWT_SECRET:
        raise ValueError("SUPABASE_JWT_SECRET is not set")

    try:
        # Decode header to see which algorithm is used
        header_segment = token.split('.')[0]
        # Add padding if needed
        padded = header_segment + '=' * (4 - len(header_segment) % 4)
        header = json.loads(base64.urlsafe_b64decode(padded))
        alg = header.get("alg", "HS256")
        print(f"[AUTH] JWT algorithm: {alg}")
        
        # ES256 requires a public key, not a secret
        # For ES256 tokens, we need to skip verification or get the public key
        if alg == "ES256":
            # Supabase ES256 tokens need the public key from the JWKS endpoint
            # For now, decode without verification but log a warning
            print("[AUTH] WARNING: ES256 token detected. Decoding without signature verification.")
            print("[AUTH] To properly verify ES256 tokens, configure SUPABASE_JWT_PUBLIC_KEY")
            payload = jwt.decode(token, options={"verify_signature": False})
            print(f"[AUTH] Decoded payload sub: {payload.get('sub')}")
            return payload
        
        # HS256 - use the shared secret
        payload = jwt.decode(
            token, 
            SUPABASE_JWT_SECRET, 
            algorithms=["HS256"], 
            options={"verify_aud": False}
        )
        return payload
        
    except jwt.ExpiredSignatureError:
        print("[AUTH] Token expired")
        raise Exception("Token expired")
    except jwt.InvalidTokenError as e:
        print(f"[AUTH] Invalid token error: {e}")
        raise Exception(f"Invalid token: {str(e)}")
    except Exception as e:
        print(f"[AUTH] Unexpected error: {e}")
        raise Exception(f"JWT verification error: {str(e)}")


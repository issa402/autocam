"""
Database Module for AI Worker

This module handles database operations for the AI worker.
It updates photo records with AI analysis results.

Why separate database module?
- Keeps main.py clean
- Easier to test
- Can switch database implementations
"""

import os
import asyncpg
import logging
from datetime import datetime
from typing import Optional

logger = logging.getLogger(__name__)

# Database connection pool
# Using asyncpg for async PostgreSQL operations
_db_pool: Optional[asyncpg.Pool] = None


async def get_db_pool() -> asyncpg.Pool:
    """
    Gets or creates database connection pool
    
    Connection pooling:
    - Reuses connections (faster)
    - Limits concurrent connections
    - Handles connection failures
    
    Returns:
        asyncpg connection pool
    """
    global _db_pool
    
    if _db_pool is None:
        database_url = os.getenv('DATABASE_URL')
        
        if not database_url:
            raise ValueError("DATABASE_URL environment variable not set")
        
        # Create connection pool
        _db_pool = await asyncpg.create_pool(
            database_url,
            min_size=2,  # Minimum 2 connections
            max_size=10,  # Maximum 10 connections
            command_timeout=60  # 60 second timeout
        )
        
        logger.info("Database connection pool created")
    
    return _db_pool


async def update_photo_analysis(
    photo_id: str,
    is_blurry: bool,
    blur_score: float,
    quality_score: float,
    has_faces: bool = False,
    face_count: int = 0,
    exposure_score: Optional[float] = None
) -> None:
    """
    Updates a photo record with AI analysis results AND assigns to BLURRY or CLEAN set

    CRITICAL: This is where the 3-set workflow begins!
    - If AI detects blurry → photoSet = BLURRY (user can review and rescue)
    - If AI detects clean → photoSet = CLEAN (user selects keepers)

    This function:
    1. Connects to database
    2. Determines photo set (BLURRY or CLEAN)
    3. Updates photo record with AI results + photoSet
    4. Sets analyzedAt timestamp

    Args:
        photo_id: Photo ID
        is_blurry: Whether photo is blurry
        blur_score: Laplacian variance score
        quality_score: Overall quality score (0-100)
        has_faces: Whether faces were detected
        face_count: Number of faces detected
        exposure_score: Exposure quality score (0-100)

    Raises:
        Exception: If database update fails
    """
    try:
        # Get database pool
        pool = await get_db_pool()

        # CRITICAL: Determine which set to assign photo to
        # BLURRY set = photos user should review (might rescue some)
        # CLEAN set = photos user selects keepers from
        photo_set = "BLURRY" if is_blurry else "CLEAN"

        # Update photo record
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE "Photo"
                SET
                    "isBlurry" = $1,
                    "blurScore" = $2,
                    "qualityScore" = $3,
                    "hasFaces" = $4,
                    "faceCount" = $5,
                    "exposureScore" = $6,
                    "photoSet" = $7,
                    "analyzedAt" = $8
                WHERE id = $9
                """,
                is_blurry,
                blur_score,
                quality_score,
                has_faces,
                face_count,
                exposure_score,
                photo_set,  # CRITICAL: Assign to BLURRY or CLEAN set
                datetime.utcnow(),
                photo_id
            )

        logger.info(f"Updated photo {photo_id} with analysis results (photoSet={photo_set})")
        
    except Exception as e:
        logger.error(f"Error updating photo {photo_id}: {str(e)}")
        raise


async def get_photo_by_id(photo_id: str) -> Optional[dict]:
    """
    Retrieves a photo record by ID
    
    Args:
        photo_id: Photo ID
    
    Returns:
        Photo record as dictionary, or None if not found
    """
    try:
        pool = await get_db_pool()
        
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT 
                    id,
                    "projectId",
                    filename,
                    "originalUrl",
                    "isBlurry",
                    "blurScore",
                    "qualityScore",
                    "analyzedAt"
                FROM "Photo"
                WHERE id = $1
                """,
                photo_id
            )
        
        if row:
            return dict(row)
        return None
        
    except Exception as e:
        logger.error(f"Error fetching photo {photo_id}: {str(e)}")
        raise


async def upload_deblurred_image(photo_id: str, image_array) -> str:
    """
    Uploads deblurred image to Supabase Storage

    Args:
        photo_id: Photo ID
        image_array: OpenCV image array (BGR format)

    Returns:
        Public URL of the deblurred image
    """
    try:
        import cv2
        import io
        from supabase import create_client

        # Get Supabase credentials
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_ANON_KEY')

        if not supabase_url or not supabase_key:
            raise ValueError("Supabase credentials not configured")

        # Initialize Supabase client
        supabase = create_client(supabase_url, supabase_key)

        # Encode image to JPEG
        success, buffer = cv2.imencode('.jpg', image_array)
        if not success:
            raise ValueError("Failed to encode image")

        # Upload to Supabase Storage
        file_path = f"deblurred/{photo_id}_deblurred.jpg"

        response = supabase.storage.from_('photos').upload(
            file_path,
            buffer.tobytes(),
            {
                "content-type": "image/jpeg",
                "upsert": "true"
            }
        )

        # Get public URL
        public_url = supabase.storage.from_('photos').get_public_url(file_path)

        logger.info(f"✅ Deblurred image uploaded: {public_url}")
        return public_url

    except Exception as e:
        logger.error(f"❌ Error uploading deblurred image: {str(e)}")
        raise


async def close_db_pool() -> None:
    """
    Closes database connection pool

    Call this on application shutdown
    """
    global _db_pool

    if _db_pool:
        await _db_pool.close()
        _db_pool = None
        logger.info("Database connection pool closed")


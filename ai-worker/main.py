"""
AI Worker Service - Main Application

This is the Python AI worker that processes photos for blur detection.

What it does:
1. Listens to job queue (Bull/Redis)
2. Downloads photos from S3/R2
3. Analyzes photos for blur using OpenCV
4. Calculates quality scores
5. Updates database with results

Why Python?
- OpenCV is best supported in Python
- Fast numerical computing with NumPy
- Easy to deploy (Modal.com, Railway, etc.)

How to run:
    python main.py
    or
    uvicorn main:app --host 0.0.0.0 --port 8001
"""

import os
import logging
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Import our blur detection module
from blur_detector import BlurDetector
from database import update_photo_analysis
from deblur_engine import DeblurEngine

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="AutoCam AI Worker",
    description="AI service for photo blur detection and quality analysis",
    version="1.0.0"
)

# Add CORS middleware (allow requests from Next.js frontend)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize blur detector with performance optimizations
# TUNED FOR SPORTS PHOTOGRAPHY:
# - 150.0: Strict threshold - only truly sharp photos marked CLEAN
# - Handles depth-of-field correctly (sharp subject, blurry background = CLEAN)
# - Rejects motion blur and camera shake (entire image blurry = BLURRY)
#
# PERFORMANCE OPTIMIZATIONS:
# - enable_face_detection=False: Skip face detection (saves ~500ms per photo)
# - max_image_size=1280: Downsample large images (saves ~300ms per photo)
# - Result: ~800ms saved per photo = 3 photos in ~1.2s instead of ~3s
# - CRITICAL: Reduced from 1920 to 1280 for 40% faster processing
blur_detector = BlurDetector(
    threshold=float(os.getenv('BLUR_THRESHOLD', 150.0)),
    enable_face_detection=os.getenv('ENABLE_FACE_DETECTION', 'false').lower() == 'true',
    max_image_size=int(os.getenv('MAX_IMAGE_SIZE', 1280))  # CRITICAL: Reduced for speed
)

# Initialize deblur engine
# Methods: 'wiener' (fast), 'unsharp' (instant), 'esrgan' (high-quality)
deblur_engine = DeblurEngine(
    method=os.getenv('DEBLUR_METHOD', 'wiener')
)

# ============================================
# Request/Response Models
# ============================================

class AnalyzePhotoRequest(BaseModel):
    """
    Request model for photo analysis
    
    Fields:
    - photo_id: Database ID of the photo
    - image_url: URL of the image to analyze
    - project_id: Project ID (for organization)
    """
    photo_id: str
    image_url: str
    project_id: str


class DeblurPhotoRequest(BaseModel):
    """
    Request model for photo deblurring

    Fields:
    - photo_id: Database ID of the photo
    - image_url: URL of the blurry image to deblur
    - method: Deblurring method ('wiener', 'unsharp', 'esrgan')
    """
    photo_id: str
    image_url: str
    method: str = 'wiener'


class DeblurPhotoResponse(BaseModel):
    """
    Response model for photo deblurring

    Fields:
    - photo_id: Database ID of the photo
    - success: Whether deblurring succeeded
    - deblurred_url: URL of the deblurred image (if successful)
    - blur_score_before: Blur score before deblurring
    - blur_score_after: Blur score after deblurring
    - improvement: Percentage improvement in blur score
    """
    photo_id: str
    success: bool
    deblurred_url: Optional[str] = None
    blur_score_before: Optional[float] = None
    blur_score_after: Optional[float] = None
    improvement: Optional[float] = None


class AnalyzePhotoResponse(BaseModel):
    """
    Response model for photo analysis

    Fields:
    - photo_id: Database ID of the photo
    - is_blurry: Whether the photo is blurry
    - blur_score: Laplacian variance score (higher = sharper)
    - quality_score: Overall quality score (0-100)
    - confidence: Confidence level (high, medium, low)
    - method: Detection method used
    """
    photo_id: str
    is_blurry: bool
    blur_score: float
    quality_score: float
    confidence: str
    method: str


# ============================================
# API Endpoints
# ============================================

@app.get("/")
async def root():
    """
    Health check endpoint
    
    Returns:
        Service status and version
    """
    return {
        "service": "AutoCam AI Worker",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """
    Health check endpoint for monitoring
    
    Returns:
        Health status
    """
    return {
        "status": "healthy",
        "service": "ai-worker"
    }


@app.post("/analyze", response_model=AnalyzePhotoResponse)
async def analyze_photo(request: AnalyzePhotoRequest):
    """
    Analyzes a photo for blur and quality
    
    This is the main endpoint that:
    1. Downloads the photo from the provided URL
    2. Runs blur detection using OpenCV
    3. Calculates quality score
    4. Updates the database with results
    5. Returns analysis results
    
    Args:
        request: AnalyzePhotoRequest with photo_id, image_url, project_id
    
    Returns:
        AnalyzePhotoResponse with analysis results
    
    Raises:
        HTTPException: If analysis fails
    """
    try:
        logger.info(f"Analyzing photo {request.photo_id} from {request.image_url}")
        
        # Analyze the photo
        result = blur_detector.analyze_from_url(request.image_url)
        
        # Update database with results
        await update_photo_analysis(
            photo_id=request.photo_id,
            is_blurry=result['is_blurry'],
            blur_score=result['blur_score'],
            quality_score=result['quality_score'],
            has_faces=result.get('has_faces', False),
            face_count=result.get('face_count', 0),
            exposure_score=result.get('exposure_score', None)
        )
        
        logger.info(f"Photo {request.photo_id} analyzed successfully: "
                   f"blur_score={result['blur_score']:.2f}, "
                   f"is_blurry={result['is_blurry']}")
        
        # Return response
        return AnalyzePhotoResponse(
            photo_id=request.photo_id,
            is_blurry=result['is_blurry'],
            blur_score=result['blur_score'],
            quality_score=result['quality_score'],
            confidence=result['confidence'],
            method=result['method']
        )
        
    except Exception as e:
        logger.error(f"Error analyzing photo {request.photo_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to analyze photo: {str(e)}"
        )


@app.post("/deblur")
async def deblur_photo(request: DeblurPhotoRequest) -> DeblurPhotoResponse:
    """
    Deblur a photo using AI

    This endpoint allows users to rescue blurry photos by applying
    AI-powered deblurring. The deblurred image is saved and the
    photo is re-analyzed to get a new blur score.

    Args:
        request: DeblurPhotoRequest with photo_id, image_url, method

    Returns:
        DeblurPhotoResponse with deblurred image URL and improvement metrics

    Raises:
        HTTPException: If deblurring fails
    """
    try:
        logger.info(f"🔧 Deblurring photo {request.photo_id} using {request.method} method")

        # Download the image
        import requests
        response = requests.get(request.image_url, timeout=30)
        response.raise_for_status()

        # Load image
        import cv2
        import numpy as np
        nparr = np.frombuffer(response.content, np.uint8)
        image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if image is None:
            raise ValueError("Failed to decode image")

        # Get blur score before deblurring
        blur_score_before = blur_detector.detect_blur(image)
        logger.info(f"📊 Blur score before: {blur_score_before:.2f}")

        # Apply deblurring
        deblurred_image = deblur_engine.deblur(image)

        # Get blur score after deblurring
        blur_score_after = blur_detector.detect_blur(deblurred_image)
        logger.info(f"📊 Blur score after: {blur_score_after:.2f}")

        # Calculate improvement
        improvement = ((blur_score_after - blur_score_before) / max(blur_score_before, 1)) * 100
        logger.info(f"📈 Improvement: {improvement:.1f}%")

        # Save deblurred image to Supabase Storage
        from database import upload_deblurred_image
        deblurred_url = await upload_deblurred_image(request.photo_id, deblurred_image)

        logger.info(f"✅ Deblurring successful: {deblurred_url}")

        return DeblurPhotoResponse(
            photo_id=request.photo_id,
            success=True,
            deblurred_url=deblurred_url,
            blur_score_before=blur_score_before,
            blur_score_after=blur_score_after,
            improvement=improvement
        )

    except Exception as e:
        logger.error(f"❌ Deblurring failed: {str(e)}")
        return DeblurPhotoResponse(
            photo_id=request.photo_id,
            success=False,
            deblurred_url=None
        )


@app.post("/batch-analyze")
async def batch_analyze_photos(photos: list[AnalyzePhotoRequest]):
    """
    Analyzes multiple photos in batch with PARALLEL PROCESSING

    PERFORMANCE OPTIMIZATION:
    - Processes photos in parallel (not sequentially)
    - Uses asyncio.gather() for concurrent execution
    - Limits concurrency to prevent resource exhaustion
    - Example: 100 photos in ~30 seconds (instead of ~100 seconds)

    Args:
        photos: List of AnalyzePhotoRequest objects

    Returns:
        List of analysis results with success/failure status
    """
    logger.info(f"🚀 Starting batch analysis of {len(photos)} photos with parallel processing")

    # Limit concurrency to prevent resource exhaustion
    # Adjust based on available CPU/memory
    max_concurrent = int(os.getenv('MAX_CONCURRENT_ANALYSIS', 4))

    # Create semaphore to limit concurrent tasks
    semaphore = asyncio.Semaphore(max_concurrent)

    async def analyze_with_semaphore(photo_request: AnalyzePhotoRequest):
        """Wrapper to limit concurrent analysis"""
        async with semaphore:
            try:
                logger.info(f"📸 Analyzing photo {photo_request.photo_id}")
                result = await analyze_photo(photo_request)
                return {
                    "photo_id": photo_request.photo_id,
                    "success": True,
                    "result": result
                }
            except Exception as e:
                logger.error(f"❌ Error analyzing photo {photo_request.photo_id}: {str(e)}")
                return {
                    "photo_id": photo_request.photo_id,
                    "success": False,
                    "error": str(e)
                }

    # Run all analyses in parallel with concurrency limit
    results = await asyncio.gather(
        *[analyze_with_semaphore(photo) for photo in photos],
        return_exceptions=False
    )

    successful = sum(1 for r in results if r['success'])
    failed = sum(1 for r in results if not r['success'])

    logger.info(f"✅ Batch analysis complete: {successful} successful, {failed} failed")

    return {
        "total": len(photos),
        "successful": successful,
        "failed": failed,
        "results": results
    }


# ============================================
# Startup/Shutdown Events
# ============================================

@app.on_event("startup")
async def startup_event():
    """
    Runs when the service starts
    
    Initialize connections, load models, etc.
    """
    logger.info("AI Worker service starting up...")
    logger.info(f"Blur threshold: {blur_detector.threshold}")
    logger.info("AI Worker service ready!")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Runs when the service shuts down
    
    Clean up connections, save state, etc.
    """
    logger.info("AI Worker service shutting down...")


# ============================================
# Run the application
# ============================================

if __name__ == "__main__":
    import uvicorn
    
    # Get host and port from environment
    host = os.getenv('HOST', '0.0.0.0')
    port = int(os.getenv('PORT', 8001))
    
    # Run the server
    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,  # Auto-reload on code changes (development only)
        log_level="info"
    )


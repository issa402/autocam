"""
Job Queue Worker

This script processes jobs from the Bull queue (Redis).

How it works:
1. Connects to Redis
2. Listens for jobs in 'ai-analysis' queue
3. Processes each job (calls blur detection)
4. Updates job status
5. Repeats

Why separate worker?
- Can run multiple workers for parallel processing
- Decoupled from API server
- Can scale independently

How to run:
    python worker.py
"""

import os
import json
import time
import logging
import asyncio
import requests
from redis import Redis
from dotenv import load_dotenv

from blur_detector import BlurDetector
from database import update_photo_analysis

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv('LOG_LEVEL', 'INFO'),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Redis connection
redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
redis_client = Redis.from_url(redis_url, decode_responses=True)

# Initialize blur detector
blur_detector = BlurDetector(
    threshold=float(os.getenv('BLUR_THRESHOLD', 100.0))
)

# Queue name
QUEUE_NAME = 'bull:ai-analysis'


async def process_job(job_data: dict) -> dict:
    """
    Processes a single AI analysis job
    
    Args:
        job_data: Job data from queue
            {
                'photoId': str,
                'projectId': str,
                'imageUrl': str
            }
    
    Returns:
        Analysis results
    """
    photo_id = job_data['photoId']
    image_url = job_data['imageUrl']
    
    logger.info(f"Processing job for photo {photo_id}")
    
    try:
        # Analyze photo
        result = blur_detector.analyze_from_url(image_url)
        
        # Update database
        await update_photo_analysis(
            photo_id=photo_id,
            is_blurry=result['is_blurry'],
            blur_score=result['blur_score'],
            quality_score=result['quality_score'],
            has_faces=result.get('has_faces', False),
            face_count=result.get('face_count', 0),
            exposure_score=result.get('exposure_score', None)
        )
        
        logger.info(f"Job completed for photo {photo_id}: "
                   f"blur_score={result['blur_score']:.2f}, "
                   f"is_blurry={result['is_blurry']}")
        
        return result
        
    except Exception as e:
        logger.error(f"Error processing job for photo {photo_id}: {str(e)}")
        raise


async def worker_loop():
    """
    Main worker loop
    
    Continuously polls Redis for jobs and processes them
    """
    logger.info("Worker started, waiting for jobs...")
    
    while True:
        try:
            # Get next job from queue (blocking pop with 5 second timeout)
            # Bull stores jobs in Redis lists
            # Format: bull:queue-name:wait
            job_data = redis_client.brpop(f'{QUEUE_NAME}:wait', timeout=5)
            
            if job_data:
                # Parse job data
                _, job_json = job_data
                job = json.loads(job_json)
                
                # Process job
                result = await process_job(job['data'])
                
                # Mark job as completed
                redis_client.lpush(f'{QUEUE_NAME}:completed', job_json)
                
            else:
                # No jobs, wait a bit
                await asyncio.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("Worker stopped by user")
            break
            
        except Exception as e:
            logger.error(f"Error in worker loop: {str(e)}")
            await asyncio.sleep(5)  # Wait before retrying


def main():
    """
    Main entry point
    """
    logger.info("Starting AI Worker...")
    logger.info(f"Redis URL: {redis_url}")
    logger.info(f"Queue: {QUEUE_NAME}")
    logger.info(f"Blur threshold: {blur_detector.threshold}")
    
    # Test Redis connection
    try:
        redis_client.ping()
        logger.info("Redis connection successful")
    except Exception as e:
        logger.error(f"Redis connection failed: {str(e)}")
        return
    
    # Run worker loop
    asyncio.run(worker_loop())


if __name__ == "__main__":
    main()


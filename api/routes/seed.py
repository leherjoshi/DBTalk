"""
Seed database endpoint (for one-time use on Render)
"""
from fastapi import APIRouter, HTTPException
import subprocess
import os
import logging

router = APIRouter(prefix="/api", tags=["admin"])
logger = logging.getLogger(__name__)

@router.post("/seed")
async def seed_database():
    """
    Seed the database with Olist dataset.
    This is a one-time operation for production deployment.
    Requires KAGGLE_USERNAME and KAGGLE_KEY environment variables.
    """
    try:
        # Check if already seeded
        from model.database import get_engine
        from sqlalchemy import text, inspect
        
        engine = get_engine()
        inspector = inspect(engine)
        
        # Check if tables exist and have data
        if 'dim_products' in inspector.get_table_names():
            with engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM dim_products")).fetchone()
                if result and result[0] > 0:
                    return {
                        "status": "already_seeded",
                        "message": f"Database already contains {result[0]} products"
                    }
        
        # Check Kaggle credentials (new token-based auth)
        kaggle_token = os.getenv("KAGGLE_API_TOKEN")
        
        if not kaggle_token:
            raise HTTPException(
                status_code=400,
                detail="KAGGLE_API_TOKEN environment variable required. Set it in Render dashboard to: KGAT_89bbae5a481a2a3a9f7d4a3c75538f64"
            )
        
        logger.info("Starting database seeding process...")
        
        # Create data directory
        os.makedirs("./data/raw", exist_ok=True)
        
        # Install kaggle CLI if not present
        logger.info("Installing Kaggle CLI...")
        subprocess.run(["pip", "install", "kaggle"], check=True, capture_output=True)
        
        # Download dataset
        logger.info("Downloading Kaggle dataset...")
        result = subprocess.run([
            "kaggle", "datasets", "download", "-d", 
            "olistbr/brazilian-ecommerce", 
            "--unzip", "-p", "./data/raw/"
        ], check=True, capture_output=True, text=True)
        logger.info(f"Kaggle download output: {result.stdout}")
        
        # Run seed script
        logger.info("Running seed script...")
        seed_result = subprocess.run(
            ["python", "-m", "data.seed"], 
            check=True, 
            capture_output=True, 
            text=True
        )
        logger.info(f"Seed output: {seed_result.stdout}")
        
        # Verify seeding
        with engine.connect() as conn:
            product_count = conn.execute(text("SELECT COUNT(*) FROM dim_products")).fetchone()[0]
            order_count = conn.execute(text("SELECT COUNT(*) FROM fact_orders")).fetchone()[0]
        
        return {
            "status": "success",
            "message": "Database seeded successfully",
            "products": product_count,
            "orders": order_count
        }
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Subprocess error: {e.stderr}")
        raise HTTPException(
            status_code=500, 
            detail=f"Seeding failed: {e.stderr}"
        )
    except Exception as e:
        logger.error(f"Seeding error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Seeding failed: {str(e)}"
        )

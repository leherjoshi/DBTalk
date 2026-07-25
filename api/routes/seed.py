"""
Seed database endpoint (for one-time use on Render)
"""
from fastapi import APIRouter, HTTPException, Query
import subprocess
import os
import logging

router = APIRouter(prefix="/api", tags=["admin"])
logger = logging.getLogger(__name__)

@router.post("/seed")
async def seed_database(force: bool = Query(False, description="Force re-seed by dropping all tables first")):
    """
    Seed the database with Olist dataset.
    This is a one-time operation for production deployment.
    Requires KAGGLE_API_TOKEN environment variable.
    
    Parameters:
    - force: If True, drops all tables and re-seeds from scratch
    """
    try:
        # Check if already seeded
        from model.database import get_engine
        from sqlalchemy import text, inspect
        
        engine = get_engine()
        inspector = inspect(engine)
        
        if not force:
            # Check if tables exist and have data
            if 'fact_orders' in inspector.get_table_names():
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT COUNT(*) FROM fact_orders")).fetchone()
                    if result and result[0] > 0:
                        return {
                            "status": "already_seeded",
                            "message": f"Database already contains {result[0]} orders. Use ?force=true to re-seed."
                        }
            
            if 'dim_products' in inspector.get_table_names():
                with engine.connect() as conn:
                    result = conn.execute(text("SELECT COUNT(*) FROM dim_products")).fetchone()
                    if result and result[0] > 0:
                        return {
                            "status": "partially_seeded",
                            "message": f"Database contains {result[0]} products but 0 orders. Use ?force=true to re-seed."
                        }
        
        # Check Kaggle credentials (new token-based auth)
        kaggle_token = os.getenv("KAGGLE_API_TOKEN")
        
        if not kaggle_token:
            raise HTTPException(
                status_code=400,
                detail="KAGGLE_API_TOKEN environment variable required. Set it in Render dashboard."
            )
        
        logger.info("Starting database seeding process (force=%s)...", force)
        
        # Drop all tables if force=true
        if force:
            logger.info("Force mode: dropping all tables...")
            from model.schema import Base
            Base.metadata.drop_all(engine)
            Base.metadata.create_all(engine)
            logger.info("Tables recreated")
        
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
        ], check=True, capture_output=True, text=True, timeout=300)
        logger.info(f"Kaggle download output: {result.stdout}")
        
        # Run seed script with force flag
        logger.info("Running seed script...")
        env = os.environ.copy()
        if force:
            env["FORCE_SEED"] = "1"
        
        seed_result = subprocess.run(
            ["python", "-m", "data.seed"], 
            check=True, 
            capture_output=True, 
            text=True,
            timeout=600,  # 10 minutes
            env=env
        )
        logger.info(f"Seed output: {seed_result.stdout}")
        if seed_result.stderr:
            logger.warning(f"Seed stderr: {seed_result.stderr}")
        
        # Verify seeding
        with engine.connect() as conn:
            product_count = conn.execute(text("SELECT COUNT(*) FROM dim_products")).fetchone()[0]
            order_count = conn.execute(text("SELECT COUNT(*) FROM fact_orders")).fetchone()[0]
            user_count = conn.execute(text("SELECT COUNT(*) FROM dim_users")).fetchone()[0]
        
        return {
            "status": "success",
            "message": "Database seeded successfully",
            "products": product_count,
            "orders": order_count,
            "users": user_count
        }
        
    except subprocess.CalledProcessError as e:
        logger.error(f"Subprocess error: {e.stderr}")
        raise HTTPException(
            status_code=500, 
            detail=f"Seeding failed: {e.stderr}"
        )
    except subprocess.TimeoutExpired as e:
        logger.error(f"Seeding timed out after {e.timeout} seconds")
        raise HTTPException(
            status_code=500,
            detail=f"Seeding timed out after {e.timeout} seconds. Database may be partially seeded."
        )
    except Exception as e:
        logger.error(f"Seeding error: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500, 
            detail=f"Seeding failed: {str(e)}"
        )

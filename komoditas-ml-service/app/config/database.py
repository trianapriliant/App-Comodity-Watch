"""Database configuration untuk ML service."""

import asyncio
from typing import AsyncGenerator, Generator

import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config.settings import settings


class DatabaseManager:
    """Database manager untuk ML service."""
    
    def __init__(self):
        # Sync engine untuk training dan batch processing
        self.sync_engine = create_engine(
            settings.database_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=10,
            max_overflow=20,
            echo=settings.debug
        )
        
        # Async engine untuk API requests
        async_url = settings.database_url.replace("postgresql://", "postgresql+asyncpg://")
        self.async_engine = create_async_engine(
            async_url,
            pool_pre_ping=True,
            pool_recycle=300,
            pool_size=5,
            max_overflow=10,
            echo=settings.debug
        )
        
        # Session makers
        self.sync_session_maker = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.sync_engine
        )
        
        self.async_session_maker = async_sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.async_engine,
            class_=AsyncSession
        )
    
    def get_sync_session(self) -> Generator[Session, None, None]:
        """Get synchronous database session."""
        session = self.sync_session_maker()
        try:
            yield session
        finally:
            session.close()
    
    async def get_async_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get asynchronous database session."""
        async with self.async_session_maker() as session:
            yield session
    
    def get_price_data(
        self,
        commodity_codes: list[str] = None,
        region_codes: list[str] = None,
        start_date: str = None,
        end_date: str = None,
        price_type: str = "KONSUMEN"
    ) -> pd.DataFrame:
        """Get price data untuk ML training dan inference."""
        
        query = """
        SELECT 
            p.id,
            p.date,
            p.price,
            p.currency,
            p.price_type,
            p.source,
            c.code as commodity_code,
            c.name as commodity_name,
            c.type as commodity_type,
            r.code as region_code,
            r.name as region_name,
            r.latitude,
            r.longitude
        FROM prices p
        JOIN commodities c ON p.commodity_id = c.id
        JOIN regions r ON p.region_id = r.id
        WHERE p.is_validated = true
        """
        
        params = {}
        
        if commodity_codes:
            query += " AND c.code = ANY(:commodity_codes)"
            params["commodity_codes"] = commodity_codes
        
        if region_codes:
            query += " AND r.code = ANY(:region_codes)"
            params["region_codes"] = region_codes
        
        if start_date:
            query += " AND p.date >= :start_date"
            params["start_date"] = start_date
        
        if end_date:
            query += " AND p.date <= :end_date"
            params["end_date"] = end_date
        
        if price_type:
            query += " AND p.price_type = :price_type"
            params["price_type"] = price_type
        
        query += " ORDER BY p.date ASC, c.code, r.code"
        
        with self.sync_engine.connect() as conn:
            return pd.read_sql_query(
                text(query),
                conn,
                params=params,
                parse_dates=["date"]
            )
    
    def get_weather_data(
        self,
        region_codes: list[str] = None,
        start_date: str = None,
        end_date: str = None,
        weather_types: list[str] = None
    ) -> pd.DataFrame:
        """Get weather data untuk correlation analysis."""
        
        query = """
        SELECT 
            w.id,
            w.date,
            w.weather_type,
            w.value,
            w.unit,
            w.source,
            r.code as region_code,
            r.name as region_name,
            r.latitude,
            r.longitude
        FROM weather_data w
        JOIN regions r ON w.region_id = r.id
        WHERE 1=1
        """
        
        params = {}
        
        if region_codes:
            query += " AND r.code = ANY(:region_codes)"
            params["region_codes"] = region_codes
        
        if start_date:
            query += " AND w.date >= :start_date"
            params["start_date"] = start_date
        
        if end_date:
            query += " AND w.date <= :end_date"
            params["end_date"] = end_date
        
        if weather_types:
            query += " AND w.weather_type = ANY(:weather_types)"
            params["weather_types"] = weather_types
        
        query += " ORDER BY w.date ASC, r.code, w.weather_type"
        
        with self.sync_engine.connect() as conn:
            return pd.read_sql_query(
                text(query),
                conn,
                params=params,
                parse_dates=["date"]
            )
    
    def get_commodities_info(self) -> pd.DataFrame:
        """Get commodities information."""
        
        query = """
        SELECT 
            id,
            name,
            code,
            type,
            unit,
            category,
            is_strategic,
            description
        FROM commodities
        ORDER BY code
        """
        
        with self.sync_engine.connect() as conn:
            return pd.read_sql_query(text(query), conn)
    
    def get_regions_info(self) -> pd.DataFrame:
        """Get regions information."""
        
        query = """
        SELECT 
            id,
            name,
            code,
            type,
            latitude,
            longitude
        FROM regions
        ORDER BY code
        """
        
        with self.sync_engine.connect() as conn:
            return pd.read_sql_query(text(query), conn)
    
    async def save_predictions(
        self,
        predictions: list[dict],
        model_version: str,
        algorithm: str
    ) -> None:
        """Save predictions ke database."""
        
        async with self.async_session_maker() as session:
            try:
                # Insert predictions using raw SQL for better performance
                query = """
                INSERT INTO predictions 
                (commodity_id, region_id, predicted_price, current_price, 
                 price_change, confidence, prediction_date, model_version, 
                 algorithm, features, created_at)
                VALUES 
                """
                
                values = []
                params = {}
                
                for i, pred in enumerate(predictions):
                    values.append(f"""
                    (:commodity_id_{i}, :region_id_{i}, :predicted_price_{i}, 
                     :current_price_{i}, :price_change_{i}, :confidence_{i}, 
                     :prediction_date_{i}, :model_version_{i}, :algorithm_{i}, 
                     :features_{i}, NOW())
                    """)
                    
                    params.update({
                        f"commodity_id_{i}": pred["commodity_id"],
                        f"region_id_{i}": pred.get("region_id"),
                        f"predicted_price_{i}": pred["predicted_price"],
                        f"current_price_{i}": pred["current_price"],
                        f"price_change_{i}": pred["price_change"],
                        f"confidence_{i}": pred["confidence"],
                        f"prediction_date_{i}": pred["prediction_date"],
                        f"model_version_{i}": model_version,
                        f"algorithm_{i}": algorithm,
                        f"features_{i}": pred.get("features", {}),
                    })
                
                full_query = query + ",".join(values)
                
                await session.execute(text(full_query), params)
                await session.commit()
                
            except Exception as e:
                await session.rollback()
                raise e
    
    async def health_check(self) -> bool:
        """Check database connection health."""
        try:
            async with self.async_session_maker() as session:
                result = await session.execute(text("SELECT 1"))
                return result.scalar() == 1
        except Exception:
            return False
    
    async def close(self) -> None:
        """Close database connections."""
        await self.async_engine.dispose()
        self.sync_engine.dispose()


# Global database manager instance
db_manager = DatabaseManager()


# Dependency untuk FastAPI
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency untuk database session."""
    async for session in db_manager.get_async_session():
        yield session


def get_sync_db() -> Generator[Session, None, None]:
    """Dependency untuk sync database session."""
    yield from db_manager.get_sync_session()

from sqlalchemy import Column, String, Boolean, DateTime, Integer, Text, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import uuid

Base = declarative_base()

def gen_id():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_id)
    clerk_id = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    name = Column(String)
    is_subscribed = Column(Boolean, default=False)
    stripe_customer_id = Column(String)
    stripe_subscription_id = Column(String)
    created_at = Column(DateTime, server_default=func.now())

class Manga(Base):
    __tablename__ = "mangas"
    id = Column(String, primary_key=True, default=gen_id)
    user_id = Column(String, nullable=True)  # null = guest
    title = Column(String)
    title_jp = Column(String)
    tagline = Column(String)
    subject_name = Column(String)
    subject_description = Column(Text)
    photo_url = Column(String)
    status = Column(String, default="pending")  # pending | generating | preview | complete | error
    pages = Column(JSON, default=[])            # [{type, image_url, caption, narration_url, ...}]
    audio_theme_url = Column(String)
    is_preview = Column(Boolean, default=True)
    model_used = Column(String)                 # track which model generated it
    created_at = Column(DateTime, server_default=func.now())

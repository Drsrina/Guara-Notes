import os
import asyncio
import httpx
import numpy as np
import umap
from .worker import celery_app
from .database import AsyncSessionLocal
from .models import Note, NoteLink, LinkType
from sqlalchemy.future import select
from sqlalchemy import delete

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")

async def _generate_embedding(text: str) -> list[float]:
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{OLLAMA_URL}/api/embeddings",
                json={
                    "model": "nomic-embed-text",
                    "prompt": text
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            return data.get("embedding", [])
        except Exception as e:
            print(f"Error generating embedding: {e}")
            return []

async def _process_note_embedding(note_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Note).filter(Note.id == note_id))
        note = result.scalars().first()
        
        if not note:
            print(f"Note {note_id} not found.")
            return

        text_to_embed = f"{note.title}\n{note.content}"
        embedding = await _generate_embedding(text_to_embed)
        
        if embedding:
            note.embedding = embedding
            await session.commit()
            print(f"Updated embedding for note {note_id}")
            celery_app.send_task("worker.tasks.calculate_semantic_links", args=[note_id])
        else:
            print(f"Failed to generate embedding for note {note_id}")

async def _calculate_semantic_links(note_id: str):
    async with AsyncSessionLocal() as session:
        result = await session.execute(select(Note).filter(Note.id == note_id))
        source_note = result.scalars().first()
        
        if not source_note or source_note.embedding is None:
             print("Source note or embedding not found.")
             return
             
        await session.execute(
            delete(NoteLink).filter(
                NoteLink.source_note_id == note_id,
                NoteLink.link_type == LinkType.semantic
            )
        )
        
        print(f"Recalculating semantic links for note {note_id}")
        await session.commit()
        
        celery_app.send_task("worker.tasks.calculate_umap_coordinates", args=[str(source_note.user_id)])

async def _calculate_umap_coordinates(user_id: str):
    print(f"Calculating UMAP coordinates for user {user_id}")
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Note).filter(Note.user_id == user_id).filter(Note.embedding.is_not(None))
        )
        notes = result.scalars().all()
        
        if len(notes) < 3:
             print("Not enough notes to run UMAP reduction (needs at least 3)")
             return
             
        embeddings = [note.embedding for note in notes]
        
        reducer = umap.UMAP(n_components=3, random_state=42)
        try:
             projected = reducer.fit_transform(embeddings)
             for note, coords in zip(notes, projected):
                  print(f"Note {note.id} -> 3D Coords: {coords}")
        except Exception as e:
             print(f"Error computing UMAP: {e}")

@celery_app.task(name="worker.tasks.generate_embeddings")
def generate_embeddings(note_id: str):
    loop = asyncio.get_event_loop()
    loop.run_until_complete(_process_note_embedding(note_id))
    
@celery_app.task(name="worker.tasks.calculate_semantic_links")
def calculate_semantic_links(note_id: str):
    loop = asyncio.get_event_loop()
    loop.run_until_complete(_calculate_semantic_links(note_id))

@celery_app.task(name="worker.tasks.calculate_umap_coordinates")
def calculate_umap_coordinates(user_id: str):
    loop = asyncio.get_event_loop()
    loop.run_until_complete(_calculate_umap_coordinates(user_id))

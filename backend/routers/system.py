import os
import logging
import json
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from pydantic import BaseModel
from typing import Annotated, Optional
import httpx

from .. import models
from ..database import get_db
from .auth import get_admin_user

router = APIRouter(prefix='/system', tags=['system'])
logger = logging.getLogger(__name__)


class EnvUpdate(BaseModel):
    AI_PROVIDER: Optional[str] = None
    OLLAMA_MODEL_CHAT: Optional[str] = None
    OLLAMA_MODEL_EMBED: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    CLAUDE_API_KEY: Optional[str] = None
    SEMANTIC_THRESHOLD: Optional[str] = None
    SEMANTIC_TOP_K: Optional[str] = None
    RAG_TOP_K: Optional[str] = None
    CORS_ORIGINS: Optional[str] = None


def _mask_key(value: str) -> str:
    if not value or len(value) < 8:
        return '****'
    return '*' * (len(value) - 4) + value[-4:]


def _find_env_file() -> Path:
    for candidate in [Path('/app/backend/.env'), Path('/app/.env'), Path('.env')]:
        if candidate.exists():
            return candidate
    return Path('/app/backend/.env')


def _write_env_file(updates: dict):
    env_path = _find_env_file()
    if not env_path.exists():
        logger.warning('[system] .env file not found')
        return
    lines = env_path.read_text().splitlines()
    new_lines = []
    written = set()
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith('#') and '=' in stripped:
            key = stripped.split('=', 1)[0].strip()
            if key in updates:
                new_lines.append(f'{key}={updates[key]}')
                written.add(key)
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    for key, val in updates.items():
        if key not in written:
            new_lines.append(f'{key}={val}')
    env_path.write_text('\n'.join(new_lines) + '\n')


@router.get('/status')
async def system_status(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    result = {}
    result['backend'] = {'status': 'online', 'version': '1.1.0'}
    try:
        await db.execute(text('SELECT 1'))
        row = await db.execute(text('SELECT version()'))
        pg_version = row.scalar().split()[1]
        result['postgres'] = {'status': 'online', 'version': pg_version}
    except Exception as e:
        result['postgres'] = {'status': 'offline', 'error': str(e)}
    try:
        import redis as redis_lib
        redis_url = os.getenv('REDIS_URL', 'redis://redis:6379/0')
        r = redis_lib.from_url(redis_url, socket_connect_timeout=3)
        info = r.info('server')
        result['redis'] = {'status': 'online', 'version': info.get('redis_version', '?')}
    except Exception as e:
        result['redis'] = {'status': 'offline', 'error': str(e)}
    try:
        ollama_url = os.getenv('OLLAMA_URL', 'http://ollama:11434')
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f'{ollama_url}/api/version')
            if resp.status_code == 200:
                result['ollama'] = {'status': 'online', 'version': resp.json().get('version', '?')}
            else:
                result['ollama'] = {'status': 'error', 'error': f'HTTP {resp.status_code}'}
    except Exception as e:
        result['ollama'] = {'status': 'offline', 'error': str(e)}
    try:
        import redis as redis_lib
        redis_url = os.getenv('REDIS_URL', 'redis://redis:6379/0')
        r = redis_lib.from_url(redis_url, socket_connect_timeout=3)
        queue_len = r.llen('celery')
        result['worker'] = {'status': 'online', 'queue_length': queue_len}
    except Exception as e:
        result['worker'] = {'status': 'unknown', 'error': str(e)}
    return result


@router.get('/redis')
async def redis_metrics(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
):
    try:
        import redis as redis_lib
        redis_url = os.getenv('REDIS_URL', 'redis://redis:6379/0')
        r = redis_lib.from_url(redis_url, socket_connect_timeout=5)
        info = r.info()
        queue_len = r.llen('celery')
        return {
            'status': 'online',
            'version': info.get('redis_version'),
            'uptime_days': round(info.get('uptime_in_seconds', 0) / 86400, 1),
            'used_memory_human': info.get('used_memory_human'),
            'used_memory_peak_human': info.get('used_memory_peak_human'),
            'maxmemory_human': info.get('maxmemory_human') or 'nao limitado',
            'connected_clients': info.get('connected_clients'),
            'total_commands_processed': info.get('total_commands_processed'),
            'keyspace_hits': info.get('keyspace_hits'),
            'keyspace_misses': info.get('keyspace_misses'),
            'queue_length': queue_len,
            'aof_enabled': bool(info.get('aof_enabled')),
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f'Redis inacessivel: {e}')


@router.get('/postgres')
async def postgres_metrics(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    try:
        version_row = await db.execute(text('SELECT version()'))
        version = version_row.scalar()
        size_row = await db.execute(text('SELECT pg_size_pretty(pg_database_size(current_database()))'))
        db_size = size_row.scalar()
        size_bytes_row = await db.execute(text('SELECT pg_database_size(current_database())'))
        db_size_bytes = size_bytes_row.scalar()
        active_sql = "SELECT count(*) FROM pg_stat_activity WHERE state = 'active'"
        conn_row = await db.execute(text(active_sql))
        active_connections = conn_row.scalar()
        note_count = (await db.execute(text('SELECT count(*) FROM notes'))).scalar()
        user_count = (await db.execute(text('SELECT count(*) FROM users'))).scalar()
        link_count = (await db.execute(text('SELECT count(*) FROM note_links'))).scalar()
        embedded_count = (await db.execute(text('SELECT count(*) FROM notes WHERE embedding IS NOT NULL'))).scalar()
        return {
            'status': 'online',
            'version': version.split()[1] if version else '?',
            'database_size': db_size,
            'database_size_bytes': db_size_bytes,
            'active_connections': active_connections,
            'notes_total': note_count,
            'notes_embedded': embedded_count,
            'users_total': user_count,
            'links_total': link_count,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post('/postgres/vacuum')
async def run_vacuum(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
    db: AsyncSession = Depends(get_db),
):
    try:
        # VACUUM cannot run inside a transaction — use asyncpg directly
        from sqlalchemy import event
        engine = db.get_bind()
        # Get a raw asyncpg connection from the pool
        async with engine.connect() as raw_conn:
            # Use text with AUTOCOMMIT isolation
            await raw_conn.execute(text("COMMIT"))
            await raw_conn.execute(text("VACUUM ANALYZE"))
        logger.info(f'[system] VACUUM ANALYZE executado por: {current_admin.username}')
        return {'status': 'ok', 'message': 'VACUUM ANALYZE executado com sucesso.'}
    except Exception as e:
        logger.error(f'[system] VACUUM error: {e}')
        raise HTTPException(status_code=500, detail=str(e))


@router.get('/env')
async def get_env_config(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
):
    return {
        'AI_PROVIDER': os.getenv('AI_PROVIDER', 'local'),
        'OLLAMA_URL': os.getenv('OLLAMA_URL', 'http://ollama:11434'),
        'OLLAMA_MODEL_CHAT': os.getenv('OLLAMA_MODEL_CHAT', 'llama3.2:3b'),
        'OLLAMA_MODEL_EMBED': os.getenv('OLLAMA_MODEL_EMBED', 'nomic-embed-text'),
        'GEMINI_API_KEY': _mask_key(os.getenv('GEMINI_API_KEY', '')),
        'CLAUDE_API_KEY': _mask_key(os.getenv('CLAUDE_API_KEY', '')),
        'SEMANTIC_THRESHOLD': os.getenv('SEMANTIC_THRESHOLD', '0.35'),
        'SEMANTIC_TOP_K': os.getenv('SEMANTIC_TOP_K', '8'),
        'RAG_TOP_K': os.getenv('RAG_TOP_K', '5'),
        'CORS_ORIGINS': os.getenv('CORS_ORIGINS', 'http://localhost:5757'),
    }


@router.put('/env')
async def update_env_config(
    update: EnvUpdate,
    current_admin: Annotated[models.User, Depends(get_admin_user)],
):
    changes = update.model_dump(exclude_none=True, exclude_unset=True)
    if not changes:
        raise HTTPException(status_code=400, detail='Nenhum campo fornecido.')
    for key, val in changes.items():
        if val:
            os.environ[key] = val
    try:
        _write_env_file(changes)
    except Exception as e:
        logger.warning(f'[system] Erro ao persistir .env: {e}')
    logger.info(f'[system] Configuracoes atualizadas por: {current_admin.username} -> {list(changes.keys())}')
    return {
        'status': 'updated',
        'changed_keys': list(changes.keys()),
        'note': 'Mudancas aplicadas imediatamente. API keys requerem restart do backend para todos os modulos.',
    }


@router.post('/redis/flush-queue')
async def flush_celery_queue(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
):
    try:
        import redis as redis_lib
        redis_url = os.getenv('REDIS_URL', 'redis://redis:6379/0')
        r = redis_lib.from_url(redis_url, socket_connect_timeout=5)
        deleted = r.delete('celery')
        logger.info(f'[system] Fila Celery limpa por: {current_admin.username}')
        return {'status': 'ok', 'deleted_queue': bool(deleted)}
    except Exception as e:
        raise HTTPException(status_code=503, detail=str(e))

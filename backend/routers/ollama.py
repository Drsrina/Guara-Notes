import os
import logging
import json
import httpx
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Annotated, Optional

from .. import models
from .auth import get_admin_user

router = APIRouter(prefix="/ollama", tags=["ollama"])
logger = logging.getLogger(__name__)

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://ollama:11434")


def _get_ollama_url() -> str:
    """Lê a URL do Ollama dinamicamente para suportar mudanças em runtime."""
    return os.getenv("OLLAMA_URL", "http://ollama:11434")


class OllamaPullRequest(BaseModel):
    model: str


class OllamaConfigUpdate(BaseModel):
    chat_model: Optional[str] = None
    embed_model: Optional[str] = None


@router.get("/status")
async def ollama_status(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
):
    """Verifica saúde do Ollama: versão, modelos carregados."""
    base_url = _get_ollama_url()
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            version_resp = await client.get(f"{base_url}/api/version")
            version_resp.raise_for_status()
            version_data = version_resp.json()

            ps_resp = await client.get(f"{base_url}/api/ps")
            ps_data = ps_resp.json() if ps_resp.status_code == 200 else {"models": []}

        return {
            "status": "online",
            "version": version_data.get("version", "unknown"),
            "loaded_models": ps_data.get("models", []),
            "chat_model": os.getenv("OLLAMA_MODEL_CHAT", "llama3.2:3b"),
            "embed_model": os.getenv("OLLAMA_MODEL_EMBED", "nomic-embed-text"),
            "ollama_url": base_url,
        }
    except httpx.ConnectError:
        return {"status": "offline", "error": "Ollama não encontrado em " + base_url}
    except Exception as e:
        logger.warning(f"[ollama] Erro ao checar status: {e}")
        return {"status": "error", "error": str(e)}


@router.get("/models")
async def list_ollama_models(
    current_admin: Annotated[models.User, Depends(get_admin_user)],
):
    """Lista todos os modelos instalados no Ollama."""
    base_url = _get_ollama_url()
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{base_url}/api/tags")
            resp.raise_for_status()
            data = resp.json()

        models_list = data.get("models", [])
        # Normaliza formato: adiciona campos úteis
        normalized = [
            {
                "name": m.get("name"),
                "size": m.get("size", 0),
                "size_gb": round(m.get("size", 0) / 1_073_741_824, 2),
                "modified_at": m.get("modified_at"),
                "digest": m.get("digest", "")[:12],
                "is_chat_model": m.get("name") == os.getenv("OLLAMA_MODEL_CHAT"),
                "is_embed_model": m.get("name") == os.getenv("OLLAMA_MODEL_EMBED"),
            }
            for m in models_list
        ]
        return {"models": normalized, "total": len(normalized)}
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama offline ou inacessível.")
    except Exception as e:
        logger.error(f"[ollama] Erro ao listar modelos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pull")
async def pull_ollama_model(
    request: OllamaPullRequest,
    current_admin: Annotated[models.User, Depends(get_admin_user)],
):
    """
    Inicia download de um modelo no Ollama.
    Retorna SSE (Server-Sent Events) com progresso do download.
    """
    base_url = _get_ollama_url()
    model_name = request.model.strip()

    if not model_name:
        raise HTTPException(status_code=400, detail="Nome do modelo é obrigatório.")

    async def stream_pull():
        try:
            async with httpx.AsyncClient(timeout=None) as client:
                async with client.stream(
                    "POST",
                    f"{base_url}/api/pull",
                    json={"name": model_name, "stream": True},
                ) as response:
                    if response.status_code != 200:
                        error_body = await response.aread()
                        yield f"data: {json.dumps({'error': error_body.decode()})}\n\n"
                        return

                    async for line in response.aiter_lines():
                        if line:
                            try:
                                data = json.loads(line)
                                yield f"data: {json.dumps(data)}\n\n"
                                if data.get("status") in ("success", "error"):
                                    break
                            except json.JSONDecodeError:
                                pass
        except httpx.ConnectError:
            yield f"data: {json.dumps({'error': 'Ollama offline'})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield f"data: {json.dumps({'done': True})}\n\n"

    logger.info(f"[ollama] Pull iniciado para modelo '{model_name}' pelo admin '{current_admin.username}'")
    return StreamingResponse(
        stream_pull(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/models/{model_name:path}")
async def delete_ollama_model(
    model_name: str,
    current_admin: Annotated[models.User, Depends(get_admin_user)],
):
    """Remove um modelo do Ollama."""
    base_url = _get_ollama_url()

    # Impede deletar o modelo atualmente em uso
    active_chat = os.getenv("OLLAMA_MODEL_CHAT", "")
    active_embed = os.getenv("OLLAMA_MODEL_EMBED", "")
    if model_name in (active_chat, active_embed):
        raise HTTPException(
            status_code=400,
            detail=f"Não é possível deletar '{model_name}': é o modelo ativo. Mude o modelo ativo primeiro.",
        )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.request(
                "DELETE",
                f"{base_url}/api/delete",
                json={"name": model_name},
            )
            if resp.status_code not in (200, 204):
                raise HTTPException(status_code=resp.status_code, detail=resp.text)

        logger.info(f"[ollama] Modelo '{model_name}' removido pelo admin '{current_admin.username}'")
        return {"status": "deleted", "model": model_name}
    except HTTPException:
        raise
    except httpx.ConnectError:
        raise HTTPException(status_code=503, detail="Ollama offline.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/config")
async def update_ollama_config(
    config: OllamaConfigUpdate,
    current_admin: Annotated[models.User, Depends(get_admin_user)],
):
    """
    Atualiza o modelo de chat e/ou embed em uso no runtime.
    Os valores são salvos como variáveis de ambiente do processo atual.
    Para persistência permanente, edite o .env e reinicie os containers.
    """
    changed = {}
    if config.chat_model is not None:
        os.environ["OLLAMA_MODEL_CHAT"] = config.chat_model
        changed["chat_model"] = config.chat_model
        logger.info(f"[ollama] Chat model alterado para '{config.chat_model}' por '{current_admin.username}'")

    if config.embed_model is not None:
        os.environ["OLLAMA_MODEL_EMBED"] = config.embed_model
        changed["embed_model"] = config.embed_model
        logger.info(f"[ollama] Embed model alterado para '{config.embed_model}' por '{current_admin.username}'")

    if not changed:
        raise HTTPException(status_code=400, detail="Nenhum campo fornecido para atualizar.")

    return {
        "status": "updated",
        "changed": changed,
        "note": "Mudanças ativas até próximo restart. Para persistir, edite o .env.",
        "current": {
            "chat_model": os.getenv("OLLAMA_MODEL_CHAT"),
            "embed_model": os.getenv("OLLAMA_MODEL_EMBED"),
        },
    }

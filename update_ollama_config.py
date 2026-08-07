import re
import sys

def replace_in_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()

    for search, replace in replacements:
        content = content.replace(search, replace)

    with open(filepath, 'w') as f:
        f.write(content)

ollama_py_replacements = [
    ('class OllamaConfigUpdate(BaseModel):\n    chat_model: Optional[str] = None\n    embed_model: Optional[str] = None', 'class OllamaConfigUpdate(BaseModel):\n    chat_model: Optional[str] = None\n    embed_model: Optional[str] = None\n    ollama_url: Optional[str] = None'),
    ('changed = {}\n    if config.chat_model is not None:\n        os.environ["OLLAMA_MODEL_CHAT"] = config.chat_model\n        changed["chat_model"] = config.chat_model\n        logger.info(f"[ollama] Chat model alterado para \'{config.chat_model}\' por \'{current_admin.username}\'")\n\n    if config.embed_model is not None:\n        os.environ["OLLAMA_MODEL_EMBED"] = config.embed_model\n        changed["embed_model"] = config.embed_model\n        logger.info(f"[ollama] Embed model alterado para \'{config.embed_model}\' por \'{current_admin.username}\'")', 'changed = {}\n    if config.chat_model is not None:\n        os.environ["OLLAMA_MODEL_CHAT"] = config.chat_model\n        changed["chat_model"] = config.chat_model\n        logger.info(f"[ollama] Chat model alterado para \'{config.chat_model}\' por \'{current_admin.username}\'")\n\n    if config.embed_model is not None:\n        os.environ["OLLAMA_MODEL_EMBED"] = config.embed_model\n        changed["embed_model"] = config.embed_model\n        logger.info(f"[ollama] Embed model alterado para \'{config.embed_model}\' por \'{current_admin.username}\'")\n\n    if config.ollama_url is not None:\n        os.environ["OLLAMA_URL"] = config.ollama_url\n        changed["ollama_url"] = config.ollama_url\n        logger.info(f"[ollama] Host URL alterado para \'{config.ollama_url}\' por \'{current_admin.username}\'")'),
    ('"embed_model": os.getenv("OLLAMA_MODEL_EMBED"),', '"embed_model": os.getenv("OLLAMA_MODEL_EMBED"),\n            "ollama_url": os.getenv("OLLAMA_URL"),')
]

replace_in_file('backend/routers/ollama.py', ollama_py_replacements)
print("done")

from .api import register_routes
from .lifegame_logic import lifegame_instance

# 导出生命游戏实例，方便其他模块使用
__all__ = ["register_routes", "lifegame_instance"]
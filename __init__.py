"""
@author: assemly
@title: ComfyUI Life Game
@nickname: ComfyUI-LifeGame
@version: 1.0.0
@description: 康威生命游戏节点插件，支持动态运行和实时控制
"""
import os
import sys

# 将当前目录添加到Python路径
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

# 导入节点映射
from .comfyui_nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

# 获取ComfyUI服务实例并注册API路由
try:
    # 导入PromptServer以便在server/api.py中使用
    from server import PromptServer
    
    # 直接导入API模块，这将自动注册装饰器中定义的路由
    from .server import *
    
    print("生命游戏API路由已成功注册")
except ImportError as e:
    print(f"警告: {e}，部分功能可能不可用")

WEB_DIRECTORY = "./web"
# 添加需要加载的JS文件
WEB_DIRECTORY_FILES = ["lifegame_preview.js"]
__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY", "WEB_DIRECTORY_FILES"]

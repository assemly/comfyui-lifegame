"""
生命游戏API接口模块
"""
import json
import io
import base64
import os
import time
from aiohttp import web
from server import PromptServer
from .lifegame_logic import lifegame_instance

# 游戏控制API
@PromptServer.instance.routes.post("/api/extensions/comfyui-lifegame/lifegame/start")
@PromptServer.instance.routes.post("/api/lifegame/start")
async def start_game(request):
    """开始游戏
    
    Args:
        request: HTTP请求对象
        
    Returns:
        web.Response: HTTP响应
    """
    lifegame_instance.start()
    return web.json_response({"status": "success", "message": "Game started"})

@PromptServer.instance.routes.post("/api/extensions/comfyui-lifegame/lifegame/stop")
@PromptServer.instance.routes.post("/api/lifegame/stop")
async def stop_game(request):
    """停止游戏
    
    Args:
        request: HTTP请求对象
        
    Returns:
        web.Response: HTTP响应
    """
    lifegame_instance.stop()
    return web.json_response({"status": "success", "message": "Game stopped"})

@PromptServer.instance.routes.post("/api/extensions/comfyui-lifegame/lifegame/random_init")
@PromptServer.instance.routes.post("/api/lifegame/random_init")
async def random_init_game(request):
    """随机初始化游戏
    
    Args:
        request: HTTP请求对象，可以包含density参数
        
    Returns:
        web.Response: HTTP响应
    """
    try:
        data = await request.json()
        density = float(data.get('density', 0.3))
        lifegame_instance.random_init(density)
        return web.json_response({"status": "success", "message": f"Game initialized randomly with density {density}"})
    except json.JSONDecodeError:
        # 如果请求没有JSON数据，使用默认值
        lifegame_instance.random_init()
        return web.json_response({"status": "success", "message": "Game initialized randomly with default density"})
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=400)

@PromptServer.instance.routes.post("/api/extensions/comfyui-lifegame/lifegame/clear")
@PromptServer.instance.routes.post("/api/lifegame/clear")
async def clear_game(request):
    """清空游戏网格
    
    Args:
        request: HTTP请求对象
        
    Returns:
        web.Response: HTTP响应
    """
    lifegame_instance.clear()
    return web.json_response({"status": "success", "message": "Game grid cleared"})

@PromptServer.instance.routes.get("/api/extensions/comfyui-lifegame/lifegame/state")
@PromptServer.instance.routes.get("/api/lifegame/state")
async def get_state(request):
    """获取游戏状态
    
    Args:
        request: HTTP请求对象
        
    Returns:
        web.Response: HTTP响应，包含游戏当前状态
    """
    state = lifegame_instance.get_state()
    return web.json_response({"status": "success", "data": state})

@PromptServer.instance.routes.get("/api/extensions/comfyui-lifegame/lifegame/image")
@PromptServer.instance.routes.get("/api/lifegame/image")
async def get_image(request):
    """获取游戏图像
    
    Args:
        request: HTTP请求对象
        
    Returns:
        web.Response: HTTP响应，包含游戏当前图像的base64编码
    """
    img = lifegame_instance.get_image()
    # 将图像转换为base64字符串
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    return web.json_response({
        "status": "success", 
        "image": f"data:image/png;base64,{img_base64}"
    })

@PromptServer.instance.routes.post("/api/extensions/comfyui-lifegame/lifegame/set_cell")
@PromptServer.instance.routes.post("/api/lifegame/set_cell")
async def set_cell(request):
    """设置单个细胞状态
    
    Args:
        request: HTTP请求对象，包含x, y, state参数
        
    Returns:
        web.Response: HTTP响应
    """
    try:
        data = await request.json()
        x = int(data.get('x', 0))
        y = int(data.get('y', 0))
        state = int(data.get('state', 0))
        
        lifegame_instance.set_cell(x, y, state)
        return web.json_response({"status": "success", "message": f"Cell at ({x}, {y}) set to {state}"})
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=400)

@PromptServer.instance.routes.post("/api/extensions/comfyui-lifegame/lifegame/toggle_cell")
@PromptServer.instance.routes.post("/api/lifegame/toggle_cell")
async def toggle_cell(request):
    """切换单个细胞状态
    
    Args:
        request: HTTP请求对象，包含x, y参数
        
    Returns:
        web.Response: HTTP响应
    """
    try:
        data = await request.json()
        x = int(data.get('x', 0))
        y = int(data.get('y', 0))
        
        new_state = lifegame_instance.toggle_cell(x, y)
        if new_state is not None:
            return web.json_response({
                "status": "success", 
                "message": f"Cell at ({x}, {y}) toggled", 
                "state": new_state
            })
        else:
            return web.json_response({
                "status": "error", 
                "message": f"Cell at ({x}, {y}) is out of bounds"
            }, status=400)
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=400)

@PromptServer.instance.routes.post("/api/extensions/comfyui-lifegame/lifegame/set_interval")
@PromptServer.instance.routes.post("/api/lifegame/set_interval")
async def set_interval(request):
    """设置更新间隔
    
    Args:
        request: HTTP请求对象，包含interval参数（秒）
        
    Returns:
        web.Response: HTTP响应
    """
    try:
        data = await request.json()
        interval = float(data.get('interval', 0.1))
        
        lifegame_instance.set_update_interval(interval)
        return web.json_response({
            "status": "success", 
            "message": f"Update interval set to {lifegame_instance.update_interval}s"
        })
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=400)

@PromptServer.instance.routes.get("/api/extensions/comfyui-lifegame/lifegame/presets")
@PromptServer.instance.routes.get("/api/lifegame/presets")
async def get_presets(request):
    """获取所有可用的预设
    
    Args:
        request: HTTP请求对象
        
    Returns:
        web.Response: HTTP响应，包含所有可用预设名称的列表
    """
    presets = lifegame_instance.get_presets()
    return web.json_response({
        "status": "success", 
        "presets": presets
    })

@PromptServer.instance.routes.post("/api/extensions/comfyui-lifegame/lifegame/load_preset")
@PromptServer.instance.routes.post("/api/lifegame/load_preset")
async def load_preset(request):
    """加载预设图案
    
    Args:
        request: HTTP请求对象，包含preset_name参数，可选包含x_offset和y_offset参数
        
    Returns:
        web.Response: HTTP响应
    """
    try:
        data = await request.json()
        preset_name = data.get('preset_name')
        if not preset_name:
            return web.json_response({
                "status": "error", 
                "message": "preset_name is required"
            }, status=400)
        
        x_offset = data.get('x_offset')
        if x_offset is not None:
            x_offset = int(x_offset)
        
        y_offset = data.get('y_offset')
        if y_offset is not None:
            y_offset = int(y_offset)
        
        success = lifegame_instance.load_preset(preset_name, x_offset, y_offset)
        if success:
            return web.json_response({
                "status": "success", 
                "message": f"Preset '{preset_name}' loaded successfully"
            })
        else:
            return web.json_response({
                "status": "error", 
                "message": f"Preset '{preset_name}' not found"
            }, status=404)
    except Exception as e:
        return web.json_response({"status": "error", "message": str(e)}, status=400)

@PromptServer.instance.routes.get("/api/extensions/comfyui-lifegame/animation/preview/{filename}")
async def get_animation_preview(request):
    """获取生命游戏动画预览
    
    Args:
        request: HTTP请求对象，包含filename参数
        
    Returns:
        web.FileResponse: 返回GIF文件
    """
    try:
        filename = request.match_info['filename']
        
        # 安全检查，防止路径穿越攻击
        if '..' in filename or filename.startswith('/'):
            return web.Response(status=403, text="路径不允许")
        
        # 构建GIF文件路径
        current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        gif_path = os.path.join(current_dir, "web", "temp", filename)
        
        debug_info = {
            "requested_file": filename,
            "full_path": gif_path,
            "exists": os.path.exists(gif_path),
            "dir_exists": os.path.exists(os.path.dirname(gif_path))
        }
        print(f"预览请求信息: {debug_info}")
        
        # 检查文件是否存在
        if not os.path.exists(gif_path):
            return web.Response(status=404, text=f"文件不存在: {gif_path}")
        
        # 返回文件
        return web.FileResponse(gif_path)
    except Exception as e:
        import traceback
        print(f"获取预览出错: {str(e)}")
        print(traceback.format_exc())
        return web.Response(status=500, text=str(e))

# 用于存储最新生成的GIF文件信息
latest_gif_info = {
    "path": None,
    "timestamp": 0
}

# 注册一个WebSocket处理器，用于实时通知GIF生成
@PromptServer.instance.routes.get("/ws/lifegame/gif_updates")
async def websocket_gif_updates(request):
    ws = web.WebSocketResponse()
    await ws.prepare(request)
    
    # 将当前WebSocket连接添加到WebSocket列表中
    if not hasattr(PromptServer.instance, 'lifegame_ws_clients'):
        PromptServer.instance.lifegame_ws_clients = []
    PromptServer.instance.lifegame_ws_clients.append(ws)
    
    print(f"新的WebSocket连接，当前客户端数: {len(PromptServer.instance.lifegame_ws_clients)}")
    
    try:
        # 发送当前最新的GIF信息
        if latest_gif_info["path"]:
            await ws.send_json({
                "type": "gif_update",
                "path": latest_gif_info["path"],
                "timestamp": latest_gif_info["timestamp"]
            })
        
        # 等待连接关闭
        async for msg in ws:
            if msg.type == web.WSMsgType.ERROR:
                print(f"WebSocket错误: {ws.exception()}")
    finally:
        # 移除WebSocket连接
        if ws in PromptServer.instance.lifegame_ws_clients:
            PromptServer.instance.lifegame_ws_clients.remove(ws)
        print(f"WebSocket连接关闭，当前客户端数: {len(PromptServer.instance.lifegame_ws_clients)}")
    
    return ws

# 广播GIF更新到所有WebSocket连接
async def broadcast_gif_update(path):
    if not hasattr(PromptServer.instance, 'lifegame_ws_clients'):
        return
    
    clients = PromptServer.instance.lifegame_ws_clients
    if not clients:
        return
    
    message = {
        "type": "gif_update",
        "path": path,
        "timestamp": int(time.time() * 1000)
    }
    
    for ws in clients[:]:  # 使用副本迭代，因为可能会在迭代过程中移除元素
        try:
            if not ws.closed:
                await ws.send_json(message)
        except Exception as e:
            print(f"发送WebSocket消息失败: {e}")
            if ws in clients:
                clients.remove(ws)

def update_latest_gif(path):
    """更新最新GIF信息并通知所有客户端
    
    Args:
        path: GIF文件路径
    """
    global latest_gif_info
    
    if path:
        filename = os.path.basename(path)
        latest_gif_info = {
            "path": filename,
            "timestamp": int(time.time() * 1000)
        }
        print(f"更新了最新GIF信息: {latest_gif_info}")
        
        # 创建异步任务广播更新
        async def notify():
            await broadcast_gif_update(filename)
        
        # 使用PromptServer的事件循环来执行异步任务
        if hasattr(PromptServer.instance, 'loop'):
            PromptServer.instance.loop.create_task(notify())

# 为了向后兼容，保留register_routes函数
def register_routes(app):
    """
    注册API路由 - 此函数保留用于向后兼容，
    实际路由现在通过装饰器自动注册
    
    Args:
        app: aiohttp应用实例
    """
    # 路由已通过装饰器注册，此函数仅为保持向后兼容性
    pass 

@PromptServer.instance.routes.post("/api/extensions/comfyui-lifegame/animation/open_file_explorer")
async def open_file_explorer(request):
    """在系统资源管理器中打开文件所在文件夹
    
    Args:
        request: HTTP请求对象，包含filename和type参数
        
    Returns:
        web.Response: HTTP响应
    """
    try:
        data = await request.json()
        filename = data.get('filename')
        file_type = data.get('type', 'output')  # 默认是output目录
        
        if not filename:
            return web.json_response({
                "status": "error", 
                "message": "filename is required"
            }, status=400)
        
        # 安全检查，防止路径穿越攻击
        if '..' in filename or filename.startswith('/'):
            return web.json_response({
                "status": "error",
                "message": "Invalid filename"
            }, status=403)
        
        # 根据类型确定目录
        import folder_paths
        if file_type == 'output':
            folder = folder_paths.get_output_directory()
        else:
            return web.json_response({
                "status": "error",
                "message": f"Unsupported file type: {file_type}"
            }, status=400)
        
        # 构建完整文件路径
        full_path = os.path.join(folder, filename)
        
        # 确保文件存在
        if not os.path.exists(full_path):
            return web.json_response({
                "status": "error",
                "message": f"File not found: {filename}"
            }, status=404)
        
        # 尝试在系统资源管理器中打开文件所在文件夹
        import subprocess
        import platform
        
        try:
            system = platform.system()
            if system == 'Windows':
                # 在Windows上使用explorer打开并选中文件
                subprocess.Popen(['explorer', '/select,', os.path.normpath(full_path)])
            elif system == 'Darwin':  # macOS
                # 在macOS上使用open命令
                subprocess.Popen(['open', '-R', full_path])
            elif system == 'Linux':
                # 在Linux上尝试使用xdg-open打开文件夹
                folder_path = os.path.dirname(full_path)
                subprocess.Popen(['xdg-open', folder_path])
            else:
                return web.json_response({
                    "status": "error",
                    "message": f"Unsupported platform: {system}"
                }, status=400)
                
            return web.json_response({
                "status": "success",
                "message": f"Opening file explorer for: {filename}",
                "path": full_path
            })
        except Exception as e:
            return web.json_response({
                "status": "error",
                "message": f"Failed to open file explorer: {str(e)}"
            }, status=500)
            
    except Exception as e:
        import traceback
        print(f"打开文件资源管理器失败: {str(e)}")
        print(traceback.format_exc())
        return web.json_response({
            "status": "error", 
            "message": str(e)
        }, status=500) 
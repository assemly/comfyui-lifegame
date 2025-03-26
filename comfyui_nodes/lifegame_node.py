"""
生命游戏节点模块，用于在ComfyUI中创建生命游戏动画
"""
import torch
import numpy as np
from PIL import Image
import os
import json
import folder_paths
from ..server.lifegame_logic import LifeGame
from ..server.api import update_latest_gif

class LifeGameAnimationNode:
    """生命游戏动画节点，生成生命游戏动画并输出为图像序列或视频"""
    
    # 预设列表，从LifeGame类中获取
    PRESETS = list(LifeGame.PRESETS.keys())
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "width": ("INT", {"default": 100, "min": 20, "max": 500, "step": 10}),
                "height": ("INT", {"default": 100, "min": 20, "max": 500, "step": 10}),
                "cell_size": ("INT", {"default": 5, "min": 1, "max": 20, "step": 1}),
                "frames": ("INT", {"default": 30, "min": 1, "max": 300, "step": 1}),
                "mode": (["preset", "random"], {"default": "preset"}),
                "preset": (cls.PRESETS, {"default": "glider"}),
                "density": ("FLOAT", {"default": 0.3, "min": 0.1, "max": 0.9, "step": 0.1}),
                "alive_color": ("STRING", {"default": "#FFFFFF"}),
                "dead_color": ("STRING", {"default": "#000000"}),
            },
            "optional": {
                "x_offset": ("INT", {"default": None, "min": 0, "max": 500, "step": 1}),
                "y_offset": ("INT", {"default": None, "min": 0, "max": 500, "step": 1}),
            }
        }

    RETURN_TYPES = ("IMAGE", "LIFEGAME_STATE")
    RETURN_NAMES = ("images", "final_state")
    FUNCTION = "generate_animation"
    CATEGORY = "生命游戏"
    
    def generate_animation(self, width, height, cell_size, frames, mode, preset, density, alive_color, dead_color, x_offset=None, y_offset=None):
        """生成生命游戏动画

        Args:
            width: 网格宽度
            height: 网格高度
            cell_size: 细胞大小
            frames: 帧数
            mode: 模式（preset或random）
            preset: 预设名称
            density: 随机填充密度
            alive_color: 活细胞颜色
            dead_color: 死细胞颜色
            x_offset: X偏移量
            y_offset: Y偏移量

        Returns:
            Tuple[Tensor, dict]: 包含动画图像和最终状态的元组
        """
        # 创建生命游戏实例
        lifegame = LifeGame(width=width, height=height, cell_size=cell_size)
        
        # 根据模式初始化
        if mode == "preset":
            if x_offset is not None and y_offset is not None:
                lifegame.load_preset(preset, x_offset=x_offset, y_offset=y_offset)
            else:
                lifegame.load_preset(preset)
        else:  # random模式
            lifegame.random_init(density=density)
        
        # 生成帧
        frames_list = []
        
        # 解析颜色
        alive_rgb = self._hex_to_rgb(alive_color)
        dead_rgb = self._hex_to_rgb(dead_color)
        
        # 生成每一帧
        for _ in range(frames):
            # 获取当前状态图像
            current_frame = self._create_frame(lifegame, alive_rgb, dead_rgb)
            frames_list.append(current_frame)
            
            # 更新状态
            lifegame.update()
        
        # 创建最终状态
        final_state = {
            "width": width,
            "height": height,
            "mode": mode,
            "preset": preset if mode == "preset" else None,
            "density": density,
            "generation": lifegame.generation,
            "grid": lifegame.grid.tolist()
        }
        
        # 将帧转换为ComfyUI格式的批量图像
        batch = torch.cat(frames_list, dim=0)
        
        return (batch, final_state)
    
    def _create_frame(self, lifegame, alive_rgb, dead_rgb):
        """从生命游戏状态创建单帧图像
        
        Args:
            lifegame: 生命游戏实例
            alive_rgb: 活细胞颜色RGB值
            dead_rgb: 死细胞颜色RGB值
            
        Returns:
            Tensor: 图像张量
        """
        width, height = lifegame.width, lifegame.height
        cell_size = lifegame.cell_size
        img_width, img_height = width * cell_size, height * cell_size
        
        # 创建图像
        img_array = np.zeros((img_height, img_width, 3), dtype=np.float32)
        
        # 填充死细胞背景
        img_array[:, :] = [c/255.0 for c in dead_rgb]
        
        # 绘制活细胞
        for y in range(height):
            for x in range(width):
                if lifegame.grid[y, x] == 1:
                    y_start, y_end = y * cell_size, (y + 1) * cell_size
                    x_start, x_end = x * cell_size, (x + 1) * cell_size
                    img_array[y_start:y_end, x_start:x_end] = [c/255.0 for c in alive_rgb]
        
        # 转换为ComfyUI格式
        img_tensor = torch.from_numpy(img_array).permute(2, 0, 1)
        return img_tensor.unsqueeze(0)
    
    def _hex_to_rgb(self, hex_color):
        """将16进制颜色转换为RGB元组"""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

class LifeGameSaveAnimationNode:
    """保存生命游戏动画为图像序列或视频"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "images": ("IMAGE",),
                "format": (["png", "jpg", "webp", "gif"], {"default": "gif"}),
                "fps": ("INT", {"default": 10, "min": 1, "max": 60, "step": 1}),
                "filename_prefix": ("STRING", {"default": "lifegame_animation"}),
            }
        }
    
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("preview_path",)
    FUNCTION = "save_animation"
    OUTPUT_NODE = True
    CATEGORY = "生命游戏"
    
    def __init__(self):
        # 初始化UI属性
        self.output_ui = {"preview_path": ""}
    
    # 添加get_ui方法，供ComfyUI获取UI属性
    @classmethod
    def GET_UI(cls, node):
        # 如果节点有output_ui属性，返回它
        ui = getattr(node, "output_ui", None)
        if ui is not None:
            return ui
        return {"preview_path": ""}
    
    def save_animation(self, images, format, fps, filename_prefix):
        """保存动画

        Args:
            images: 图像张量
            format: 保存格式
            fps: 每秒帧数
            filename_prefix: 文件名前缀

        Returns:
            dict: 包含预览路径的字典
        """
        output_dir = folder_paths.get_output_directory()
        
        # 确保输出目录存在
        os.makedirs(output_dir, exist_ok=True)
        
        # 生成文件路径
        file_counter = len(os.listdir(output_dir))
        filename = f"{filename_prefix}_{file_counter:05d}"
        
        preview_path = ""
        
        if format == "gif":
            # 保存为GIF动画
            pil_images = []
            for i in range(images.shape[0]):
                img = images[i]
                # 转换为PIL图像
                img = (img.permute(1, 2, 0).cpu().numpy() * 255).astype(np.uint8)
                pil_img = Image.fromarray(img)
                pil_images.append(pil_img)
            
            # 第一帧
            first_img = pil_images[0]
            
            # 保存为GIF
            gif_path = os.path.join(output_dir, f"{filename}.gif")
            first_img.save(
                gif_path,
                save_all=True,
                append_images=pil_images[1:],
                optimize=False,
                duration=1000//fps,  # 毫秒/帧
                loop=0  # 0表示无限循环
            )
            
            print(f"生命游戏动画已保存为: {gif_path}")
            preview_path = os.path.join(folder_paths.get_output_directory(), f"{filename}.gif")
            
            # 复制一份到web目录中供预览使用
            web_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "web", "temp")
            os.makedirs(web_dir, exist_ok=True)
            web_preview_path = os.path.join(web_dir, f"{filename}.gif")
            
            # 复制文件
            import shutil
            try:
                shutil.copy2(gif_path, web_preview_path)
                print(f"已复制GIF到预览路径: {web_preview_path}")
                
                # 更新最新GIF信息并通知前端
                update_latest_gif(f"{filename}.gif")
                
                # 返回相对路径
                relative_path = f"temp/{filename}.gif"
                print(f"生成的相对路径: {relative_path}")
                print(f"返回值: ({relative_path},)")
            except Exception as e:
                print(f"复制GIF文件失败: {str(e)}")
            
            # 为了确保前端能接收到预览路径，添加一个ui属性
            setattr(self, "output_ui", {"preview_path": relative_path})
        else:
            # 保存为图像序列
            sequence_dir = os.path.join(output_dir, filename)
            os.makedirs(sequence_dir, exist_ok=True)
            
            for i in range(images.shape[0]):
                img = images[i]
                # 转换为PIL图像
                img = (img.permute(1, 2, 0).cpu().numpy() * 255).astype(np.uint8)
                pil_img = Image.fromarray(img)
                
                # 保存图像
                img_path = os.path.join(sequence_dir, f"frame_{i:05d}.{format}")
                pil_img.save(img_path)
            
            # 创建一个描述文件，包含元数据
            metadata = {
                "frames": images.shape[0],
                "fps": fps,
                "format": format,
                "width": images.shape[3],
                "height": images.shape[2]
            }
            
            meta_path = os.path.join(sequence_dir, "metadata.json")
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)
            
            print(f"生命游戏动画帧已保存到目录: {sequence_dir}")
            preview_path = ""
            relative_path = ""
            
            # 清空ui属性
            setattr(self, "output_ui", {"preview_path": ""})
        
        return (relative_path,)

# 注册节点
NODE_CLASS_MAPPINGS = {
    "LifeGameAnimation": LifeGameAnimationNode,
    "LifeGameSaveAnimation": LifeGameSaveAnimationNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "LifeGameAnimation": "生命游戏动画",
    "LifeGameSaveAnimation": "保存生命游戏动画"
}

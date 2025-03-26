"""
生命游戏核心逻辑模块
"""
import numpy as np
import threading
import time
from PIL import Image

class LifeGame:
    """生命游戏核心逻辑类"""
    
    # 预设模式字典
    PRESETS = {
        "glider": [
            (1, 0), (2, 1), (0, 2), (1, 2), (2, 2)
        ],
        "blinker": [
            (1, 0), (1, 1), (1, 2)
        ],
        "toad": [
            (1, 1), (2, 1), (3, 1), (0, 2), (1, 2), (2, 2)
        ],
        "beacon": [
            (0, 0), (1, 0), (0, 1), (3, 2), (2, 3), (3, 3)
        ],
        "pulsar": [
            # 上边缘
            (2, 0), (3, 0), (4, 0), (8, 0), (9, 0), (10, 0),
            # 第2行
            (0, 2), (5, 2), (7, 2), (12, 2),
            # 第3行
            (0, 3), (5, 3), (7, 3), (12, 3),
            # 第4行
            (0, 4), (5, 4), (7, 4), (12, 4),
            # 第5行
            (2, 5), (3, 5), (4, 5), (8, 5), (9, 5), (10, 5),
            # 中间对称部分
            # 第7行
            (2, 7), (3, 7), (4, 7), (8, 7), (9, 7), (10, 7),
            # 第8行
            (0, 8), (5, 8), (7, 8), (12, 8),
            # 第9行
            (0, 9), (5, 9), (7, 9), (12, 9),
            # 第10行
            (0, 10), (5, 10), (7, 10), (12, 10),
            # 下边缘
            (2, 12), (3, 12), (4, 12), (8, 12), (9, 12), (10, 12)
        ],
        "gosper_glider_gun": [
            # 左侧方块
            (0, 4), (0, 5), (1, 4), (1, 5),
            # 第一个组合
            (10, 4), (10, 5), (10, 6),
            (11, 3), (11, 7),
            (12, 2), (12, 8),
            (13, 2), (13, 8),
            (14, 5),
            (15, 3), (15, 7),
            (16, 4), (16, 5), (16, 6),
            (17, 5),
            # 右侧组合
            (20, 2), (20, 3), (20, 4),
            (21, 2), (21, 3), (21, 4),
            (22, 1), (22, 5),
            (24, 0), (24, 1), (24, 5), (24, 6),
            # 右侧方块
            (34, 2), (34, 3), (35, 2), (35, 3)
        ],
        "diehard": [
            (6, 0),
            (0, 1), (1, 1),
            (1, 2), (5, 2), (6, 2), (7, 2)
        ],
        "acorn": [
            (1, 0),
            (3, 1),
            (0, 2), (1, 2), (4, 2), (5, 2), (6, 2)
        ],
        "lightweight_spaceship": [
            (1, 0), (4, 0),
            (0, 1),
            (0, 2), (4, 2),
            (0, 3), (1, 3), (2, 3), (3, 3)
        ],
        "r_pentomino": [
            (1, 0), (2, 0),
            (0, 1), (1, 1),
            (1, 2)
        ],
        "infinite_growth": [
            # 轻型宇宙飞船发生器（会无限产生飞船）
            (0, 4), (0, 5), (1, 4), (1, 5), # 左下方块
            (10, 4), (10, 5), (10, 6), 
            (11, 3), (11, 7),
            (12, 2), (12, 8),
            (13, 2), (13, 8),
            (14, 5),
            (15, 3), (15, 7),
            (16, 4), (16, 5), (16, 6),
            (17, 5),
            (20, 2), (20, 3), (20, 4), (21, 2), (21, 3), (21, 4), # 右侧小块
            (22, 1), (22, 5),
            (24, 0), (24, 1), (24, 5), (24, 6)
        ],
        "glider_gun": [
            # Gosper滑翔机枪 - 周期性产生滑翔机
            (0, 4), (0, 5), (1, 4), (1, 5), # 左下方块
            (10, 4), (10, 5), (10, 6), 
            (11, 3), (11, 7),
            (12, 2), (12, 8),
            (13, 2), (13, 8),
            (14, 5),
            (15, 3), (15, 7),
            (16, 4), (16, 5), (16, 6),
            (17, 5),
            (20, 2), (20, 3), (20, 4), (21, 2), (21, 3), (21, 4), # 右侧小块
            (22, 1), (22, 5),
            (24, 0), (24, 1), (24, 5), (24, 6),
            (34, 2), (34, 3), (35, 2), (35, 3) # 右侧方块
        ],
        "line_puffer": [
            # 线型推进器 - 会产生持续扩展的尾迹
            (0, 0), (1, 0), (2, 0), (3, 0), (4, 0), (5, 0), (6, 0),
            (0, 1), (6, 1),
            (6, 2),
            (0, 3), (5, 3),
            (0, 4), (1, 4), (2, 4), (3, 4), (4, 4)
        ]
    }
    
    def __init__(self, width=100, height=100, cell_size=5):
        """初始化生命游戏

        Args:
            width (int): 网格宽度
            height (int): 网格高度
            cell_size (int): 细胞大小（像素）
        """
        self.width = width
        self.height = height
        self.cell_size = cell_size
        self.grid = np.zeros((height, width), dtype=np.uint8)
        self.running = False
        self.thread = None
        self.update_interval = 0.1  # 更新间隔（秒）
        self.generation = 0
        self.lock = threading.Lock()
    
    def random_init(self, density=0.3):
        """随机初始化网格
        
        Args:
            density (float): 活细胞密度，范围0-1
        """
        with self.lock:
            self.grid = np.random.choice([0, 1], size=(self.height, self.width), p=[1-density, density]).astype(np.uint8)
            self.generation = 0
    
    def clear(self):
        """清空网格"""
        with self.lock:
            self.grid = np.zeros((self.height, self.width), dtype=np.uint8)
            self.generation = 0
    
    def load_preset(self, preset_name, x_offset=None, y_offset=None):
        """加载预设图案
        
        Args:
            preset_name (str): 预设名称，必须在PRESETS中定义
            x_offset (int, optional): X偏移，如果为None则居中
            y_offset (int, optional): Y偏移，如果为None则居中
        
        Returns:
            bool: 是否成功加载
        """
        if preset_name not in self.PRESETS:
            return False
        
        pattern = self.PRESETS[preset_name]
        
        # 计算图案尺寸
        max_x = max([p[0] for p in pattern]) if pattern else 0
        max_y = max([p[1] for p in pattern]) if pattern else 0
        
        # 如果未指定偏移，则居中放置
        if x_offset is None:
            x_offset = (self.width - max_x - 1) // 2
        if y_offset is None:
            y_offset = (self.height - max_y - 1) // 2
        
        # 确保偏移量不会使图案超出网格
        x_offset = max(0, min(x_offset, self.width - max_x - 1))
        y_offset = max(0, min(y_offset, self.height - max_y - 1))
        
        with self.lock:
            # 清空网格
            self.grid = np.zeros((self.height, self.width), dtype=np.uint8)
            
            # 添加图案
            for x, y in pattern:
                new_x = x + x_offset
                new_y = y + y_offset
                if 0 <= new_x < self.width and 0 <= new_y < self.height:
                    self.grid[new_y, new_x] = 1
            
            self.generation = 0
        
        return True
    
    def get_presets(self):
        """获取所有可用的预设名称
        
        Returns:
            list: 预设名称列表
        """
        return list(self.PRESETS.keys())
    
    def update(self):
        """更新一步游戏状态"""
        with self.lock:
            # 计算每个细胞的邻居数量
            neighbors = np.zeros_like(self.grid)
            for i in range(-1, 2):
                for j in range(-1, 2):
                    if i == 0 and j == 0:
                        continue
                    neighbors += np.roll(np.roll(self.grid, i, axis=0), j, axis=1)
            
            # 应用生命游戏规则
            new_grid = np.zeros_like(self.grid)
            # 1. 活细胞周围有2-3个活细胞，继续存活
            new_grid[np.logical_and(self.grid == 1, np.logical_or(neighbors == 2, neighbors == 3))] = 1
            # 2. 死细胞周围有3个活细胞，变为活细胞
            new_grid[np.logical_and(self.grid == 0, neighbors == 3)] = 1
            
            self.grid = new_grid
            self.generation += 1
    
    def start(self):
        """开始游戏"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._run_game)
        self.thread.daemon = True
        self.thread.start()
    
    def stop(self):
        """停止游戏"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=1.0)
            self.thread = None
    
    def _run_game(self):
        """游戏运行线程"""
        while self.running:
            self.update()
            time.sleep(self.update_interval)
    
    def set_cell(self, x, y, state):
        """设置单个细胞状态

        Args:
            x (int): x坐标
            y (int): y坐标
            state (int): 状态 (0或1)
        """
        if 0 <= x < self.width and 0 <= y < self.height:
            with self.lock:
                self.grid[y, x] = state
    
    def toggle_cell(self, x, y):
        """切换单个细胞状态
        
        Args:
            x (int): x坐标
            y (int): y坐标
        
        Returns:
            int: 新状态
        """
        if 0 <= x < self.width and 0 <= y < self.height:
            with self.lock:
                self.grid[y, x] = 1 - self.grid[y, x]
                return int(self.grid[y, x])
        return None
    
    def set_update_interval(self, interval):
        """设置更新间隔
        
        Args:
            interval (float): 更新间隔（秒）
        """
        self.update_interval = max(0.01, min(interval, 2.0))
    
    def get_image(self):
        """获取当前状态的图像

        Returns:
            PIL.Image: 生命游戏当前状态的图像
        """
        with self.lock:
            # 创建一个黑白图像
            img_width = self.width * self.cell_size
            img_height = self.height * self.cell_size
            img = Image.new('RGB', (img_width, img_height), color='black')
            
            # 绘制活细胞
            for y in range(self.height):
                for x in range(self.width):
                    if self.grid[y, x] == 1:
                        for i in range(self.cell_size):
                            for j in range(self.cell_size):
                                img.putpixel((x * self.cell_size + i, y * self.cell_size + j), (255, 255, 255))
            
            return img
    
    def get_state(self):
        """获取当前游戏状态

        Returns:
            dict: 包含游戏状态信息的字典
        """
        with self.lock:
            return {
                "running": self.running,
                "generation": self.generation,
                "grid": self.grid.tolist(),
                "interval": self.update_interval,
                "width": self.width,
                "height": self.height
            }

# 创建一个全局实例以便在节点和API之间共享
lifegame_instance = LifeGame() 
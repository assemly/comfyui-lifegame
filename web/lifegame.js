/**
 * 生命游戏前端控制脚本 - 主入口文件
 */

import { app } from "../../scripts/app.js";
import { createLifeGameUI } from "./lifegame-ui.js";
import { loadCSS } from "./utils.js";

// 在ComfyUI初始化完成后添加生命游戏控制面板
app.registerExtension({
    name: "LifeGame",
    async setup() {
        // 加载CSS
        loadCSS('/extensions/comfyui-lifegame/lifegame.css');
        
        try {
            // 获取ComfyUI右侧菜单
            const rightMenu = document.querySelector('.comfyui-menu-right');
            if (rightMenu) {
                const lifegameUI = createLifeGameUI();
                
                // 将按钮插入到右侧菜单的左侧
                rightMenu.parentNode.insertBefore(lifegameUI, rightMenu);
                console.log("生命游戏：控制面板已添加到右侧菜单左侧");
            } else {
                // 获取ComfyUI菜单
                const menuElement = document.querySelector('.comfyui-menu.flex.items-center');
                if (menuElement) {
                    const lifegameUI = createLifeGameUI();
                    // 将按钮添加到菜单中的适当位置
                    menuElement.appendChild(lifegameUI);
                    console.log("生命游戏：控制面板已添加到菜单中");
                } else {
                    // 如果找不到新的UI元素，尝试旧的工具栏
                    const toolbarElement = document.querySelector('.comfy-menu .comfy-tool-bar');
                    if (toolbarElement) {
                        const lifegameUI = createLifeGameUI();
                        toolbarElement.appendChild(lifegameUI);
                        console.log("生命游戏：控制面板已添加到旧版工具栏");
                    } else {
                        console.warn("生命游戏：无法找到合适的位置添加控制面板");
                    }
                }
            }
        } catch (error) {
            console.error("生命游戏：初始化失败", error);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // 获取游戏容器
    const container = document.querySelector('.lifegame-ui-container');
    if (!container) return;
    
    // 初始化UI元素
    const uiElements = initializeGameUI();
    
    // 获取预设图案
    fetch('/lifegame/presets')
        .then(response => response.json())
        .then(presets => {
            // 添加预设选项
            presets.forEach(preset => {
                const option = document.createElement('option');
                option.value = preset;
                option.textContent = preset;
                uiElements.presetSelect.appendChild(option);
            });
        })
        .catch(error => console.error('获取预设图案失败:', error));
    
    // 渲染游戏状态
    const renderGame = () => {
        fetch('/lifegame/state')
            .then(response => response.json())
            .then(state => {
                renderGameState(uiElements.canvas, state, uiElements);
            })
            .catch(error => console.error('获取游戏状态失败:', error));
    };
    
    // 初始渲染
    renderGame();
    
    // 设置定时刷新
    setInterval(renderGame, 100);
    
    // 绑定按钮事件
    uiElements.startBtn.addEventListener('click', () => {
        fetch('/lifegame/start', { method: 'POST' })
            .then(() => console.log('游戏已开始'))
            .catch(error => console.error('开始游戏失败:', error));
    });
    
    uiElements.stopBtn.addEventListener('click', () => {
        fetch('/lifegame/stop', { method: 'POST' })
            .then(() => console.log('游戏已暂停'))
            .catch(error => console.error('暂停游戏失败:', error));
    });
    
    uiElements.stepBtn.addEventListener('click', () => {
        fetch('/lifegame/step', { method: 'POST' })
            .then(() => console.log('执行单步'))
            .catch(error => console.error('执行单步失败:', error));
    });
    
    uiElements.clearBtn.addEventListener('click', () => {
        fetch('/lifegame/clear', { method: 'POST' })
            .then(() => console.log('清除完成'))
            .catch(error => console.error('清除失败:', error));
    });
    
    uiElements.randomBtn.addEventListener('click', () => {
        const density = parseFloat(uiElements.densitySlider.value);
        fetch(`/lifegame/random?density=${density}`, { method: 'POST' })
            .then(() => console.log(`随机初始化，密度: ${density}`))
            .catch(error => console.error('随机初始化失败:', error));
    });
    
    // 预设图案选择事件
    uiElements.presetSelect.addEventListener('change', () => {
        const preset = uiElements.presetSelect.value;
        if (preset) {
            fetch(`/lifegame/preset?pattern=${preset}`, { method: 'POST' })
                .then(() => console.log(`加载预设图案: ${preset}`))
                .catch(error => console.error('加载预设图案失败:', error));
        }
    });
    
    // 密度滑块事件
    uiElements.densitySlider.addEventListener('input', () => {
        uiElements.densityValue.textContent = uiElements.densitySlider.value;
    });
    
    // 画布点击事件（切换细胞状态）
    uiElements.canvas.addEventListener('click', (event) => {
        const rect = uiElements.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // 获取当前状态以确定细胞大小
        fetch('/lifegame/state')
            .then(response => response.json())
            .then(state => {
                const cellSize = state.cell_size || 3;
                const cellX = Math.floor(x / cellSize);
                const cellY = Math.floor(y / cellSize);
                
                // 发送切换细胞状态的请求
                fetch(`/lifegame/toggle?x=${cellX}&y=${cellY}`, { method: 'POST' })
                    .then(() => console.log(`切换细胞状态: (${cellX}, ${cellY})`))
                    .catch(error => console.error('切换细胞状态失败:', error));
            })
            .catch(error => console.error('获取游戏状态失败:', error));
    });
}); 
// 生命游戏动画预览扩展
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

// 启用调试输出
const DEBUG = true;
function debug(...args) {
    if (DEBUG) console.log("[LifegamePreview]", ...args);
}

// 创建一个全局缓存来存储最新生成的动画路径
window.LifegamePreviewCache = window.LifegamePreviewCache || {};

// WebSocket连接
let websocket = null;
let isReconnecting = false;
const reconnectInterval = 5000; // 5秒重连间隔

// 连接WebSocket
function connectWebSocket() {
    if (websocket && (websocket.readyState === WebSocket.OPEN || websocket.readyState === WebSocket.CONNECTING)) {
        return; // 已经连接或正在连接
    }
    
    if (isReconnecting) {
        return; // 已经在重连中
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/lifegame/gif_updates`;
    
    debug("连接WebSocket:", wsUrl);
    
    try {
        websocket = new WebSocket(wsUrl);
        
        websocket.onopen = function() {
            debug("WebSocket连接已建立");
            isReconnecting = false;
        };
        
        websocket.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                debug("收到WebSocket消息:", data);
                
                if (data.type === "gif_update" && data.path) {
                    // 更新全局缓存
                    window.LifegamePreviewCache.latestGif = data.path;
                    window.LifegamePreviewCache.timestamp = data.timestamp;
                    
                    // 通知所有节点更新预览
                    notifyAllNodes(data.path);
                }
            } catch (e) {
                console.error("处理WebSocket消息出错:", e);
            }
        };
        
        websocket.onclose = function(event) {
            debug(`WebSocket连接已关闭: ${event.code} ${event.reason}`);
            // 非正常关闭时尝试重连
            if (!event.wasClean && !isReconnecting) {
                scheduleReconnect();
            }
        };
        
        websocket.onerror = function(error) {
            console.error("WebSocket错误:", error);
            if (!isReconnecting) {
                scheduleReconnect();
            }
        };
    } catch (e) {
        console.error("创建WebSocket连接失败:", e);
        if (!isReconnecting) {
            scheduleReconnect();
        }
    }
}

// 安排WebSocket重连
function scheduleReconnect() {
    if (isReconnecting) return;
    
    isReconnecting = true;
    debug(`${reconnectInterval/1000}秒后尝试重新连接...`);
    
    setTimeout(() => {
        debug("尝试重新连接WebSocket...");
        connectWebSocket();
    }, reconnectInterval);
}

// 通知所有LifeGameSaveAnimation节点更新预览
function notifyAllNodes(gifPath) {
    debug("通知所有节点更新预览:", gifPath);
    
    // 遍历所有节点
    const nodes = app.graph._nodes;
    if (nodes) {
        nodes.forEach(node => {
            if (node.type === "LifeGameSaveAnimation") {
                debug(`更新节点 #${node.id} 的预览`);
                if (node.updatePreview) {
                    node.updatePreview(gifPath);
                }
            }
        });
    }
}

// 当ComfyUI加载完毕后执行
app.registerExtension({
    name: "Lifegame.PreviewAnimation",
    
    async setup() {
        debug("设置WebSocket连接");
        connectWebSocket();
    },
    
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        // 检查节点类型
        if (nodeData.name === "LifeGameSaveAnimation") {
            debug("找到生命游戏保存动画节点:", nodeData.name);
            
            // 保存原始的onNodeCreated方法
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const ret = onNodeCreated
                    ? onNodeCreated.apply(this, arguments)
                    : undefined;
                
                debug("创建生命游戏保存动画节点实例");
                
                // 添加特殊标记以便于重新创建大小
                this.addProperty("show_preview", true);
                
                // 如果全局缓存中有GIF，立即显示
                setTimeout(() => {
                    if (window.LifegamePreviewCache.latestGif) {
                        this.updatePreview(window.LifegamePreviewCache.latestGif);
                    }
                }, 500);
                
                return ret;
            };
            
            // 重写computeSize方法，确保节点有足够空间显示预览
            const computeSize = nodeType.prototype.computeSize;
            nodeType.prototype.computeSize = function() {
                const size = computeSize ? computeSize.apply(this) : [300, 180];
                if (this.properties && this.properties.show_preview) {
                    // 确保节点至少有足够宽度容纳预览
                    const minWidth = 250;
                    const width = Math.max(size[0], minWidth);
                    return [width, size[1] + 200]; // 额外的空间用于预览，调整为200而不是220
                }
                return size;
            };
            
            // 重写drawForeground方法，直接在Canvas上绘制预览
            const drawForeground = nodeType.prototype.onDrawForeground;
            nodeType.prototype.onDrawForeground = function(ctx) {
                if (drawForeground) {
                    drawForeground.apply(this, arguments);
                }
                
                if (!this.properties || !this.properties.show_preview) {
                    return;
                }
                
                // 原始尺寸
                const origSize = computeSize ? computeSize.apply(this) : [300, 180];
                
                // 绘制预览区域 - 调整区域大小和位置
                const margin = 10;
                const x = margin;
                const y = origSize[1] + 5;  // 增加一点额外的顶部边距
                const width = this.size[0] - margin * 2;
                const height = 180;  // 减小高度以适应节点
                
                // 绘制背景
                ctx.fillStyle = "#1a1a1a";
                ctx.strokeStyle = "#333";
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.rect(x, y, width, height);
                ctx.fill();
                ctx.stroke();
                
                // 如果有图像，绘制图像
                if (this.previewImgElement && this.previewImgElement.complete && this.previewImgElement.naturalWidth > 0) {
                    try {
                        // 计算图像适合预览区域的大小
                        const imgWidth = this.previewImgElement.naturalWidth;
                        const imgHeight = this.previewImgElement.naturalHeight;
                        const scale = Math.min((width - 10) / imgWidth, (height - 10) / imgHeight); // 增加内边距
                        const scaledWidth = imgWidth * scale;
                        const scaledHeight = imgHeight * scale;
                        
                        // 居中绘制图像
                        const imgX = x + (width - scaledWidth) / 2;
                        const imgY = y + (height - scaledHeight) / 2;
                        
                        ctx.drawImage(this.previewImgElement, imgX, imgY, scaledWidth, scaledHeight);
                        
                        // 绘制打开文件按钮（仅当有预览图像时显示）- 调整按钮位置
                        const btnX = x + width - 85;  // 减小按钮宽度和位置
                        const btnY = y + height - 30; // 上移按钮位置
                        const btnWidth = 75;  // 减小按钮宽度
                        const btnHeight = 22; // 减小按钮高度
                        
                        // 判断鼠标是否在按钮上，改变按钮状态
                        const inBtn = this.mouseOver && 
                                    LiteGraph.isInsideRectangle(this.mousePos[0], this.mousePos[1], 
                                                               btnX, btnY, btnWidth, btnHeight);
                        
                        // 绘制按钮背景
                        ctx.fillStyle = inBtn ? "#4a6d8c" : "#2c5a7c";
                        ctx.beginPath();
                        ctx.roundRect(btnX, btnY, btnWidth, btnHeight, 3);
                        ctx.fill();
                        ctx.strokeStyle = inBtn ? "#9bbcde" : "#5685ab";
                        ctx.lineWidth = 1;
                        ctx.stroke();
                        
                        // 绘制按钮文本
                        ctx.fillStyle = "#fff";
                        ctx.font = "11px Arial"; // 减小字体大小
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        ctx.fillText("打开", btnX + btnWidth / 2, btnY + btnHeight / 2); // 缩短文本
                        
                        // 记录按钮区域，用于检测点击
                        this.openFileBtnArea = [btnX, btnY, btnWidth, btnHeight];
                        
                        // 如果鼠标在按钮上，显示提示
                        if (inBtn && this.mousePos) {
                            const tipX = this.mousePos[0] + 10;
                            const tipY = this.mousePos[1] - 10;
                            ctx.fillStyle = "#333";
                            ctx.beginPath();
                            ctx.roundRect(tipX, tipY, 100, 20, 3);
                            ctx.fill();
                            ctx.strokeStyle = "#555";
                            ctx.lineWidth = 1;
                            ctx.stroke();
                            
                            ctx.fillStyle = "#fff";
                            ctx.font = "12px Arial";
                            ctx.textAlign = "center";
                            ctx.textBaseline = "middle";
                            ctx.fillText("在新窗口打开GIF", tipX + 50, tipY + 10);
                        }
                    } catch (e) {
                        console.error("绘制预览图像失败:", e);
                    }
                } else {
                    // 如果没有预览或预览未加载完成，显示提示文本
                    const hintText = this.isProcessing 
                        ? "正在处理生命游戏动画..." 
                        : "运行节点以生成GIF预览";
                    
                    ctx.fillStyle = "#666";
                    ctx.font = "14px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(hintText, x + width / 2, y + height / 2);
                    
                    // 如果有图像但未加载完成，重新触发渲染直到加载完成
                    if (this.previewImgElement && !this.previewImgElement.complete) {
                        this.previewImgElement.onload = () => {
                            app.graph.setDirtyCanvas(true);
                        };
                    }
                }
            };
            
            // 扩展节点即将执行的处理
            const onExecuting = nodeType.prototype.onExecuting;
            nodeType.prototype.onExecuting = function() {
                debug("节点开始执行");
                this.isProcessing = true;  // 标记正在处理
                this.previewImgElement = null;  // 清除旧的预览
                app.graph.setDirtyCanvas(true);
                
                if (onExecuting) {
                    return onExecuting.apply(this, arguments);
                }
            };
            
            // 扩展节点执行后的处理
            const onExecuted = nodeType.prototype.onExecuted;
            nodeType.prototype.onExecuted = function(message) {
                // 调用原始方法
                if (onExecuted) {
                    onExecuted.apply(this, arguments);
                }
                
                debug("节点执行完成，收到消息:", message);
                this.isProcessing = false;  // 标记处理完成
                
                // 尝试从不同位置获取预览路径
                let previewPath = null;
                
                if (message) {
                    // 尝试读取message中的路径
                    if (typeof message === "string") {
                        // 可能直接返回了路径字符串
                        previewPath = message;
                    } 
                    else if (Array.isArray(message) && message.length > 0 && typeof message[0] === "string") {
                        // 可能是数组形式返回的路径
                        previewPath = message[0];
                    }
                    else if (message.preview_path) {
                        // 可能存在preview_path属性
                        previewPath = message.preview_path;
                    }
                    else if (message.ui && message.ui.preview_path) {
                        // 可能存在ui.preview_path属性
                        previewPath = message.ui.preview_path;
                    }
                }
                
                debug("提取的预览路径:", previewPath);
                
                // 如果找到预览路径，更新图像
                if (previewPath && typeof previewPath === "string" && previewPath.trim() !== "") {
                    // 通过API获取预览
                    this.updatePreview(previewPath);
                }
            };
            
            // 添加更新预览的方法
            nodeType.prototype.updatePreview = function(previewPath) {
                if (!previewPath) return;
                
                try {
                    // 从路径中提取文件名
                    let filename = previewPath;
                    
                    // 如果路径包含"/"或"\"，提取最后一部分作为文件名
                    if (previewPath.includes('/') || previewPath.includes('\\')) {
                        const parts = previewPath.split(/[/\\]/);
                        filename = parts[parts.length - 1];
                    }
                    
                    debug("文件名:", filename);
                    
                    // 使用API路由访问文件
                    const timestamp = new Date().getTime();
                    const previewUrl = `/api/extensions/comfyui-lifegame/animation/preview/${filename}?t=${timestamp}`;
                    debug("设置预览图像URL:", previewUrl);
                    
                    // 创建或更新图像元素
                    if (!this.previewImgElement) {
                        this.previewImgElement = new Image();
                        this.previewImgElement.onload = () => {
                            debug("预览图像加载完成");
                            app.graph.setDirtyCanvas(true);
                        };
                        this.previewImgElement.onerror = (e) => {
                            console.error("加载预览图像失败:", e);
                            debug("URL:", this.previewImgElement.src);
                            this.previewImgElement = null;  // 清除加载失败的图像
                            app.graph.setDirtyCanvas(true);
                        };
                    }
                    
                    // 设置图像源
                    this.previewImgElement.src = previewUrl;
                    
                    // 强制重绘
                    app.graph.setDirtyCanvas(true);
                    
                } catch (error) {
                    console.error("更新预览时出错:", error);
                    this.previewImgElement = null;
                }
            };

            // 添加鼠标事件处理
            const onMouseDown = nodeType.prototype.onMouseDown;
            nodeType.prototype.onMouseDown = function(event, pos, graphCanvas) {
                // 检查是否点击了打开文件按钮
                if (this.openFileBtnArea) {
                    const [btnX, btnY, btnWidth, btnHeight] = this.openFileBtnArea;
                    if (pos[0] >= btnX && pos[0] <= btnX + btnWidth && 
                        pos[1] >= btnY && pos[1] <= btnY + btnHeight) {
                        debug("点击打开文件按钮");
                        this.openSavedFile();
                        return true;
                    }
                }
                
                // 调用原始方法
                if (onMouseDown) {
                    return onMouseDown.apply(this, arguments);
                }
                return false;
            };
            
            // 添加打开文件的方法
            nodeType.prototype.openSavedFile = function() {
                if (!this.previewImgElement || !this.previewImgElement.src) {
                    return;
                }
                
                try {
                    // 从URL中获取文件名
                    const url = this.previewImgElement.src;
                    const match = url.match(/\/animation\/preview\/([^?]+)/);
                    if (!match || !match[1]) {
                        debug("无法从URL提取文件名:", url);
                        return;
                    }
                    
                    const filename = match[1];
                    debug("打开文件:", filename);
                    
                    // 构建输出文件夹URL
                    let outputPath;
                    let baseUrl;
                    
                    // 获取ComfyUI的基础URL
                    const comfyuiBase = window.location.origin;
                    
                    // 方法1：直接使用视图链接 - 使用ComfyUI的文件浏览功能
                    outputPath = `view?filename=${encodeURIComponent(filename)}&type=output&subfolder=`;
                    baseUrl = `${comfyuiBase}/${outputPath}`;
                    
                    // 尝试打开文件
                    debug("尝试打开:", baseUrl);
                    window.open(baseUrl, '_blank');
                    
                    // 额外：将文件路径复制到剪贴板，便于用户在文件浏览器中查找
                    const clipboardText = `输出文件: ${filename}`;
                    try {
                        navigator.clipboard.writeText(clipboardText).then(() => {
                            debug("文件路径已复制到剪贴板");
                        }).catch(err => {
                            console.error("复制到剪贴板失败:", err);
                        });
                    } catch (e) {
                        console.error("剪贴板API不可用:", e);
                    }
                } catch (error) {
                    console.error("打开文件时出错:", error);
                }
            };

            // 添加到节点右键菜单
            const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
            nodeType.prototype.getExtraMenuOptions = function(_, options) {
                if (getExtraMenuOptions) {
                    getExtraMenuOptions.apply(this, arguments);
                }
                
                // 获取当前预览的文件名
                let currentFilename = null;
                if (this.previewImgElement && this.previewImgElement.src) {
                    const match = this.previewImgElement.src.match(/\/animation\/preview\/([^?]+)/);
                    if (match && match[1]) {
                        currentFilename = match[1];
                    }
                }
                
                // 添加文件相关选项
                if (currentFilename) {
                    options.push({
                        content: "📁 在新窗口打开GIF",
                        callback: () => {
                            this.openSavedFile();
                        }
                    });
                    
                    options.push({
                        content: "📋 复制文件名到剪贴板",
                        callback: () => {
                            try {
                                navigator.clipboard.writeText(currentFilename).then(() => {
                                    debug("文件名已复制到剪贴板:", currentFilename);
                                }).catch(err => {
                                    console.error("复制到剪贴板失败:", err);
                                });
                            } catch (e) {
                                console.error("剪贴板API不可用:", e);
                            }
                        }
                    });
                    
                    // 添加在系统资源管理器中显示的功能（需要服务器端支持）
                    options.push({
                        content: "💻 在系统资源管理器中显示",
                        callback: () => {
                            debug("请求在系统资源管理器中显示文件:", currentFilename);
                            // 调用API尝试在服务器端打开文件所在文件夹
                            fetch("/api/extensions/comfyui-lifegame/animation/open_file_explorer", {
                                method: "POST",
                                headers: {
                                    "Content-Type": "application/json"
                                },
                                body: JSON.stringify({
                                    filename: currentFilename,
                                    type: "output"
                                })
                            })
                            .then(response => response.json())
                            .then(data => {
                                debug("打开资源管理器请求结果:", data);
                            })
                            .catch(error => {
                                console.error("请求打开资源管理器失败:", error);
                            });
                        }
                    });
                } else {
                    options.push({
                        content: "💤 暂无文件可操作",
                        callback: () => {}
                    });
                }
            };

            // 添加鼠标移动事件处理，用于更新鼠标位置和提示
            const onMouseMove = nodeType.prototype.onMouseMove;
            nodeType.prototype.onMouseMove = function(event, pos, graphCanvas) {
                // 更新鼠标位置
                this.mousePos = pos;
                
                // 检查是否在按钮上，需要重绘
                if (this.openFileBtnArea) {
                    const [btnX, btnY, btnWidth, btnHeight] = this.openFileBtnArea;
                    const inBtn = pos[0] >= btnX && pos[0] <= btnX + btnWidth && 
                                 pos[1] >= btnY && pos[1] <= btnY + btnHeight;
                    
                    if (inBtn) {
                        // 鼠标在按钮上，重绘画布
                        app.graph.setDirtyCanvas(true);
                    }
                }
                
                // 调用原始方法
                if (onMouseMove) {
                    return onMouseMove.apply(this, arguments);
                }
            };
        }
    }
}); 
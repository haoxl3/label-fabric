import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Button, Space } from 'antd';
import 'antd/dist/antd.css';

export default function Home() {
    const canvasEl = useRef(null);
    const [drawType, setDrawType] = useState(null);  //当前绘制图像的种类
    const [doDrawing, setDoDrawing] = useState(false); // 绘制状态
    const [polygonMode, setPolygonMode] = useState(false);
    const [activeShape, setActiveShape] = useState(false);
    const mouseFrom = useRef({});
    const mouseTo = useRef({});
    const textbox = useRef(null);
    const line = useRef({});
    const drawingObject = useRef(null); // 当前绘制对象
    let canvas = {};
    const pointArray = [];
    const lineArray = [];
    let activeLine = '';
    const drawWidth = 2; //笔触宽度
    const color = "#E34F51"; //画笔颜色
    const moveCount = useRef(1);

    // 鼠标按下时触发
    const mouseDownHandle = (e) => {
        debugger
        let xy = e.pointer || transformMouse(e.e.offsetX, e.e.offsetY);
        mouseFrom.current.x = xy.x;
        mouseFrom.current.y = xy.y;
        setDoDrawing(true);
        if (drawType === 'text') {
            drawingHandle(e);
        }
        if (textbox.current) {
            textbox.current.enterEditing();
            textbox.current.hiddenTextarea.focus();
        }
        // 绘制多边形
        if (drawType === 'polygon') {
            canvas.skipTargetFind = false;
            try {
                // 判断是否闭合多边形，点击红点时闭合多边形
                if (pointArray.length > 1) {
                    // e.target.id == this.pointArray[0].id 表示点击了初始红点
                    if (e.target && e.target.id == pointArray[0].id) {
                        generatePolygon();
                    }
                }
                //未点击红点则继续作画
                if (polygonMode) {
                    addPoint(e);
                }
            } catch (error) {
                console.log(error);
            }
        }
    };
    // 鼠标移动过程中已经完成了绘制
    const mouseMoveHandle = (e) => {
        debugger
        if (moveCount.current % 2 && !doDrawing) {
            //减少绘制频率
            return;
        }
        moveCount.current++;
        let xy = e.pointer || transformMouse(e.e.offsetX, e.e.offsetY);
        mouseTo.current.x = xy.x;
        mouseTo.current.y = xy.y;
        // 多边形与文字框特殊处理
        if (drawType !== 'text' || drawType !== 'polygon') {
            drawingHandle(e);
        }
        if (drawType === 'polygon') {
            if (activeLine && activeLine.class === 'line') {
                let pointer = canvas.getPointer(e.e);
                activeLine.strike({x2: pointer.x, y2: pointer.y});
                let points = activeShape.get('points');
                points[pointArray.length] = {
                    x: pointer.x,
                    y: pointer.y,
                    zIndex: 1
                };
                activeShape.set({points: points});
                canvas.renderAll();
            }
            canvas.renderAll();
        }
    };
    // 鼠标松开执行
    const mouseUpHandle = (e) => {
        let xy = e.pointer || transformMouse(e.e.offsetX, e.e.offsetY);
        mouseTo.current.x = xy.x;
        mouseTo.current.y = xy.y;
        drawingObject.current = null;
        moveCount.current = 1;
        if (drawType !== 'polygon') {
            setDoDrawing(false);
        }
    };
    // 删除某个形状
    const deleteObjHandle = () => {
        canvas.getActiveObjects().map(item => {
            canvas.remove(item);
        });
    };
    // 开始绘制时，指定绘画种类
    const drawTypeChange = e => {
        setDrawType(e);
        canvas.skipTargetFind = !!e;
        if (e === 'pen') {
            // isDrawingMode为true 才可以自由绘画
            canvas.isDrawingMode = true;
        } else {
            canvas.isDrawingMode = false;
        }
    };
    const drawingHandle = (e) => {
        if (drawingObject.current) {
            canvas.remove(drawingObject.current);
        }
        let canvasObject = null;
        let left = mouseFrom.current.x;
        let top = mouseFrom.current.y;
        let mouseFrom = mouseFrom.current;
        let mouseTo = mouseTo.current;
        switch (drawType) {
            case 'arrow':
                let {x: x1, y: y1} = mouseFrom.current;
                let {x: x2, y: y2} = mouseTo.current;
                let w = x2 - x1;
                let h = y2 - y1;
                let sh = Math.cos(Math.PI / 4) * 16;
                let sin = h / Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2));
                let cos = w / Math.sqrt(Math.pow(w, 2) + Math.pow(h, 2));
                //w1 ，h1用于确定四个点
                let w1 = (16 * sin) / 4;
                let h1 = (16 * cos) / 4;
                //centerx,centery 表示起始点，终点连线与箭头尖端等边三角形交点相对x，y
                let centerx = sh * cos;
                let centery = sh * sin;
                let path = " M " + x1 + " " + y1;
                path += " L " + (x2 - centerx + w1) + " " + (y2 - centery - h1);
                path += " L " + (x2 - centerx + w1 * 2) + " " + (y2 - centery - h1 * 2);
                path += " L " + x2 + " " + y2;
                path += " L " + (x2 - centerx - w1 * 2) + " " + (y2 - centery + h1 * 2);
                path += " L " + (x2 - centerx - w1) + " " + (y2 - centery + h1);
                path += " Z";
                canvasObject = new fabric.Path(path, {
                  stroke: color,
                  fill: color,
                  strokeWidth: drawWidth
                });
                break;
            case 'ellipse': // 椭圆
                // 按shift时画正圆，只有在鼠标移动时才执行这个，所以按了shift但是没有拖动鼠标将不会画圆
                if (e.e.shiftKey) {
                    mouseTo.x - left > mouseTo.y - top ? mouseTo.y = top + mouseTo.x - left : mouseTo.x = left + mouseTo.y - top
                }
                let radius = Math.sqrt((mouseTo.x - left) * (mouseTo.x - left) + (mouseTo.y - top) * (mouseTo.y - top)) / 2;
                canvasObject = new fabric.Ellipse({
                    left: (mouseTo.x - left) / 2 + left,
                    top: (mouseTo.y - top) / 2 + top,
                    stroke: color,
                    fill: "rgba(255, 255, 255, 0)",
                    originX: "center",
                    originY: "center",
                    rx: Math.abs(left - mouseTo.x) / 2,
                    ry: Math.abs(top - mouseTo.y) / 2,
                    strokeWidth: drawWidth
                });
                break;
            case 'rectangle': // 长方形
                // 按shift时画正方型
                if (e.e.shiftKey) {
                    mouseTo.x - left > mouseTo.y - top ? mouseTo.y = top + mouseTo.x - left : mouseTo.x = left + mouseTo.y - top
                }
                let rpath = "M " + mouseFrom.x + " " + mouseFrom.y + " L " + mouseTo.x + " " + mouseFrom.y + " L " + mouseTo.x + " " + mouseTo.y
                    + " L " + mouseFrom.x + " " + mouseTo.y + " L " + mouseFrom.x + " " + mouseFrom.y + " z";
                canvasObject = new fabric.Path(rpath, {
                    left: left,
                    top: top,
                    stroke: color,
                    strokeWidth: drawWidth,
                    fill: "rgba(255, 255, 255, 0)",
                    hasControls: false
                });
                break;
            case 'text': // 文本框
                textbox.current = new fabric.Textbox('', {
                    left: mouseFrom.x,
                    top: mouseFrom.y - 10,
                    // width: 150,
                    fontSize: 16,
                    borderColor: color,
                    fill: color,
                    hasControls: false
                });
                canvas.add(textbox.current);
                textbox.current.enterEditing();
                textbox.current.hiddenTextarea.focus();
                break;
            default:
                break;
        }
        if (canvasObject) {
            canvas.add(canvasObject);
            drawingObject.current = canvasObject;
        }
    };
    const transformMouse = (mouseX, mouseY) => {
        return { x: mouseX / 1, y: mouseY / 1 };
    };
    const generatePolygon = () => {
        const points = new Array();
        pointArray.map((point, index) => {
            points.push({
                x: point.left,
                y: point.top
            });
            canvas.remove(point);
        });
        lineArray.map((line, index) => {
            canvas.remove(line);
        });
        canvas.remove(activeShape).remove(activeLine);
        const polygon = new fabric.Polygon(points, {
            stroke: color,
            strokeWidth: drawWidth,
            fill: "rgba(255, 255, 255, 0)",
            opacity: 1,
            hasBorders: true,
            hasControls: false
        });
        canvas.add(polygon);
        activeLine = null;
        activeShape = null;
        setPolygonMode(false);
        setDoDrawing(false);
        setDrawType(null);
    };
    const addPoint = e => {
        const random = Math.floor(Math.random() * 10000);
        const id = new Date().getTime() + random;
        const circle = new fabric.Circle({
            radius: 5,
            fill: '#ffffff',
            stroke: "#333333",
            strokeWidth: 0.5,
            left: (e.pointer.x || e.e.layerX) / canvas.getZoom(),
            top: (e.pointer.y || e.e.layerY) / canvas.getZoom(),
            selectable: false,
            hasBorders: false,
            hasControls: false,
            originX: "center",
            originY: "center",
            id: id,
            objectCaching: false
        });
        if (pointArray.length === 0) {
            circle.set({ fill: 'red' });
        }
        const points = [
            (e.pointer.x || e.e.layerX) / canvas.getZoom(),
            (e.pointer.y || e.e.layerY) / canvas.getZoom(),
            (e.pointer.x || e.e.layerX) / canvas.getZoom(),
            (e.pointer.y || e.e.layerY) / canvas.getZoom()
        ];
        line.current = new fabric.Line(points, {
            strokeWidth: 2,
            fill: "#999999",
            stroke: "#999999",
            class: "line",
            originX: "center",
            originY: "center",
            selectable: false,
            hasBorders: false,
            hasControls: false,
            evented: false,
            objectCaching: false
        });
        if (activeShape) {
            const pos = canvas.getPointer(e.e);
            const points = activeShape.get('points');
            points.push({
                x: pos.x,
                y: pos.y
            });
            const polygon = new fabric.Polygon(points, {
                stroke: "#333333",
                strokeWidth: 1,
                fill: "#cccccc",
                opacity: 0.3,
                selectable: false,
                hasBorders: false,
                hasControls: false,
                evented: false,
                objectCaching: false
            });
            canvas.remove(activeShape);
            canvas.add(polygon);
            setActiveShape(polygon);
            canvas.renderAll();
        } else {
            const polyPoint = [
                {
                    x: (e.pointer.x || e.e.layerX) / canvas.getZoom(),
                    y: (e.pointer.y || e.e.layerY) / canvas.getZoom()
                }
            ];
            const polygon = new fabric.Polygon(polyPoint, {
                stroke: "#333333",
                strokeWidth: 1,
                fill: "#cccccc",
                opacity: 0.3,
                selectable: false,
                hasBorders: false,
                hasControls: false,
                evented: false,
                objectCaching: false
            });
            setActiveShape(polygon);
            canvas.add(polygon);
        }
        activeLine = line.current;
        pointArray.push(circle);
        lineArray.push(line);
        canvas.add(line.current);
        canvas.add(circle);
    };
    const drawPolygon = () => {

    };
    const uploadImg = () => {

    };
    const loadExpImg = () => {

    };
    const saveHandle = () => {

    };

    useEffect(() => {
        const options = {
            // skipTargetFind: false, //当为真时，跳过目标检测。目标检测将返回始终未定义。点击选择将无效
            // selectable: false,  //为false时，不能选择对象进行修改
            // selection: false   // 是否可以多个对象为一组
        };
        canvas = new fabric.Canvas(canvasEl.current, options);
        canvas.on('mouse:down', mouseDownHandle);
        canvas.on('mouse:move', mouseMoveHandle);
        canvas.on('mouse:up', mouseUpHandle);
        document.onkeydown = e => {
            // 键盘 delect删除所选元素
            if (e.keyCode == 46) {
                deleteObjHandle();
            }
            // ctrl+z 删除最近添加的元素
            if (e.keyCode == 90 && e.ctrlKey) {
                canvas.remove(
                    canvas.getObjects()[canvas.getObjects().length - 1]
                );
            }
        }
    }, []);
    return (
        <div>
            <Space>
                <Button size="small" onClick={() => drawTypeChange('')}>自由选择</Button>
                <Button size="small" onClick={() => drawTypeChange('arrow')}>画箭头</Button>
                <Button size="small" onClick={() => drawTypeChange('text')}>文本输入框</Button>
                <Button size="small" onClick={() => drawTypeChange('ellipse')}>画圆</Button>
                <Button size="small" onClick={() => drawTypeChange('rectangle')}>画矩形</Button>
                <Button size="small" onClick={() => drawPolygon()}>画多边形</Button>
                <Button size="small" onClick={() => drawTypeChange('pen')}>笔画</Button>
                <Button size="small" onClick={() => uploadImg()}>从文件选择图片上传</Button>
                <Button size="small" onClick={() => loadExpImg()}>加载背景图</Button>
                <Button size="small" onClick={() => saveHandle()}>保存</Button>
            </Space>
            <canvas width="1000" height="500" ref={canvasEl} />
        </div>
    );
}

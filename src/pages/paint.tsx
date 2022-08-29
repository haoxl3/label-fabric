import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Button, Space, Radio, Row, Col, InputNumber, Upload, message } from 'antd';
import type { RadioChangeEvent, UploadProps } from 'antd';
import 'antd/dist/antd.css';
import styles from './style.less';

export default function Paint() {
    const canvasEl = useRef(null);
    const [SFMode, setSFMode] = useState(0);
    const [penWidth, setPenWidth] = useState(3);
    const [penColor, setPenColor] = useState('#f00'); // 画笔颜色
    const [menuPosition, setMenuPosition] = useState({visibility: 'hidden', left: 0, top: 0, zIndex: -100});
    const isHidden = useRef(true); // 显示隐藏所画的图形
    const activeEl = useRef({});
    const canvasBox = useRef({});
    const backgroundColor = '#EBF5FF'; // 画布的背景颜色
    const canvasWidth = 980;
    const cnavasHeight = 530;
    let canvasList = []; // 保存序列化的canvas，每次改变都会记录一次（放大缩小除外）
    const operationMode = useRef('freeDraw'); // 当前操作图形
    let startInBound = true; // 绘制起始点是否在范围内
    let moveInBound = true; // 绘制过程中是否超出范围
    let endInBound = true; // 绘制结束图形是否在范围内
    let isDrawing = false; // 标示是否正在画
    let polPointArray = []; // 存放多边形的点集合
    let polStartCircle; // 以多边形的起始点生成一个范围圆，方便多边形闭合
    // 一次绘制的开始点结束点集合
    let pointCol = {
        startPoint: {},
        endPoint: {},
    };
    let textBox = null; // 文本框
    let widthChanged = false; // width是否改变
    let isMoving = false; // 标志move模式下是否正在移动
    let drawingObj; // 正在画的对象
    const fontSize = 14; // 字体大小
    let goBackTag = -1; // 记录前进回撤
    let polLineArray = []; // 存放多边形临时线段
    let imgList = useState([]);
    let currentImg = useRef(imgList[0]);
    let saveList = []; // 点击save保存的canvas列表，每次点击保存都会记录一次
    let selectedImgIndex = 0; // 被选择的图片序号
    // 这些操作模式下，每次鼠标抬起需要序列化
    const needSerialization = ['freeDraw', 'line', 'rect', 'circle', 'triangle'];
    // 超出范围需要提示的操作模式
    const needAlert = ['freeDraw', 'line', 'rect', 'circle', 'triangle', 'polygon', 'text'];
    const drawList = [
        {
            name: 'freeDraw',
            desc: '自由绘制'
        },
        {
            name: 'line',
            desc: '直线'
        },
        {
            name: 'text',
            desc: '文本'
        },
        {
            name: 'rect',
            desc: '矩形'
        },
        {
            name: 'circle',
            desc: '圆'
        },
        {
            name: 'triangle',
            desc: '三角形'
        },
        {
            name: 'polygon',
            desc: '多边形'
        }
    ];
    const operationList = [
        {
            name: 'select',
            desc: '选择'
        },
        {
            name: 'eraser',
            desc: '删除'
        },
        // {
        //     name: 'move',
        //     desc: '移动'
        // },
        {
            name: 'toSmall',
            desc: '缩小'
        },
        {
            name: 'toLarge',
            desc: '放大'
        },
        {
            name: 'goBack',
            desc: '后撤'
        },
        {
            name: 'goForward',
            desc: '前进'
        },
        {
            name: 'save',
            desc: '保存'
        },
        {
            name: 'toggleShow',
            desc: '显/隐'
        },
        {
            name: 'download',
            desc: '下载图片'
        },
        {
            name: 'toJson',
            desc: '下载json'
        }
    ];
    // 重置文本框
    const initTextbox = () => {
        // if (textBox !== null) {
        //     textBox.editable = false;
        //     textBox.exitEditing();
        //     textBox = null;
        // }
    };
    const toSmall = () => {
        let zoom = canvasBox.current.getZoom() - 0.05;
        changeZoom(zoom);
    };
    const toLarge = () => {
        let zoom = canvasBox.current.getZoom() + 0.05;
        changeZoom(zoom);
    };
    // 回退
    const goBack = () => {
        // 标注模式下，回撤到图片初始状态时提示
        if (-(goBackTag - 1) === canvasList.length) {
            message.warning('已经是第一个记录！');
            return;
        }
        goBackTag--;

        deserializationCanvas(canvasList.slice(goBackTag, goBackTag + 1)[0]);
    };
    // 前进
    const goForward = () => {
        if (goBackTag === -1) {
            message.warning('已经是最后一个记录！');
            return;
        }
        goBackTag++;

        goBackTag === -1 ? deserializationCanvas(canvasList.slice(goBackTag)[0]) : deserializationCanvas(canvasList.slice(goBackTag, goBackTag + 1)[0]);
    };
    const save = () => {
        // 点击保存，保存该文本框，销毁文本框对象
        if (operationMode.current === 'text') {
            initTextbox();
            serializationCanvas();
        }
        saveList.push(goBackTag === -1 ? canvasList.slice(goBackTag)[0] : canvasList.slice(goBackTag, goBackTag + 1)[0]);
        canvasList = [...saveList];
        imgList.forEach((item, index) => {
            if (index === selectedImgIndex) {
                item.list = [...saveList];
            }
        });
        goBackTag = -1;
    };
    const toJson = () => {
        const json = canvasBox.current.toJSON();
        console.log(json);
    };
    const toggleShow = () => {
        isHidden.current = !isHidden.current;
        const objs = canvasBox.current.toJSON();
        objs.objects.map(item => {
            item.visible = isHidden.current;
        });
        canvasBox.current.loadFromJSON(objs, () => {
            canvasBox.current.renderAll();
        });
    };
    // 将base64转为blob
    const dataURLtoBlob = (dataurl) => {
        let arr = dataurl.split(','); // 把base64分成两部门，头（包含源文件类型信息），ASCII 字符串（文件数据）部分
        let mime = arr[0].match(/:(.*?);/)[1]; // 获取文件类型
        let bstr = atob(arr[1]); // 通过base-64编码的字符串数据，获取二进制数据“字符串”
        let n = bstr.length; // 获取字符串长度
        let u8arr = new Uint8Array(n); // 获取二进制编码数组
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n); // 获取制定位置字符串的unicode编码
        }
        return new Blob([u8arr], { type: mime });
    };
    const download = () => {
        let url = canvasBox.current.toDataURL();
        let blob = dataURLtoBlob(url);

        blob.lastModifiedDate = new Date();
        blob.name = 'canvas.png';
        let eElem = document.createElement('a');
        eElem.download = 'canvas.png';
        eElem.style.display = 'none';
        eElem.href = URL.createObjectURL(blob);
        document.body.appendChild(eElem);
        eElem.click();
        document.body.removeChild(eElem);
    };
    const operation = (ctl) => {
        widthChanged = false;
        // 在改变操作模式前判断操作模式如果为text，序列化文本框
        if (ctl.name === 'text') serializationCanvas();
        // select模式可以让所有对象可选,这里的operationMode在代表上一次操作模式
        if (ctl.name === 'select' || operationMode.current === 'select') {
            let allObj = canvasBox.current.getObjects();
            if (ctl.name === 'select') {
                allObj.forEach((item) => {
                    item.selectable = true;
                });
            } else {
                allObj.forEach((item) => {
                    item.selectable = false;
                });
            }
        }
        // 改变操作模式
        if (!['toSmall', 'toLarge', 'goBack', 'goForward', 'save', 'download'].includes(ctl.name)) operationMode.current = ctl.name;
        if (operationMode.current === 'freeDraw') {
            canvasBox.current.isDrawingMode = true;
            canvasBox.current.freeDrawingBrush.color = penColor;
            canvasBox.current.freeDrawingBrush.width = penWidth;
        } else {
            canvasBox.current.isDrawingMode = false;
        }

        initTextbox();

        switch (ctl.name) {
            case 'toSmall':
                toSmall();
                break;
            case 'toLarge':
                toLarge();
                break;
            case 'goBack':
                goBack();
                break;
            case 'goForward':
                goForward();
                break;
            case 'save':
                save();
                break;
            case 'toggleShow':
                toggleShow();
                break;
            case 'download':
                download();
                break;
            case 'toJson':
                toJson();
                break;
            default:
        }
    };
    const SFModeHandle = (e: RadioChangeEvent) => {
        setSFMode(e.target.value);
    };
    const lineWidthHandle = (value: number) => {
        setPenWidth(value);
    };
    const fileSelect = () => {

    };
    const delTextHandle = () => {
        hiddenMenu();
    };
    const addTextHandle = (txt: String) => {
        const text = new fabric.Text(txt, {
            top: activeEl.current.top + activeEl.current.height / 2,
            left: activeEl.current.left + activeEl.current.width / 2,
            fontSize: 14,
            originX: "center",
            originY: "center"
        });
        // 建组
        const group = new fabric.Group([activeEl.current, text], {
            // top: activeEl.current.top,
            // left: activeEl.current.left,
            // selection: false
        });
        canvasBox.current.remove(activeEl.current);
        hiddenMenu();
        addObj(canvasBox.current, group);
    };
    const hiddenMenu = () => {
        setMenuPosition({visibility: 'hidden', left: 0, top: 0, zIndex: -100});
        activeEl.current = null;
    };
    const uploadProps: UploadProps = {
        name: 'file',
        onChange(info) {
            if (info.file.status !== 'uploading') {
                console.log(info.file, info.fileList);
            }
            if (info.file.status === 'done') {
                // message.success(`${info.file.name} file uploaded successfully`);
            } else if (info.file.status === 'error') {
                // message.error(`${info.file.name} file upload failed.`);
            }
        },
    };
    // 连续绘制过程canvas添加对象
    const addObj = (canvas, obj) => {
        // 画直线是每次移动画一条线，如果正在画直线，删除上一次画的对象，只保留当前直线
        if (drawingObj) {
            canvasBox.current.remove(drawingObj);
        }
        drawingObj = obj;
        canvas.add(obj);
    };
    // 获取图片
    const getImg = () => {
        let objList = canvasBox.current.getObjects();
        return objList.filter((item) => Object.getPrototypeOf(item).type === 'image')[0];
    };
    // 改变canvas尺寸
    const changeZoom = (zoom) => {
        let zom = zoom;
        if (zom > 10) {
            zom = 10;
        } else if (zom < 0.01) {
            zom = 0.01;
        }
        let scaleCenterPoint = new fabric.Point(canvasWidth / 2, cnavasHeight / 2);
        canvasBox.current.zoomToPoint(scaleCenterPoint, zom);
    };
    // 获取边界
    const getBound = () => {
        if (currentImg.current.length) {
            let img = getImg();
            let imgLeft = img.getBoundingRect().left;
            let imgTop = img.getBoundingRect().top;
            let imgRight = imgLeft + img.getBoundingRect().width;
            let imgBottom = imgTop + img.getBoundingRect().height;
            return {
                left: imgLeft, top: imgTop, right: imgRight, bottom: imgBottom,
            };
        }
        return { // 图片不存在则以canvas为边界
            left: 0, top: 0, right: canvasBox.current.width, bottom: canvasBox.current.height,
        };
    };
    const drawPolygon = () => {
        const polygon = new fabric.Polygon([...polPointArray], {
            fill: SFMode ? penColor : 'rgba(0, 0, 0, 0)',
            stroke: penColor,
            strokeWidth: penWidth,
            selectable: false,
        });
        canvasBox.current.add(polygon);
    };
    // 置空pointCol
    const pointColSetNull = () => {
        pointCol.startPoint = {};
        pointCol.endPoint = {};
    };
    const drawTriangle = () => {
        let XPositive = pointCol.endPoint.x - pointCol.startPoint.x > 0; // 判定鼠标移动方向
        let YPositive = pointCol.endPoint.y - pointCol.startPoint.y > 0; // 判定鼠标移动方向
        const triangle = new fabric.Triangle({
            left: XPositive ? pointCol.startPoint.x : pointCol.endPoint.x,
            top: YPositive ? pointCol.startPoint.y : pointCol.endPoint.y,
            fill: SFMode ? penColor : 'rgba(0, 0, 0, 0)',
            stroke: penColor,
            strokeWidth: penWidth,
            height: Math.abs(pointCol.endPoint.y - pointCol.startPoint.y),
            width: (Math.sqrt(3) * 2 * Math.abs(pointCol.endPoint.y - pointCol.startPoint.y)) / 3,
            selectable: false,
        });
        addObj(canvasBox.current, triangle);
    };
    const drawCircle = () => {
        let XPositive = pointCol.endPoint.x - pointCol.startPoint.x > 0; // 判定鼠标移动方向
        let YPositive = pointCol.endPoint.y - pointCol.startPoint.y > 0; // 判定鼠标移动方向
        const circle = new fabric.Circle({
            left: XPositive ? pointCol.startPoint.x : pointCol.endPoint.x,
            top: YPositive ? pointCol.startPoint.y : pointCol.endPoint.y,
            fill: SFMode ? penColor : 'rgba(0, 0, 0, 0)',
            stroke: penColor,
            strokeWidth: penWidth,
            radius: Math.abs(pointCol.endPoint.x - pointCol.startPoint.x) / 2,
            selectable: false,
        });
        addObj(canvasBox.current, circle);
    };
    const drawRect = () => {
        let XPositive = pointCol.endPoint.x - pointCol.startPoint.x > 0; // 判定鼠标移动方向
        let YPositive = pointCol.endPoint.y - pointCol.startPoint.y > 0; // 判定鼠标移动方向
        const rect = new fabric.Rect({
            left: XPositive ? pointCol.startPoint.x : pointCol.endPoint.x,
            top: YPositive ? pointCol.startPoint.y : pointCol.endPoint.y,
            width: Math.abs(pointCol.endPoint.x - pointCol.startPoint.x),
            height: Math.abs(pointCol.endPoint.y - pointCol.startPoint.y),
            fill: SFMode ? penColor : 'rgba(0, 0, 0, 0.3)',
            stroke: penColor,
            strokeWidth: penWidth,
            selectable: false,
        });
        addObj(canvasBox.current, rect);
    };
    const drawLine = () => {
        const line = new fabric.Line([pointCol.startPoint.x, pointCol.startPoint.y, pointCol.endPoint.x, pointCol.endPoint.y], {
            stroke: penColor,
            strokeWidth: penWidth,
            selectable: false,
        });
        if (operationMode.current === 'polygon') {
            polLineArray.push(line); // 保存多边形的临时线段
        }
        addObj(canvasBox.current, line);
    };
    const drawText = () => {
        textBox = new fabric.Textbox('', {
            left: pointCol.startPoint.x,
            top: pointCol.startPoint.y,
            fontSize,
            stroke: penColor,
            strokeWidth: penWidth,
            selectable: false,
        });
        canvasBox.current.add(textBox);
        textBox.enterEditing();
    };
    // 判断某点是否在范围内point:{x,y}  相对于canvas的点
    const pointIsInnerBound = (point) => {
        let bound = getBound();
        if (
            point.x < bound.left
            || point.x > bound.right
            || point.y < bound.top
            || point.y > bound.bottom
        ) {
            return false;
        }
        return true;
    };
    const canvasAddEvent = () => {
        canvasBox.current.on('mouse:down', (option) => {
            // 判断绘制是否超出范围
            startInBound = pointIsInnerBound(option.pointer);
            if (!isDrawing) {
                if (operationMode.current === 'polygon') {
                    polPointArray.push(option.absolutePointer); // 保存多边形的初始点
                    // 以起始点生成一个圆路径，当终点在该路径内时，就当作多边形闭合
                    polStartCircle = new fabric.Circle({
                    left: option.absolutePointer.x - 5,
                    top: option.absolutePointer.y - 5,
                    fill: penColor,
                    stroke: '#fff',
                    strokeWidth: 2,
                    radius: 5,
                    selectable: false,
                    });
                    canvasBox.current.add(polStartCircle); 
                }
            }
            isDrawing = true;
            pointCol.startPoint = option.absolutePointer;

            if (operationMode.current === 'text') drawText();

            if (operationMode.current === 'eraser') {
                let objList = canvasBox.current.getObjects();
                objList.forEach((item) => {
                    if (Object.getPrototypeOf(item).type !== 'image' && option.target === item) {
                        canvasBox.current.remove(item);
                        serializationCanvas();
                    }
                });
            }

            // if (operationMode.current === 'move') {
            //     isMoving = true;
            //     pointCol.startPoint = option.pointer;
            // }
        });

        canvasBox.current.on('mouse:move', (option) => {
            // 移动图片
            // if (operationMode.current === 'move' && isMoving) { // 移动图片
            //     let point = {
            //       x: (option.pointer.x - pointCol.startPoint.x) / 5,
            //       y: (option.pointer.y - pointCol.startPoint.y) / 5,
            //     };
            //     canvasBox.current.relativePan(point);
            //     pointCol.startPoint = option.pointer;
            // }
            if (!isDrawing) return;
            // 画笔绘制过程中判断是否超出图片范围
            if (['line', 'freeDraw'].includes(operationMode.current) && moveInBound) {
                if (pointIsInnerBound(option.pointer)) {
                    moveInBound = true;
                } else {
                    moveInBound = false;
                }
            }
            pointCol.endPoint = option.absolutePointer;
            switch (operationMode.current) {
                case 'line':
                    drawLine();
                    break;
                case 'rect':
                    drawRect();
                    break;
                case 'circle':
                    drawCircle();
                    break;
                case 'triangle':
                    drawTriangle();
                    break;
                case 'polygon':
                    // drawPolygon();
                    // 以线段构成多边形，每次点击生成一个拐点
                    drawLine();
                    break;
                default:
            }
        });

        canvasBox.current.on('mouse:up', (option) => {
            isDrawing = false;
            pointCol.endPoint = option.absolutePointer;
            drawingObj = null;
            pointColSetNull();

            // 自由绘画模式中，每次落笔绘画对象不可选中
            if (operationMode.current === 'freeDraw') {
                canvasBox.current.getObjects()[canvasBox.current.getObjects().length - 1].selectable = false;
            }
            if (needSerialization.includes(operationMode.current)) serializationCanvas();

            if (operationMode.current === 'polygon') {
                polPointArray.push(option.absolutePointer);
                pointCol.startPoint = option.absolutePointer;
                isDrawing = true;
                const bounding = polStartCircle.getBoundingRect();
                if (polPointArray.slice(-1)[0].x >= bounding.left && polPointArray.slice(-1)[0].x <= bounding.left + bounding.width && polPointArray.slice(-1)[0].y >= bounding.top && polPointArray.slice(-1)[0].y <= bounding.top + bounding.height) {
                    if (polLineArray.length <= 1) { // 如果第一个鼠标落下点在原点，则不进行绘制
                        isDrawing = false;
                        canvasBox.current.remove(polStartCircle);
                        polStartCircle = null;
                        drawingObj = null;
                        polPointArray = [];
                        polLineArray = [];
                        return;
                    }
                    polPointArray.splice(-1, 1);
                    [pointCol.endPoint] = polPointArray;
                    [pointCol.startPoint] = polPointArray.slice(-1);
                    isDrawing = false;
                    canvasBox.current.remove(polStartCircle);
                    polStartCircle = null;
                    if (SFMode) {
                        polLineArray.forEach((item) => {
                            canvasBox.current.remove(item);
                        });
                        drawPolygon();
                    } else {
                        canvasBox.current.remove(polLineArray.slice(-1)[0]);
                        drawLine();
                    }
                    drawingObj = null;
                    polPointArray = [];
                    polLineArray = [];

                    serializationCanvas();
                }
            }

            // if (operationMode.current === 'move') {
            //     isMoving = false;
            //     pointCol.startPoint = {};
            // }

            //标注模式下检查是否超出范围-start
            if (['rect', 'circle', 'triangle', 'polygon'].includes(operationMode.current)) { // 结束后需要检查的类型
                let obj = canvasBox.current.getObjects()[canvasBox.current.getObjects().length - 1];
                let { aCoords } = obj;
                let bound = getBound();
                endInBound = aCoords.tl.y >= bound.top && aCoords.br.y <= bound.bottom && aCoords.tl.x >= bound.left && aCoords.br.x <= bound.right;
            }
            if (!moveInBound || !startInBound || !endInBound) {
                // 绘制的标注超出图形范围
                if (needAlert.includes(operationMode.current)) {
                    message.error('请勿超出标注范围！');
                    // 删除刚刚绘制的不合格标注
                    canvasBox.current.remove(canvasBox.current.getObjects()[canvasBox.current.getObjects().length - 1]);
                    if (polStartCircle) canvasBox.current.remove(polStartCircle);
                    isDrawing = false;
                    polStartCircle = null;
                    drawingObj = null;
                    polPointArray = [];
                    polLineArray = [];
                    moveInBound = true;
                    startInBound = true;
                    endInBound = true;
                }
            }
            //标注模式下检查是否超出范围-end

            // 获取当前元素
            if (option.target) {
                activeEl.current = option.target;
                // 显示菜单，设置右键菜单位置，获取菜单组件的宽高
                const menu = document.getElementById('menu');
                const menuWidth = menu.offsetWidth;
                const menuHeight = menu.offsetHeight;
                // 当前鼠标位置
                let pointX = option.target.left + option.target.width;//option.pointer.x;
                let pointY = option.target.top + option.target.height;//option.pointer.y;
                // 计算菜单出现的位置，如果鼠标靠近画布右侧，菜单就出现在鼠标指针左侧
                if (canvasBox.current.width - pointX <= menuWidth) {
                    pointX -= menuWidth;
                }
                // 如果鼠标靠近画布底部，菜单就出现在鼠标指针上方
                if (canvasBox.current.height - pointY <= menuHeight) {
                    pointY -= menuHeight;
                }
                setMenuPosition({visibility: 'visible', left: `${pointX}px`, top: `${pointY}px`, zIndex: 100});
            } else {
                hiddenMenu();
            }
        });

        canvasBox.current.on('mouse:wheel', (option) => {
            option.e.preventDefault();
            let delta = option.e.deltaY > 0 ? -0.01 : 0.01;
            let zoom = canvasBox.current.getZoom() + delta;
            changeZoom(zoom);
        });
    };
    // 序列化canvas
    const serializationCanvas = () => {
        canvasList.push(JSON.stringify(canvasBox.current.toJSON()));
    };
    // 反序列化canvas
    const deserializationCanvas = (json) => {
        canvasBox.current.loadFromJSON(
            JSON.parse(json),
            canvasBox.current.renderAll.bind(canvasBox.current),
            (o, object) => {
                object.selectable = false;
                // 如果是图片
                if (Object.getPrototypeOf(object).type === 'image') {
                    object.scaleToWidth(750).set({ left: 0, top: 0 });
                }
            },
        );
    }
    // 初始化canvas
    const initCanvas = () => {
        canvasBox.current = new fabric.Canvas('canvas', {
            backgroundColor,
            width: canvasWidth,
            height: cnavasHeight,
            selection: false,
            // fireRightClick: true, // 启用右键，button的数字为3
            // stopContextMenu: true, // 禁止默认右键菜单
        });
        let json = {
            "version": "5.2.1",
            "objects": [
                {
                    "type": "rect",
                    "version": "5.2.1",
                    "originX": "left",
                    "originY": "top",
                    "left": 347,
                    "top": 209,
                    "width": 83,
                    "height": 89,
                    "fill": "rgba(0, 0, 0, 0.3)",
                    "stroke": "#f00",
                    "strokeWidth": 3,
                    "strokeDashArray": null,
                    "strokeLineCap": "butt",
                    "strokeDashOffset": 0,
                    "strokeLineJoin": "miter",
                    "strokeUniform": false,
                    "strokeMiterLimit": 4,
                    "scaleX": 1,
                    "scaleY": 1,
                    "angle": 0,
                    "flipX": false,
                    "flipY": false,
                    "opacity": 1,
                    "shadow": null,
                    "visible": true,
                    "backgroundColor": "",
                    "fillRule": "nonzero",
                    "paintFirst": "fill",
                    "globalCompositeOperation": "source-over",
                    "skewX": 0,
                    "skewY": 0,
                    "rx": 0,
                    "ry": 0
                }
            ],
            "background": "#EBF5FF"
        };
        // 预渲染之前标注好的图形
        canvasBox.current.loadFromJSON(json, () => {
            canvasBox.current.renderAll();
        });
    };
    useEffect(() => {
        initCanvas();
        serializationCanvas();
        canvasAddEvent();
        // operationMode.current = 'freeDraw';
        canvasBox.current.isDrawingMode = true;
    }, []);
    return (
        <div>
            <div>
                <Upload {...uploadProps}>
                    <Button size="small" type="primary" onClick={fileSelect}>上传图片</Button>
                </Upload>
                <Space>
                    {operationList.map(item => <Button size="small" onClick={() => operation(item)} key={item.name}>{item.desc}</Button>)}
                </Space>
            </div>
            <canvas ref={canvasEl} id="canvas"/>
            <div>
                <Row>
                    <Col span={4}>
                        <Radio.Group onChange={SFModeHandle} value={SFMode}>
                            <Radio value={0}>边框模式</Radio>
                            <Radio value={1}>填充模式</Radio>
                        </Radio.Group>
                    </Col>
                    <Col span={20}>
                        <Space>
                            {drawList.map(item => <Button size="small" onClick={() => operation(item)} key={item.name}>{item.desc}</Button>)}
                        </Space>
                        <InputNumber min={1} max={10} defaultValue={penWidth} onChange={lineWidthHandle} />
                    </Col>
                </Row>
            </div>
            <div id="menu" style={menuPosition} className={styles.menuBox}>
                <div className={styles.textTitle}>
                    <span>修改标签</span>
                    <span className={styles.closeMenu} onClick={hiddenMenu}>X</span>
                </div>
                <div onClick={() => addTextHandle('视盘')} className={styles.menuList}>视盘</div>
                <div onClick={() => addTextHandle('黄斑')} className={styles.menuList}>黄斑</div>
                <div onClick={() => addTextHandle('视杯')} className={styles.menuList}>视杯</div>
            </div>
        </div>
    );
}
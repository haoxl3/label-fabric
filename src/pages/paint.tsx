import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Button, Space, Radio, Row, Col, InputNumber, Upload, message } from 'antd';
import type { RadioChangeEvent, UploadProps } from 'antd';
import 'antd/dist/antd.css';

export default function Paint() {
    const canvasEl = useRef(null);
    const [SFMode, setSFMode] = useState(0);
    const [penWidth, setPenWidth] = useState(3);
    const [penColor, setPenColor] = useState('#f00'); // 画笔颜色
    let canvasBox;
    const backgroundColor = '#EBF5FF'; // 画布的背景颜色
    const canvasWidth = 980;
    const cnavasHeight = 530;
    let canvasList = []; // 保存序列化的canvas，每次改变都会记录一次（放大缩小除外）
    let operationMode; // 当前操作图形
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
    let isMoving = false; // 标志move模式下是否正在移动
    let drawingObj; // 正在画的对象
    let polLineArray = []; // 存放多边形临时线段
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
            desc: '擦除'
        },
        {
            name: 'move',
            desc: '移动'
        },
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
            name: 'download',
            desc: '下载'
        }
    ];
    const operation = () => {

    };
    const SFModeHandle = (e: RadioChangeEvent) => {
        setSFMode(e.target.value);
    };
    const lineWidthHandle = (value: number) => {
        setPenWidth(value);
    };
    const fileSelect = () => {

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
    // 改变canvas尺寸
    const changeZoom = (zoom) => {
        let zom = zoom;
        if (zom > 10) {
            zom = 10;
        } else if (zom < 0.01) {
            zom = 0.01;
        }
        let scaleCenterPoint = new fabric.Point(canvasWidth / 2, cnavasHeight / 2);
        canvasBox.zoomToPoint(scaleCenterPoint, zom);
    };
    const getBound = () => {

    };
    const drawPolygon = () => {

    };
    const pointColSetNull = () => {

    };
    const drawTriangle = () => {

    };
    const drawCircle = () => {

    };
    const drawRect = () => {

    };
    const drawLine = () => {

    };
    const drawText = () => {

    };
    const pointIsInnerBound = () => {

    };
    const canvasAddEvent = () => {
        canvasBox.on('mouse:down', (option) => {
            // 判断绘制是否超出范围
            startInBound = pointIsInnerBound(option.pointer);
            if (!isDrawing) {
                if (operationMode === 'polygon') {
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
                    canvasBox.add(polStartCircle); 
                }
            }
            isDrawing = true;
            pointCol.startPoint = option.absolutePointer;

            if (operationMode === 'text') drawText();

            if (operationMode === 'eraser') {
                let objList = canvasBox.getObjects();
                objList.forEach((item) => {
                    if (Object.getPrototypeOf(item).type !== 'image' && option.target === item) {
                        canvasBox.remove(item);
                        serializationCanvas();
                    }
                });
            }

            if (operationMode === 'move') {
                isMoving = true;
                pointCol.startPoint = option.pointer;
            }
        });

        canvasBox.on('mouse:move', (option) => {
            // 移动图片
            if (operationMode === 'move' && isMoving) { // 移动图片
                let point = {
                  x: (option.pointer.x - pointCol.startPoint.x) / 5,
                  y: (option.pointer.y - pointCol.startPoint.y) / 5,
                };
                canvasBox.relativePan(point);
                pointCol.startPoint = option.pointer;
            }
            if (!isDrawing) return;
            // 画笔绘制过程中判断是否超出图片范围
            if (['line', 'freeDraw'].includes(operationMode) && moveInBound) {
                if (pointIsInnerBound(option.pointer)) {
                    moveInBound = true;
                } else {
                    moveInBound = false;
                }
            }
            pointCol.endPoint = option.absolutePointer;
            switch (operationMode) {
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

        canvasBox.on('mouse:up', (option) => {
            isDrawing = false;
            pointCol.endPoint = option.absolutePointer;
            drawingObj = null;
            pointColSetNull();

            // 自由绘画模式中，每次落笔绘画对象不可选中
            if (operationMode === 'freeDraw') {
                canvasBox.getObjects()[canvasBox.getObjects().length - 1].selectable = false;
            }
            if (needSerialization.includes(operationMode)) serializationCanvas();

            if (operationMode === 'polygon') {
                polPointArray.push(option.absolutePointer);
                pointCol.startPoint = option.absolutePointer;
                isDrawing = true;
                const bounding = polStartCircle.getBoundingRect();
                if (polPointArray.slice(-1)[0].x >= bounding.left && polPointArray.slice(-1)[0].x <= bounding.left + bounding.width && polPointArray.slice(-1)[0].y >= bounding.top && polPointArray.slice(-1)[0].y <= bounding.top + bounding.height) {
                    if (polLineArray.length <= 1) { // 如果第一个鼠标落下点在原点，则不进行绘制
                        isDrawing = false;
                        canvasBox.remove(polStartCircle);
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
                    canvasBox.remove(polStartCircle);
                    polStartCircle = null;
                    if (SFMode) {
                        polLineArray.forEach((item) => {
                            canvasBox.remove(item);
                        });
                        drawPolygon();
                    } else {
                        canvasBox.remove(polLineArray.slice(-1)[0]);
                        drawLine();
                    }
                    drawingObj = null;
                    polPointArray = [];
                    polLineArray = [];

                    serializationCanvas();
                }
            }

            if (operationMode === 'move') {
                isMoving = false;
                pointCol.startPoint = {};
            }

            //标注模式下检查是否超出范围-start
            if (['rect', 'circle', 'triangle', 'polygon'].includes(operationMode)) { // 结束后需要检查的类型
                let obj = canvasBox.getObjects()[canvasBox.getObjects().length - 1];
                let { aCoords } = obj;
                let bound = getBound();
                endInBound = aCoords.tl.y >= bound.top && aCoords.br.y <= bound.bottom && aCoords.tl.x >= bound.left && aCoords.br.x <= bound.right;
            }
            if (!moveInBound || !startInBound || !endInBound) {
                // 绘制的标注超出图形范围
                if (needAlert.includes(operationMode)) {
                    message.error('请勿超出标注范围！');
                    // 删除刚刚绘制的不合格标注
                    canvasBox.remove(canvasBox.getObjects()[canvasBox.getObjects().length - 1]);
                    if (polStartCircle) canvasBox.remove(polStartCircle);
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
        });

        canvasBox.on('mouse:wheel', (option) => {
            option.e.preventDefault();
            let delta = option.e.deltaY > 0 ? -0.01 : 0.01;
            let zoom = canvasBox.getZoom() + delta;
            changeZoom(zoom);
        });
    };
    // 序列化canvas
    const serializationCanvas = () => {
        canvasList.push(JSON.stringify(canvasBox.toJSON()));
    };
    // 初始化canvas
    const initCanvas = () => {
        canvasBox = new fabric.Canvas('canvas', {
            backgroundColor,
            width: canvasWidth,
            height: cnavasHeight,
            selection: false,
        });
    };
    useEffect(() => {
        initCanvas();
        serializationCanvas();
        canvasAddEvent();
        operationMode = 'freeDraw';
        canvasBox.isDrawingMode = true;
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
        </div>
    );
}
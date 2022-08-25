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
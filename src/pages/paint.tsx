import { useEffect, useRef, useState } from 'react';
import { fabric } from 'fabric';
import { Button, Space, Radio, Row, Col, InputNumber, Upload } from 'antd';
import type { RadioChangeEvent, UploadProps } from 'antd';
import 'antd/dist/antd.css';

export default function Paint() {
    const canvasEl = useRef(null);
    const [SFMode, setSFMode] = useState(0);
    const [penWidth, setPenWidth] = useState(3);
    let canvasBox;
    const backgroundColor = '#EBF5FF'; // 画布的背景颜色
    const canvasWidth = 980;
    const cnavasHeight = 530;
    let canvasList = []; // 保存序列化的canvas，每次改变都会记录一次（放大缩小除外）
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
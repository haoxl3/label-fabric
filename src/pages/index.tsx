import {useEffect, useRef, useState} from 'react';
import {fabric} from 'fabric';
import {Button, Space} from 'antd';
import 'antd/dist/antd.css';

export default function Home() {
  const canvasEl = useRef(null);
  const [drawType, setDrawType] = useState(null);  //当前绘制图像的种类
  let canvas = {};
  // 鼠标按下时触发
  const mouseDownHandle = () => {

  };
  // 鼠标移动过程中已经完成了绘制
  const mouseMoveHandle = () => {

  };
  // 鼠标松开执行
  const mouseUpHandle = () => {

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
      <canvas width="1000" height="500" ref={canvasEl}/>
    </div>
  );
}

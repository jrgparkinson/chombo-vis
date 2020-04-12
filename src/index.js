import 'vtk.js/Sources/favicon';

import { mat4, vec3 } from 'gl-matrix';

import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkFullScreenRenderWindow from 'vtk.js/Sources/Rendering/Misc/FullScreenRenderWindow';
import vtkHttpDataSetReader from 'vtk.js/Sources/IO/Core/HttpDataSetReader';
import vtkOutlineFilter from 'vtk.js/Sources/Filters/General/OutlineFilter';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';

import vtkCubeSource from 'vtk.js/Sources/Filters/Sources/CubeSource';
import vtkImageMarchingCubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import {
  ColorMode,
  ScalarMode,
} from 'vtk.js/Sources/Rendering/Core/Mapper/Constants';
import controlPanel from './controller.html';
import vtkColorMaps from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction/ColorMaps';
import vtkColorTransferFunction from 'vtk.js/Sources/Rendering/Core/ColorTransferFunction';

import vtkAxesActor from 'vtk.js/Sources/Rendering/Core/AxesActor';
import vtkOrientationMarkerWidget from 'vtk.js/Sources/Interaction/Widgets/OrientationMarkerWidget';

import vtkInteractiveOrientationWidget from 'vtk.js/Sources/Widgets/Widgets3D/InteractiveOrientationWidget';
import vtkWidgetManager from 'vtk.js/Sources/Widgets/Core/WidgetManager';

import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkPixelSpaceCallbackMapper from 'vtk.js/Sources/Rendering/Core/PixelSpaceCallbackMapper';

// import style from '../src/style.module.css';

var style = {
  "container": {
    "position": "absolute",
    "top": 0,
    "right": 0,
    "bottom": 0,
    "left": 0
  }
};
// Set up for text
const bodyElement = document.querySelector('body');
const container = document.createElement('div');
// container.classList.add(style.container);
container.style = style.container;
container.style.bottom = 0;
container.style.top = 0;
container.style.left = 0;
container.style.right = 0;
container.style.height = "100vh";
container.style.position = "absolute";
bodyElement.appendChild(container);
let textCtx = null;
let windowWidth = 0;
let windowHeight = 0;
const enableDebugCanvas = false;
let debugHandler = null;



function majorAxis(vec3, idxA, idxB) {
  const axis = [0, 0, 0];
  const idx = Math.abs(vec3[idxA]) > Math.abs(vec3[idxB]) ? idxA : idxB;
  const value = vec3[idx] > 0 ? 1 : -1;
  axis[idx] = value;
  return axis;
}

// const fullScreenRenderWindow = vtkFullScreenRenderWindow.newInstance({
//   background: [1, 1, 1],
// });
// // const renderWindow = fullScreenRenderWindow.getRenderWindow();
// // const renderer = fullScreenRenderWindow.getRenderer();

// fullScreenRenderWindow.addController(controlPanel);

const renderWindow = vtkRenderWindow.newInstance();
const renderer = vtkRenderer.newInstance({ background: [1, 1, 1] });
renderWindow.addRenderer(renderer);
// renderWindow.addController(controlPanel);

function applyStyle(el, style) {
  Object.keys(style).forEach((key) => {
    el.style[key] = style[key];
  });
}

const controlContainer = document.createElement('div');
controlContainer.innerHTML = controlPanel;
bodyElement.appendChild(controlContainer);

const STYLE_CONTROL_PANEL = {
  position: 'absolute',
  left: '25px',
  top: '25px',
  backgroundColor: 'white',
  borderRadius: '5px',
  listStyle: 'none',
  padding: '5px 10px',
  margin: '0',
  display: 'block',
  border: 'solid 1px black',
  maxWidth: 'calc(100vw - 70px)',
  maxHeight: 'calc(100vh - 60px)',
  overflow: 'auto',
  zIndex: 2000,
};

const RENDER_STYLE = {
  touchAction: 'none'
}

applyStyle(controlContainer, STYLE_CONTROL_PANEL);
applyStyle(container, RENDER_STYLE);



const actor = vtkActor.newInstance();
const mapper = vtkMapper.newInstance();
const marchingCube = vtkImageMarchingCubes.newInstance({
  contourValue: 0.0,
  computeNormals: true,
  mergePoints: true,
});

// Cube
function createCubePipeline() {
  const cubeSource = vtkCubeSource.newInstance();
  const actor = vtkActor.newInstance();
  const mapper = vtkMapper.newInstance();

  actor.setMapper(mapper);
  mapper.setInputConnection(cubeSource.getOutputPort());

  renderer.addActor(actor);
  return { cubeSource, mapper, actor };
}

// var data_dir = 'data/plt000608-temperature-porosity/';
var data_dir = 'data/3d-amr/';

var filename = document.querySelector("#filename")
if (filename) { filename.innerHTML = data_dir; }

// Need one of these for each box on each level
const pipelines = [];
const boxes = require(`../dist/` + data_dir + 'boxes.json');

boxes.forEach((box) => {
  var pipeline = createCubePipeline();
  pipeline.actor.getProperty().setRepresentation(1);
  pipeline.actor.getProperty().setColor(box["colour"]);
  ['xLength', 'yLength', 'zLength', 'center'].forEach((propertyName) => {
    pipeline.cubeSource.set({ [propertyName]: box[propertyName] });
  });

  pipelines.push(pipeline);
});

const domainBox = boxes[0];


// Set contour color
actor.getProperty().setColor([1, 0.5, 0.5]);

actor.setMapper(mapper);
mapper.setScalarModeToUsePointFieldData();
mapper.setInputConnection(marchingCube.getOutputPort());


function changeContourValInput(e) {
  const newVal = Number(e.target.value);
  setContourValue(newVal);
  const el = document.querySelector('.contourValue');
  if (el) {
    el.setAttribute('value', newVal);
    el.value = newVal;
  }
}
function setContourValue(val) {
  console.log("Set contour value: " + val);
  marchingCube.setContourValue(val);
  var contourVal = document.querySelector('#contourVal');
  if (contourVal) { contourVal.value = val; }
  // document.querySelector('.contourValue').setAttribute('value', val);
  renderWindow.render();
}
function updateIsoValue(e) {
  const isoValue = Number(e.target.value).toFixed(2);
  setContourValue(isoValue);
}

function addRepresentation(name, filter, props = {}) {
  const mapper = vtkMapper.newInstance();
  mapper.setInputConnection(filter.getOutputPort());

  const actor = vtkActor.newInstance();
  actor.setMapper(mapper);
  actor.getProperty().set(props);
  renderer.addActor(actor);

  global[`${name}Actor`] = actor;
  global[`${name}Mapper`] = mapper;
}



//////////////////////////////////////////////////////////////////////////////
// Axes widget
//////////////////////////////////////////////////////////////////////////////
// const axes = vtkAxesActor.newInstance();
// const orientationWidget = vtkOrientationMarkerWidget.newInstance({
//   actor: axes,
//   interactor: renderWindow.getInteractor(),
// });
// orientationWidget.setEnabled(true);
// orientationWidget.setViewportCorner(
//   vtkOrientationMarkerWidget.Corners.BOTTOM_LEFT
// );
// orientationWidget.setViewportSize(0.15);
// orientationWidget.setMinPixelSize(100);
// orientationWidget.setMaxPixelSize(300);

// const widgetManager = vtkWidgetManager.newInstance();
// widgetManager.setRenderer(orientationWidget.getRenderer());

// const widget = vtkInteractiveOrientationWidget.newInstance();
// widget.placeWidget(axes.getBounds());
// widget.setBounds(axes.getBounds());
// widget.setPlaceFactor(1);

// const vw = widgetManager.addWidget(widget);

// // Manage user interaction
// vw.onOrientationChange(({ up, direction, action, event }) => {
//   const focalPoint = camera.getFocalPoint();
//   const position = camera.getPosition();
//   const viewUp = camera.getViewUp();

//   const distance = Math.sqrt(
//     vtkMath.distance2BetweenPoints(position, focalPoint)
//   );
//   camera.setPosition(
//     focalPoint[0] + direction[0] * distance,
//     focalPoint[1] + direction[1] * distance,
//     focalPoint[2] + direction[2] * distance
//   );

//   if (direction[0]) {
//     camera.setViewUp(majorAxis(viewUp, 1, 2));
//   }
//   if (direction[1]) {
//     camera.setViewUp(majorAxis(viewUp, 0, 2));
//   }
//   if (direction[2]) {
//     camera.setViewUp(majorAxis(viewUp, 0, 1));
//   }

//   orientationWidget.updateMarkerOrientation();
//   widgetManager.enablePicking();
//   render();
// });

// widgetManager.enablePicking();

/////////////////////////////////////////////////////////////////////////
// Fields
///////////////////////////////////////////////////////////////////////
const fieldsReader = vtkHttpDataSetReader.newInstance({ enableArray: true, fetchGzip: true });

marchingCube.setInputConnection(fieldsReader.getOutputPort());

let scalarMode = ScalarMode.USE_POINT_FIELD_DATA;

const contourValInput = document.querySelector('#contourVal');
if (contourValInput) { contourValInput.addEventListener('change', changeContourValInput); }

function setController() {
  const dataRange = fieldsReader
    .getOutputData()
    .getPointData()
    .getScalars()
    .getRange();
  
  var firstIsoValue = (dataRange[0] + dataRange[1]) / 2;
  firstIsoValue = firstIsoValue.toFixed(2);
  
  const el = document.querySelector('.contourValue');
  if (el) {
    el.setAttribute('min', dataRange[0]);
    el.setAttribute('max', dataRange[1]);
    el.setAttribute('value', firstIsoValue);
    el.value = firstIsoValue;
    el.addEventListener('input', updateIsoValue);

    document.querySelector('#minRange').innerHTML = dataRange[0].toFixed(2);
    document.querySelector('#maxRange').innerHTML = dataRange[1].toFixed(2);
  }
  setContourValue(firstIsoValue);
}

function setField(fieldId) {
  console.log("Selected field: " + fieldId);

  const newData = fieldsReader.getArrays()[fieldId].array.values;
  // console.log(newData);

  fieldsReader.getOutputData().getPointData().getScalars().setData(newData);

  setController();

  renderWindow.render();
}

function changeField(event) {
  const newField = Number(event.target.value)
  setField(newField);
}

//`data/plt000448-temperature-porosity.vti`
fieldsReader
  .setUrl(data_dir + `fields.vti`, { loadData: true })
  .then(() => {

    const fieldNames = [];
    fieldsReader.getArrays().forEach((array, i) => {
      console.log('-', array.name, array.location, ':', array.enable);
      console.log('  - Range: ',
        array.array.ranges[0].min,
        '-',
        array.array.ranges[0].max
      );

      fieldNames.push(array.name);
    });

    const fieldSelector = document.querySelector('#field');
    if (fieldSelector) {
      fieldSelector.innerHTML = fieldNames
        .map((t, index) => `<option value="${index}">${t}</option>`)
        .join('');

      fieldSelector.addEventListener('change', changeField);
    }


    // Get first element for now
    const data = fieldsReader.getOutputData();

    setField(0);

    renderer.addActor(actor);

    renderer.getActiveCamera().set({ position: [-1, -1, 0.6], viewUp: [1, 1, -1] });
    renderer.getActiveCamera().zoom(0.5);
    renderer.resetCamera();
    renderWindow.render();


    ////////////////////////////////////////////////////////////////
    // Text
    ////////////////////////////////////////////////////////////////

    // TODO: get this from the data?
    // const origin = [0, 0, 0];
    const origin = data.getOrigin();

    // Add axis labels a third of the way along each axis
    const smallestAxis = Math.min(domainBox["xLength"], domainBox["yLength"], domainBox["zLength"]);
    var axisCube = vtkCubeSource.newInstance();
    const axisBoxSize = (smallestAxis/3.0).toFixed(2);
    var center = origin.map(function (num, idx) {
      return (num + axisBoxSize/2).toFixed(3);
    });
    axisCube.setCenter(center);
    ['xLength', 'yLength', 'zLength'].forEach((propertyName) => {
      axisCube.set({ [propertyName]: Number(Number(axisBoxSize).toFixed(3)) });
    });

    var axisLimitsCube = vtkCubeSource.newInstance();
    // const buffer = (smallestAxis*0.1).toFixed(2);
    const buffer = 0;
    var centerAxLims = domainBox["center"].map(function (num, idx) {
      return (num + buffer/2).toFixed(2);
    });
    axisLimitsCube.setCenter(centerAxLims);
    ['xLength', 'yLength', 'zLength'].forEach((propertyName) => {
      const val  = Number(domainBox[propertyName]) + Number(buffer);
      axisLimitsCube.set({ [propertyName]: Number(val.toFixed(2)) });
    });

    const accuracy = smallestAxis/10;

    const psMapper = vtkPixelSpaceCallbackMapper.newInstance();
    // psMapper.setInputData(pipelines[0].cubeSource.getOutputData());
    psMapper.setInputData(axisLimitsCube.getOutputData());
    psMapper.setUseZValues(true);
    psMapper.setCallback((coordsList, camera, aspect, depthBuffer) => {
      if (textCtx && windowWidth > 0 && windowHeight > 0) {
        const dataPoints = psMapper.getInputData().getPoints();

        textCtx.clearRect(0, 0, windowWidth, windowHeight);
        
        coordsList.forEach((xy, idx) => {
          const pdPoint = dataPoints.getPoint(idx);
          textCtx.font = '32px serif';
          textCtx.color = 'black';
          textCtx.textAlign = 'center';
          textCtx.textBaseline = 'middle';

          var text = "";
          if ((pdPoint[0] - origin[0]) < accuracy && (pdPoint[1] - origin[1]) < accuracy && (pdPoint[2] - origin[2]) < accuracy) {
            text = "0";
          }
          else if ((pdPoint[0] - origin[0]) < accuracy && (pdPoint[1] - origin[1]) < accuracy) {
            text = pdPoint[2].toFixed(2);
          }
          else if ((pdPoint[0] - origin[0]) < accuracy && (pdPoint[2] - origin[2]) < accuracy) {
            text = pdPoint[1].toFixed(2);
          }
          else if ((pdPoint[1] - origin[1]) < accuracy && (pdPoint[2] - origin[2]) < accuracy) {
            text = pdPoint[0].toFixed(2);
          }
          textCtx.fillText(text, xy[0], windowHeight - xy[1]);
        });
      }
    });
    const textActor = vtkActor.newInstance();
    textActor.setMapper(psMapper);
    renderer.addActor(textActor);


    // Axis labels (should work out how to refactor this and code above)
    // axisCube
    const psMapperXYZ = vtkPixelSpaceCallbackMapper.newInstance();
    psMapperXYZ.setInputData(axisCube.getOutputData());
    psMapperXYZ.setUseZValues(true);
    psMapperXYZ.setCallback((coordsList, camera, aspect, depthBuffer) => {
      if (textCtx && windowWidth > 0 && windowHeight > 0) {
        const dataPoints = psMapperXYZ.getInputData().getPoints();

        coordsList.forEach((xy, idx) => {
          const pdPoint = dataPoints.getPoint(idx);
          textCtx.font = '32px serif';
          textCtx.color = 'black';
          textCtx.textAlign = 'center';
          textCtx.textBaseline = 'middle';

          var text = "";
          if ((pdPoint[0] - origin[0]) < accuracy && (pdPoint[1] - origin[1]) < accuracy && (pdPoint[2] - origin[2]) > accuracy) {
            text = "z";
          }
          else if ((pdPoint[0] - origin[0]) < accuracy && (pdPoint[2] - origin[2]) < accuracy && (pdPoint[1] - origin[1]) > accuracy) {
            text = "y";
          }
          else if ((pdPoint[1] - origin[1]) < accuracy && (pdPoint[2] - origin[2]) < accuracy && (pdPoint[0] - origin[0]) > accuracy) {
            text = "x";
          }
          textCtx.fillText(text, xy[0], windowHeight - xy[1]);
        });
      }
    });
    const textActorXYZ = vtkActor.newInstance();
    textActorXYZ.setMapper(psMapperXYZ);
    renderer.addActor(textActorXYZ);

    // ----------------------------------------------------------------------------
    // Use OpenGL as the backend to view the all this
    // ----------------------------------------------------------------------------

    const openglRenderWindow = vtkOpenGLRenderWindow.newInstance();
    openglRenderWindow.setContainer(container);
    renderWindow.addView(openglRenderWindow);


    const textCanvas = document.createElement('canvas');
    textCanvas.classList.add('textCanvas'); //style.container
    textCanvas.style = style.container;
    textCanvas.style.bottom = 0;
    textCanvas.style.top = 0;
    textCanvas.style.left = 0;
    textCanvas.style.right = 0;
    textCanvas.style.height = "100vh";
    textCanvas.style.position = "absolute";
    textCanvas.style.zIndex = 1;
    container.appendChild(textCanvas);

    textCtx = textCanvas.getContext('2d');


    const interactor = vtkRenderWindowInteractor.newInstance();
    interactor.setView(openglRenderWindow);
    interactor.initialize();
    interactor.bindEvents(container);
    interactor.setInteractorStyle(vtkInteractorStyleTrackballCamera.newInstance());

    // Handle window resize
    function resize() {
      const dims = container.getBoundingClientRect();
      windowWidth = Math.floor(dims.width);
      windowHeight = Math.floor(dims.height);
      openglRenderWindow.setSize(windowWidth, windowHeight);
      textCanvas.setAttribute('width', windowWidth);
      textCanvas.setAttribute('height', windowHeight);
      if (debugHandler) {
        debugHandler.resize(windowWidth, windowHeight);
      }
      console.log("Window height: " + windowHeight + ", width: " + windowWidth);
      renderWindow.render();
    }
    window.addEventListener('resize', resize);
    resize();

    bodyElement.addEventListener('keypress', (e) => {
      if (String.fromCharCode(e.charCode) === 'm') {
        renderWindow.render();
      } else if (String.fromCharCode(e.charCode) === 'n') {
        resetCameraPosition(true);
      }
    });


  });



// global.fullScreen = fullScreenRenderWindow;
global.actor = actor;
global.mapper = mapper;
global.marchingCube = marchingCube;


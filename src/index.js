import 'vtk.js/Sources/favicon';

import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkHttpDataSetReader from 'vtk.js/Sources/IO/Core/HttpDataSetReader';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';

import vtkCubeSource from 'vtk.js/Sources/Filters/Sources/CubeSource';
import vtkImageMarchingCubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import { ScalarMode } from 'vtk.js/Sources/Rendering/Core/Mapper/Constants';
import controlPanel from './html/controller.html';
import about from './html/about.html';
import fileSelector from './html/fileSelector.html';

import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkPixelSpaceCallbackMapper from 'vtk.js/Sources/Rendering/Core/PixelSpaceCallbackMapper';

// import style from '../src/style.module.css';

var qd = {};
if (location.search) location.search.substr(1).split`&`.forEach(item => {let [k,v] = item.split`=`; v = v && decodeURIComponent(v); (qd[k] = qd[k] || []).push(v)})

console.log(location.pathname)

var data_dir = '';
var url_parts = location.pathname.split('/')
if (url_parts && url_parts[1] == "vis") {
  data_dir = url_parts[2];
}

const relative_data_path = '../'.repeat(url_parts.length-1) + 'data/'

console.log(url_parts);
console.log('Data dir: ' + data_dir);

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
var container = document.querySelector('#container');
if (!container) {
  container = document.createElement('div');
  container.id = 'container'; 
  bodyElement.appendChild(container);
}

let textCtx = null;
let windowWidth = 0;
let windowHeight = 0;
const enableDebugCanvas = false;
let debugHandler = null;


function majorAxis(vec3, idxA, idxB) {
  const axis = [0, 0, 0];
  const idx = Math.abs(vec3[idxA]) > Math.abs(vec3[idxB]) ? idxA : idxB;
  const value = vec3[idx] > 0 ? 1 : -1;
  axis[idx] = expr;
  return axis;
}

const renderWindow = vtkRenderWindow.newInstance();
const renderer = vtkRenderer.newInstance({ background: [1, 1, 1] });
renderWindow.addRenderer(renderer);

function applyStyle(el, style) {
  Object.keys(style).forEach((key) => {
    el.style[key] = style[key];
  });
}

const RENDER_STYLE = {
  touchAction: 'none'
}

var controlContainer = document.querySelector("#controlContainer");
if (!controlContainer)
{
controlContainer =  document.createElement('div');
controlContainer.id = 'controlContainer';
bodyElement.appendChild(controlContainer);
}

if (controlContainer)
{
controlContainer.innerHTML = controlPanel;
}

const aboutDiv = document.querySelector('#aboutContainer');
aboutDiv.innerHTML = about;

const fileSelectorDiv = document.querySelector("#fileSelectorContainer");
fileSelectorDiv.innerHTML = fileSelector;

applyStyle(container, RENDER_STYLE);




// Level outlines
function createCubePipeline() {
  const cubeSource = vtkCubeSource.newInstance();
  const actor = vtkActor.newInstance();
  const mapper = vtkMapper.newInstance();

  actor.setMapper(mapper);
  mapper.setInputConnection(cubeSource.getOutputPort());

  renderer.addActor(actor);
  return { cubeSource, mapper, actor };
}

// Need one of these for each box on each level
const pipelines = [];

var data_exists = true;
let metadata = null;
let boxes = null;
try {
  console.log('Get boxes')
 metadata = require('../static/data/' + data_dir + '/metadata.json');
 console.log('Metadata:' + metadata)
 boxes = metadata.boxes;

 document.querySelector("#time").innerHTML = metadata.time;
 
} catch (err) {
  data_exists = false;
 }

 if (!data_exists)
 {

  // const fileSelector = document.querySelector("#fileSelector");
  // // fileSelector.modal('show');

  // window['jQuery'] = window['$'] = require('jquery');
  // $("#fileSelector").modal('show');

  // alert('No data exists');

 } else {

  var filename = document.querySelector("#filename")
  if (filename) { 
    filename.innerHTML = data_dir;
  }


boxes.forEach((box) => {
  var pipeline = createCubePipeline();
  pipeline.actor.getProperty().setRepresentation(1);
  pipeline.actor.getProperty().setColor(box["colour"]);
  pipeline.actor.getProperty().setLighting(false);
  ['xLength', 'yLength', 'zLength', 'center'].forEach((propertyName) => {
    pipeline.cubeSource.set({ [propertyName]: box[propertyName] });
  });

  pipelines.push(pipeline);
  });

const domainBox = boxes[0];


/////////////////////////////////////////////////////////////////////////
// Fields
///////////////////////////////////////////////////////////////////////


// Interaction methods
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


// Setup data structures
const fieldsReader = vtkHttpDataSetReader.newInstance({ enableArray: true, fetchGzip: true });

// Create actor for contour plot
const actor = vtkActor.newInstance();
const mapper = vtkMapper.newInstance();
const marchingCube = vtkImageMarchingCubes.newInstance({
  contourValue: 0.0,
  computeNormals: true,
  mergePoints: true,
});

// Set contour color
actor.getProperty().setColor([1, 0.5, 0.5]);
actor.setMapper(mapper);
mapper.setInputConnection(marchingCube.getOutputPort());

marchingCube.setInputConnection(fieldsReader.getOutputPort());

const contourValInput = document.querySelector('#contourVal');
if (contourValInput) { contourValInput.addEventListener('change', changeContourValInput); }

// Load the data
const fields_url =  relative_data_path + data_dir + `/fields.vti`;
fieldsReader
  .setUrl(fields_url, { loadData: true })
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


    setField(0);

    renderer.addActor(actor);

    function createActor(fieldId, contourVal, colour) {

      if (colour == undefined) { colour = [0, 0, 0]; }

      const newAct = vtkActor.newInstance();
      const newMapper = vtkMapper.newInstance();
      const newMarchingCube = vtkImageMarchingCubes.newInstance({
        contourValue: 0.0,
        computeNormals: true,
        mergePoints: true,
      });

      // Set contour color
      newAct.getProperty().setColor(colour);
      newAct.setMapper(newMapper);
      newMapper.setInputConnection(newMarchingCube.getOutputPort());

      // Create new fieldsReader, set data from already retrieved 
      const clonedeep = require('lodash.clonedeep');
      var thisFieldsReader = vtkHttpDataSetReader.newInstance({ enableArray: true, fetchGzip: true });
      // const newData = clonedeep(iFieldsReader.getArrays()[fieldId].array.values);
      
      thisFieldsReader
  .setUrl(fields_url, { loadData: true })
  .then(() => {

    thisFieldsReader.getOutputData().getPointData().getScalars().setData(
      thisFieldsReader.getArrays()[fieldId].array.values
    );

    newMarchingCube.setInputConnection(thisFieldsReader.getOutputPort());

    if (contourVal == undefined) { 
      const dataRange = thisFieldsReader
          .getOutputData()
          .getPointData()
          .getScalars()
          .getRange();

      contourVal = (dataRange[0] + dataRange[1]) / 2;
    }

  newMarchingCube.setContourValue(contourVal);
  
  renderer.addActor(newAct);
  renderWindow.render();
  });    
      
    }

    createActor(1, 0.99, [0.1, 0.1, 1.0]);
    

    function resetCameraPosition() {
      renderer.getActiveCamera().set({ position: [-1, -1, 0.6], viewUp: [1, 1, -1] });
      renderer.getActiveCamera().zoom(1.0);
      renderer.resetCamera();
      renderWindow.render();
    }

    const resetCamera = document.querySelector("#resetCamera");
    resetCamera.addEventListener('click', (e) => {
      resetCameraPosition();
    });

    resetCameraPosition();


    ////////////////////////////////////////////////////////////////
    // Text
    ////////////////////////////////////////////////////////////////

    // Get first element for now
    // const data = fieldsReader.getOutputData();
    const origin = fieldsReader.getOutputData().getOrigin();

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
        resetCameraPosition();
      }
    });

    document.querySelector("#loading").style.display='none';

  });

  

// global.actor = actor;
// global.mapper = mapper;
// global.marchingCube = marchingCube;

 } // end if data exists
 
if(typeof(module.hot) !== 'undefined') {
  module.hot.accept() // eslint-disable-line no-undef
}
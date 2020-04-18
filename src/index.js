import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkHttpDataSetReader from 'vtk.js/Sources/IO/Core/HttpDataSetReader';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';

import vtkCubeSource from 'vtk.js/Sources/Filters/Sources/CubeSource';
import vtkImageMarchingCubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import controlPanel from './html/controller.html';
import about from './html/about.html';
import addEditContour from './html/addEditContourDialog.html';
import fileSelector from './html/fileSelector.html';

import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkPixelSpaceCallbackMapper from 'vtk.js/Sources/Rendering/Core/PixelSpaceCallbackMapper';

////////////////////////////////////////////////
// Utilities
/////////////////////////////////////////////
function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

// Colour converters from  https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
function hexToRgb(hex) {
  // console.log('Hex to RGB: ' + hex);
  // // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  // var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  // hex = hex.replace(shorthandRegex, function (m, r, g, b) {
  //   console.log(r + g + b);
  //   return r + r + g + g + b + b;
  // });

  // var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  // console.log(result);
  // return result ? {
  //   r: parseInt(result[1], 16),
  //   g: parseInt(result[2], 16),
  //   b: parseInt(result[3], 16)
  // } : null;
  const hexRgb = require('hex-rgb');
  return hexRgb(hex, {format: 'array'});
}

function noContoursLi() {
  let noContours = document.createElement('li');
  noContours.id = `noContours`;
  noContours.classList = 'contourRow noContourRow';
  noContours.style.display = 'inline';
  noContours.innerHTML = `<a id="addContourBtn" class="add"
  data-toggle="modal" data-target="#addContour" alt="Add contour (a)"
  data-toggle="tooltip" title="Add contour (a)"><img src='/img/plus.svg' class="contourControl"> Add a contour</a>`;
  return noContours;
}

////////////////////////////////////
// Parse URL
//////////////////////////////////


var qd = {};
if (location.search) location.search.substr(1).split`&`.forEach(item => { let [k, v] = item.split`=`; v = v && decodeURIComponent(v); (qd[k] = qd[k] || []).push(v) })

console.log(location.pathname)

var data_dir = '';
var url_parts = location.pathname.split('/')
if (url_parts && url_parts[1] == "vis") {
  data_dir = url_parts[2];
}

const relative_data_path = '../'.repeat(url_parts.length - 1) + 'data/'

console.log(url_parts);
console.log('Data dir: ' + data_dir);

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
let debugHandler = null;

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
if (!controlContainer) {
  controlContainer = document.createElement('div');
  controlContainer.id = 'controlContainer';
  bodyElement.appendChild(controlContainer);
}

// Add contour dialog
let doc = new DOMParser().parseFromString(addEditContour, 'text/html');
let addEditContourDiv = doc.body.firstChild; // document.createElement('div');
// addEditContourDiv.innerHTML = addEditContour;
bodyElement.appendChild(addEditContourDiv);

// Edit contour
let doc2 = new DOMParser().parseFromString(addEditContour, 'text/html');
let editContourDiv = doc2.body.firstChild;
editContourDiv.id = 'editContour';
editContourDiv.querySelector("#title").innerHTML = 'Edit Contour';
editContourDiv.querySelector("#addContourDialogBtn").innerHTML = 'Edit';
// field-addContour
//colourVal
// colourValPicker
// addContourDialogValue
editContourDiv.querySelector("#field-addContour").id = 'field-editContour';
editContourDiv.querySelector("#colourVal").id = 'colourValEdit';
editContourDiv.querySelector("#colourValPicker").id = 'colourValPickerEdit';
editContourDiv.querySelector("#addContourDialogValue").id = 'editContourDialogValue';
editContourDiv.querySelector("#addContourDialogBtn").id = 'editContourDialogBtn';
editContourDiv.querySelector("#addContourLimits").id = 'editContourLimits';


bodyElement.appendChild(editContourDiv);

if (controlContainer) {
  controlContainer.innerHTML = controlPanel;

  let contourList = document.querySelector("#contourListContainer");
  contourList.appendChild(noContoursLi());
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

if (!data_exists) {

  // const fileSelector = document.querySelector("#fileSelector");
  // // fileSelector.modal('show');

  // window['jQuery'] = window['$'] = require('jquery');
  // $("#fileSelector").modal('show');

  // alert('No data exists');



} else {

  document.querySelector("#loading").style.display = 'inherit';
  document.querySelector("#timeContainer").style.display = 'inherit';

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

  const contourValInput = document.querySelector('#contourVal');
  if (contourValInput) { contourValInput.addEventListener('change', changeContourValInput); }

  // We will store all our contours in here
  let actors = [];
  let marchingCubes = [];
  let activeContours = 0;
  let fieldsReaders = [];

  // Load the data
  const fields_url = relative_data_path + data_dir + `/fields.vti`;
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

      document.querySelectorAll(".fieldNameSelect").forEach(function(field) {
          field.innerHTML = fieldNames
          .map((t, index) => `<option value="${index}">${t}</option>`)
          .join('');
      });
      
      function editContour(id, fieldId, value, colour) {
        console.log("Edit contour(" + id + ") field: " +  fieldId + ", val: " + 
                    value + ", colour: " + colour);
        const newData = fieldsReaders[id].getArrays()[fieldId].array.values;
        fieldsReaders[id].getOutputData().getPointData().getScalars().setData(newData);
        actors[id].getProperty().setColor(normalizedColour(hexToRgb(colour)));
        marchingCubes[id].setContourValue(value);

        renderWindow.render();

      }

      function normalizedColour(colour) {
        console.log("Make normalized colour of " + colour.toString());
        
        var max = colour.reduce(function(a, b) { return Math.max(a, b); });
        var normalizedColour;
        if (max > 1) {  normalizedColour = colour.map(function(item) { return item/255 }); }
        else { normalizedColour = colour; }
        return normalizedColour;
      }

      function addContour() {

        const field = document.querySelector("#field-addContour").value;
        const value = document.querySelector("#addContourDialogValue").value;
        const colour = document.querySelector("#colourVal").value;

        console.log('Add contour for field ' + field + ', value: ' + value + ', colour: ' + colour);

        var rgb = colour.replace('rgb(', '').replace(')', '').split(',');

        createActor(Number(field), Number(value), [Number(rgb[0]), Number(rgb[1]), Number(rgb[2])]);
      }
      document.querySelector("#addContourDialogBtn").addEventListener('click', addContour);
      document.querySelector("#editContourDialogBtn").addEventListener('click', function(e) {
        console.log(e.target);
        const contourId = e.target.dataset.id; 

        const field = document.querySelector("#field-editContour").value;
        const value = document.querySelector("#editContourDialogValue").value;
        const colour = document.querySelector("#colourValPickerEdit").value;

        editContour(contourId, field, value, colour);

      });
      document.querySelector("#addContour").addEventListener('keypress', function (e) {
        if (e.which == 13) {
          // addContour();
          let element = document.querySelector("#addContourDialogBtn");
          // trigger submit event
          var event; // The custom event that will be created
          if (document.createEvent) {
            event = document.createEvent("HTMLEvents");
            event.initEvent("click", true, true);
            event.eventName = "click";
            element.dispatchEvent(event);
          } else {
            event = document.createEventObject();
            event.eventName = "click";
            event.eventType = "click";
            element.fireEvent("on" + event.eventType, event);
          }
        }
      });

      // setField(0);
      // renderer.addActor(actor);

     

      function createActor(fieldId, contourVal, colour) {

        if (colour == undefined) { colour = [0, 0, 0]; }
       

        console.log('Create actor. fieldId: ' + fieldId + 
                    ', contourVal: ' + contourVal + 
                    ', colour: ' + colour)

        const newAct = vtkActor.newInstance();
        const newMapper = vtkMapper.newInstance();
        const newMarchingCube = vtkImageMarchingCubes.newInstance({
          contourValue: 0.0,
          computeNormals: true,
          mergePoints: true,
        });
        var thisFieldsReader = vtkHttpDataSetReader.newInstance({ enableArray: true, fetchGzip: true });
        
        actors.push(newAct);
        fieldsReaders.push(thisFieldsReader);
        marchingCubes.push(newMarchingCube);

        // Set contour color
        newAct.getProperty().setColor(normalizedColour(colour));
        console.log('Diffuse: ' + newAct.getProperty().getDiffuse()
        + ', ambient: ' + newAct.getProperty().getAmbient()
        + ', specular:' + newAct.getProperty().getSpecular()
        + ', specularPower: ' + newAct.getProperty().getSpecularPower());
        newAct.setMapper(newMapper);
        newMapper.setInputConnection(newMarchingCube.getOutputPort());

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

            // Add entry in controller
            const contourId = actors.length - 1;
            let contourList = document.querySelector("#contourListContainer");

            const hexColour = rgbToHex(colour[0], colour[1], colour[2]);

            let newItem = document.createElement('li');
            newItem.classList = 'list-group-item contourRow';
            newItem.id = 'contourRow' + contourId;
            // newItem.dataset.contourVal = contourVal;
            // newItem.dataset.colour = hexColour;
            newItem.innerHTML = `<div class="contourMain">
        <span class="dot contourControl" style="background-color: ` + hexColour + `;"></span>
        `+ fieldNames[fieldId] + ` = ` + contourVal.toFixed(2) + `
      </div>
      <div class="contourControls">
        <button class="btn edit" data-id="`+ contourId + `"
        data-toggle="modal" data-target="#editContour"
          alt="Edit" data-toggle="tooltip" title="Edit"
          data-contourVal="`+ contourVal +`" data-colour="`+ hexColour 
          +`" data-id="`+ contourId +`" data-fieldid="` + fieldId + `">
          <img src="/img/wrench.svg" class="contourControl">
      
        </button>
        <button class="btn" id="delete`+ contourId + `"
        data-toggle="tooltip" title="Delete">
          <img src="/img/trash.svg" class="contourControl" alt="Delete">
        </button>
      </div>`;
            console.log('Add new item: ' + newItem);
            contourList.appendChild(newItem);

            if (activeContours == 0) {
              document.querySelector("#noContours").remove();
            }
            activeContours = activeContours + 1;

            // Add event listeners for edit and delete
            // const editBtn = document.querySelector("#edit" + contourId);
            const delBtn = document.querySelector("#delete" + contourId);

            // editBtn.addEventListener('click', function (e) {
            //   console.log(e.target.id);
            //   let id = e.target.id.replace('edit', '');

            //   // Create the edit contour dialog

            //   // Setup edit contour dialog

            //   bodyElement.appendChild(addEditContourDiv);
            // });

            delBtn.addEventListener('click', function (e) {
              console.log(e.target.id);
              let id = Number(e.target.id.replace('delete', ''));
              let row = document.querySelector("#contourRow" + id);
              row.remove();
              let act = actors[id];
              renderer.removeActor(act);
              renderWindow.render();

              activeContours = activeContours - 1;

              if (activeContours == 0) {
                // document.querySelector("#noContours").style.display='inline';
                let contourList = document.querySelector("#contourListContainer");
                contourList.appendChild(noContoursLi());
              }
            });


            newMarchingCube.setContourValue(contourVal);

            renderer.addActor(newAct);
           
            renderWindow.render();
          });

      }

      // createActor(1, 0.99, [0.1, 0.1, 1.0]);


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
      const axisBoxSize = (smallestAxis / 3.0).toFixed(2);
      var center = origin.map(function (num, idx) {
        return (num + axisBoxSize / 2).toFixed(3);
      });
      axisCube.setCenter(center);
      ['xLength', 'yLength', 'zLength'].forEach((propertyName) => {
        axisCube.set({ [propertyName]: Number(Number(axisBoxSize).toFixed(3)) });
      });

      var axisLimitsCube = vtkCubeSource.newInstance();
      // const buffer = (smallestAxis*0.1).toFixed(2);
      const buffer = 0;
      var centerAxLims = domainBox["center"].map(function (num, idx) {
        return (num + buffer / 2).toFixed(2);
      });
      axisLimitsCube.setCenter(centerAxLims);
      ['xLength', 'yLength', 'zLength'].forEach((propertyName) => {
        const val = Number(domainBox[propertyName]) + Number(buffer);
        axisLimitsCube.set({ [propertyName]: Number(val.toFixed(2)) });
      });

      const accuracy = smallestAxis / 10;

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
        } else if (String.fromCharCode(e.charCode) === 'r') {
          resetCameraPosition();
        }
      });

      document.querySelector("#loading").style.display = 'none';

    });



  // global.actor = actor;
  // global.mapper = mapper;
  // global.marchingCube = marchingCube;

} // end if data exists

if (typeof (module.hot) !== 'undefined') {
  module.hot.accept() // eslint-disable-line no-undef
}
import vtkActor from 'vtk.js/Sources/Rendering/Core/Actor';
import vtkHttpDataSetReader from 'vtk.js/Sources/IO/Core/HttpDataSetReader';
import vtkRenderWindowInteractor from 'vtk.js/Sources/Rendering/Core/RenderWindowInteractor';
import vtkInteractorStyleTrackballCamera from 'vtk.js/Sources/Interaction/Style/InteractorStyleTrackballCamera';
import vtkRenderWindow from 'vtk.js/Sources/Rendering/Core/RenderWindow';
import vtkRenderer from 'vtk.js/Sources/Rendering/Core/Renderer';
import vtkCubeSource from 'vtk.js/Sources/Filters/Sources/CubeSource';
import vtkImageMarchingCubes from 'vtk.js/Sources/Filters/General/ImageMarchingCubes';
import vtkMapper from 'vtk.js/Sources/Rendering/Core/Mapper';
import about from './html/about.html';
import addEditContour from './html/addEditContourDialog.html';
import fileSelector from './html/fileSelector.html';
import vtkOpenGLRenderWindow from 'vtk.js/Sources/Rendering/OpenGL/RenderWindow';
import vtkPixelSpaceCallbackMapper from 'vtk.js/Sources/Rendering/Core/PixelSpaceCallbackMapper';

import * as util from '../static/js/utilities.js';
import { noContoursLi } from './js/components.js';

//////////////////////////////////////////
/// Work out what we're going to display
//////////////////////////////////////////
const base = util.getBase();
const data_dir = util.getDataFile();


//////////////////////////////
// Create images
//////////////////////////////
import imgMenu from './img/menu.svg';
import imgPlus from './img/plus.svg';
import imgTrash from './img/trash.svg';
import imgWrench from './img/wrench.svg';
import imgReset from './img/loop.svg';
import imgOpen from './img/folder.svg';
document.querySelector("#menuIcon").src = imgMenu;
document.querySelector(".plusIcon").src = imgPlus;
document.querySelector(".resetIcon").src = imgReset;
document.querySelector(".openIcon").src = imgOpen;

//////////////////////////////////////////////////
// Set up basic html elements
/////////////////////////////////////////////
const bodyElement = document.querySelector('body');
let container = document.querySelector('#container');
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

let controlContainer = document.querySelector("#controlContainer");

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
editContourDiv.querySelector("#addContourLimits").id = 'editContourLimits'; // addValidationIssue
editContourDiv.querySelector("#addValidationIssue").id = 'editValidationIssue';

bodyElement.appendChild(editContourDiv);

if (controlContainer) {
  // controlContainer.innerHTML = controlPanel;

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

let data_exists = true;
let metadata = null;
let boxes = null;
try {
  // This is a file system relative path - doesn't depend on how we're releasing files,
  // Just where they are when we compile (I think)
  // console.log("Get boxes");
  metadata = require("../static/data/" + data_dir + "/metadata.json"); // works on dev
  // metadata = require("../../static/data/" + data_dir + "/metadata.json"); // works on dev
  console.log('Got metadata:' + metadata)
  boxes = metadata.boxes;

  document.querySelector("#time").innerHTML = metadata.time;

} catch (err) {
  console.log(err);
  data_exists = false;
}

if (!data_exists) {

  // const fileSelector = document.querySelector("#fileSelector");
  // // fileSelector.modal('show');

  // window['jQuery'] = window['$'] = require('jquery');
  // $("#fileSelector").modal('show');

  // alert('No data exists');


  console.log("No data exists");
} else {

  // console.log("Data exists");

  document.querySelector("#loading").style.display = 'inherit';
  document.querySelector("#timeContainer").style.display = 'inherit';

  let filename = document.querySelector("#filename")
  if (filename) {
    filename.innerHTML = data_dir;
  }


  boxes.forEach((box) => {
    let pipeline = createCubePipeline();
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
    let contourVal = document.querySelector('#contourVal');
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

    let firstIsoValue = (dataRange[0] + dataRange[1]) / 2;
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
  // const fields_url = relative_data_path + data_dir + `/fields.vti`;
  const fields_url = base + 'data/' + data_dir + `/fields.vti`;
  console.log("Attempt to read data from " + fields_url);
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

      document.querySelectorAll(".fieldNameSelect").forEach(function (field) {
        field.innerHTML = fieldNames
          .map((t, index) => `<option value="${index}">${t}</option>`)
          .join('');
      });

      function editContour(id, fieldId, value, colour) {
        console.log("Edit contour(" + id + ") field: " + fieldId + ", val: " +
          value + ", colour: " + colour); 

        console.log('Fields readers: ' + fieldsReaders);
        const newData = fieldsReaders[id].getArrays()[fieldId].array.values;
        fieldsReaders[id].getOutputData().getPointData().getScalars().setData(newData);
        var {r, g, b} = hexToRgb(colour);
        actors[id].getProperty().setColor(util.normalizedColour([r,g,b]));
        marchingCubes[id].setContourValue(value);

        // update url
        const oldSegment = util.getUrlItem(id);
        const newUrl = location.pathname.replace(oldSegment, util.encodeForURL(id, fieldId, value, colour));
        window.history.pushState({}, "", newUrl);

        renderWindow.render();
      }

      function addContour() {

        const field = document.querySelector("#field-addContour").value;
        const value = document.querySelector("#addContourDialogValue").value;
        const colour = document.querySelector("#colourVal").value;

        console.log('Add contour for field ' + field + ', value: ' + value + ', colour: ' + colour);

        let rgb = colour.replace('rgb(', '').replace(')', '').split(',');

        createActor(Number(field), Number(value), [Number(rgb[0]), Number(rgb[1]), Number(rgb[2])]);

      }

      document.querySelector("#addContourDialogBtn").addEventListener('click', addContour);
      document.querySelector("#editContourDialogBtn").addEventListener('click', function (e) {
        const contourId = e.target.dataset.id;

        const field = document.querySelector("#field-editContour").value;
        const value = document.querySelector("#editContourDialogValue").value;
        const colour = document.querySelector("#colourValPickerEdit").value;

        editContour(contourId, field, value, colour);

      });

      /**
       * Allow submitting the add contour dialog on enter key press
       */
      function submitOnEnter(e) {
        if (e.which == 13) {
          // let element = document.querySelector("#addContourDialogBtn");
          let element = document.querySelector('#' + e.target.id + 'DialogBtn');
          let event; // The custom event that will be created
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
      }
      document.querySelector("#addContour").addEventListener('keypress', submitOnEnter);
      document.querySelector("#editContour").addEventListener('keypress', submitOnEnter);

      /**
       * This is the key method for adding contours
       * 
       * @param {*} fieldId 
       * @param {*} contourVal 
       * @param {*} colour 
       * @param {*} addToUrl 
       * @param {*} id 
       */
      function createActor(fieldId, contourVal, colour, addToUrl, id) {
        if (addToUrl == undefined) { addToUrl = true; }
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
        let thisFieldsReader = vtkHttpDataSetReader.newInstance({ enableArray: true, fetchGzip: true });

        
        actors.push(newAct);
        fieldsReaders.push(thisFieldsReader);
        marchingCubes.push(newMarchingCube);

        console.log('Fields readers: ' + fieldsReaders);

        // Set contour color
        newAct.getProperty().setColor(util.normalizedColour(colour));
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
            var contourId;
            if (id != null) { contourId = id; }
            else { contourId = actors.length - 1; }
            let contourList = document.querySelector("#contourListContainer");

            const hexColour = util.rgbToHex(colour[0], colour[1], colour[2]);

            let newItem = createContourLi(contourId, hexColour, fieldNames, fieldId, contourVal);
            contourList.appendChild(newItem);

            if (activeContours == 0) {
              document.querySelector("#noContours").remove();
            }
            activeContours = activeContours + 1;
            console.log('Active contours = ' + activeContours);

            // Add event listeners for edit and delete
            // const editBtn = document.querySelector("#edit" + contourId);
            // const delBtn = document.querySelector(".deleteBtn");
            const delBtn = document.querySelector("#delete" + contourId);
            console.log(delBtn);

            delBtn.addEventListener('click', function (e) {
              const id = e.target.dataset.id;
              console.log('Delete: ' + id);

              let row = document.querySelector("#contourRow" + id);
              row.remove();
              let act = actors[id];
              renderer.removeActor(act);
              renderWindow.render();

              activeContours = activeContours - 1;
              console.log('Active contours = ' + activeContours);

              if (activeContours == 0) {
                let contourList = document.querySelector("#contourListContainer");
                contourList.appendChild(noContoursLi());
              }

              // Find url item and delete
              const newUrl = location.pathname.replace(util.getUrlItem(id), '');
              window.history.pushState({ "html": "", "pageTitle": "" }, "", newUrl);

            });


            newMarchingCube.setContourValue(contourVal);

            renderer.addActor(newAct);

            renderWindow.render();

            // Update URL 
            if (addToUrl) {
              const oldPath = location.pathname;
              console.log('Old path: ' + oldPath + ', last char: ' + oldPath.charAt(oldPath.length - 1));
              const newUrl = oldPath + (oldPath.charAt(oldPath.length - 1) == '/' ? '' : '/') +
              util.encodeForURL(contourId, fieldId, contourVal, hexColour.replace('#', ''));

              window.history.pushState({ "html": "", "pageTitle": "" }, "", newUrl);
            }
          });

      }

      console.log('Current actors: ' + actors + ' size: ' + actors.size);
      const currContours = util.getCurrentFields();
      if (currContours &&
        (actors == null || actors.size == null || actors.size < currContours.size)) {
        currContours.forEach(function (contour) {
          if (!location.pathname.includes(util.encodeForURL(contour.id, contour.fieldId,
            contour.value, contour.hexColour))) {
            console.log('Make actor with id' + contour.id);
            let {r,g,b} = util.hexToRgb(contour.hexColour);
            createActor(contour.fieldId, contour.value, [r,g,b], false, contour.id);
          }
        })
      }

      function resetCameraPosition() {
        renderer.getActiveCamera().set({ position: [-1, -1, 0.6], viewUp: [1, 1, -1] });
        renderer.getActiveCamera().zoom(1.0);
        renderer.resetCamera();
        renderWindow.render();
      }


      document.querySelector("#resetCamera").addEventListener('click', (e) => {
        resetCameraPosition();
      });

      resetCameraPosition();

      ////////////////////////////////////////////////////////////////
      // Text
      ////////////////////////////////////////////////////////////////
      const { openglRenderWindow, textCanvas } = addAxisLimitsAndLabels(fieldsReader, domainBox);

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


} // end if data exists




function createContourLi(contourId, hexColour, fieldNames, fieldId, contourVal) {
  let newItem = document.createElement('li');
  newItem.classList = 'list-group-item contourRow';
  newItem.id = 'contourRow' + contourId;
  newItem.innerHTML = `<div class="contourMain">
        <span class="dot contourControl" style="background-color: ` + hexColour + `;"></span>
        ` + fieldNames[fieldId] + ` = ` + contourVal.toFixed(2) + `
      </div>
      <div class="contourControls">
        <button class="btn edit" data-id="` + contourId + `"
        data-toggle="modal" data-target="#editContour"
          alt="Edit" data-toggle="tooltip" title="Edit"
          data-contourVal="` + contourVal + `" data-colour="` + hexColour
    + `" data-id="` + contourId + `" data-fieldid="` + fieldId + `">
          <img src="` + imgWrench + `" class="contourControl">
      
        </button>
        <button class="btn deleteBtn" id="delete` + contourId + `"
        data-toggle="tooltip" data-id="` + contourId + `" title="Delete">
          <img src="` + imgTrash + `" class="contourControl" alt="Delete">
        </button>
      </div>`;
  return newItem;
}

function addAxisLimitsAndLabels(fieldsReader, domainBox) {
  const origin = fieldsReader.getOutputData().getOrigin();
  // Add axis labels a third of the way along each axis
  const smallestAxis = Math.min(domainBox["xLength"], domainBox["yLength"], domainBox["zLength"]);
  let axisCube = vtkCubeSource.newInstance();
  const axisBoxSize = (smallestAxis / 3.0).toFixed(2);
  let center = origin.map(function (num, idx) {
    return (num + axisBoxSize / 2).toFixed(3);
  });
  axisCube.setCenter(center);
  ['xLength', 'yLength', 'zLength'].forEach((propertyName) => {
    axisCube.set({ [propertyName]: Number(Number(axisBoxSize).toFixed(3)) });
  });
  let axisLimitsCube = vtkCubeSource.newInstance();
  // const buffer = (smallestAxis*0.1).toFixed(2);
  const buffer = 0;
  let centerAxLims = domainBox["center"].map(function (num, idx) {
    return (num + buffer / 2).toFixed(2);
  });
  axisLimitsCube.setCenter(centerAxLims);
  ['xLength', 'yLength', 'zLength'].forEach((propertyName) => {
    const val = Number(domainBox[propertyName]) + Number(buffer);
    axisLimitsCube.set({ [propertyName]: Number(val.toFixed(2)) });
  });
  const accuracy = smallestAxis / 10;
  const textActorLimits = makeAxisLabels(axisLimitsCube, origin, accuracy, makeAxisLimitLabels, true);
  renderer.addActor(textActorLimits);
  const textActorXYZ = makeAxisLabels(axisCube, origin, accuracy, makeXYZLabels, false);
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
  return { openglRenderWindow, textCanvas };
}

function makeXYZLabels(pdPoint, origin, accuracy) {
  let text = "";
  
  if ((pdPoint[0] - origin[0]) < accuracy && (pdPoint[1] - origin[1]) < accuracy && (pdPoint[2] - origin[2]) > accuracy) {
    text = "z";
  }
  else if ((pdPoint[0] - origin[0]) < accuracy && (pdPoint[2] - origin[2]) < accuracy && (pdPoint[1] - origin[1]) > accuracy) {
    text = "y";
  }
  else if ((pdPoint[1] - origin[1]) < accuracy && (pdPoint[2] - origin[2]) < accuracy && (pdPoint[0] - origin[0]) > accuracy) {
    text = "x";
  }
  return text;
}

function makeAxisLimitLabels(pdPoint, origin, accuracy) {
  let text = "";
  
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
  return text;
}


function makeAxisLabels(axisCube, origin, accuracy, textFunction, clearCanvas) {
  const psMapperXYZ = vtkPixelSpaceCallbackMapper.newInstance();
  psMapperXYZ.setInputData(axisCube.getOutputData());
  psMapperXYZ.setUseZValues(true);
  psMapperXYZ.setCallback((coordsList, camera, aspect, depthBuffer) => {
    if (textCtx && windowWidth > 0 && windowHeight > 0) {
      const dataPoints = psMapperXYZ.getInputData().getPoints();

      if (clearCanvas) { textCtx.clearRect(0, 0, windowWidth, windowHeight); }

      coordsList.forEach((xy, idx) => {
        const pdPoint = dataPoints.getPoint(idx);
        textCtx.font = '32px serif';
        textCtx.color = 'black';
        textCtx.textAlign = 'center';
        textCtx.textBaseline = 'middle';
        const text = textFunction(pdPoint, origin, accuracy);
        textCtx.fillText(text, xy[0], windowHeight - xy[1]);
      });
    }
  });
  const textActorXYZ = vtkActor.newInstance();
  textActorXYZ.setMapper(psMapperXYZ);
  return textActorXYZ;
}


if (typeof (module.hot) !== 'undefined') {
  module.hot.accept() // eslint-disable-line no-undef
}

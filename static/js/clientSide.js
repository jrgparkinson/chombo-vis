
import {hexToRgb, rgbToHex, getDataFile, getBase, 
  getDataPath, OPEN_PATH, DATAFILES_PATH} from './utilities.js'; 
 
var metadata;

/**
 * Mostly event handlers
 */

function populateFileList() {

  console.log("Populate file list by quering: " + getBase().concat(DATAFILES_PATH));

  $.getJSON(getBase().concat(DATAFILES_PATH), function (data) {

    //data is the JSON string
    console.log('Found available data files: ' + data);

    var html = '';
    data.forEach(function (data_loc) {
      html = html.concat('<a href="' + getBase() + OPEN_PATH + '/' + data_loc + '" class="list-group-item list-group-item-action">' + data_loc + '</a>')
    })

    $("#fileList").html(html);

    // Check if current file is valid
    if (!data.includes(getDataFile())) {
      $("#fileSelector").modal({
        show: true,
        keyboard: false,
        backdrop: 'static'
      });
      console.log('Turn off loading');
      $("#loading").css("display", "none");
      $("#timeContainer").css("display", "none");

      // Disable closing file selector
      $("#closeFileSelector").css("display", "none");
      $(".close").css("display", "none");
      // $("#fileSelector").attrs("data-keyboard", false);
    }
  });
}


// Sets RGB string from hex code selected
function updateColourInput(inputId, hex) {
  if ($("#colourValPicker") == null
    || $("#colourValPicker") == undefined
    || $('#colourValPicker').val() == undefined) { return; }

  if (inputId == undefined) { inputId = "#colourVal"; }
  if (hex == undefined) { hex = $("#colourValPicker").val(); }
  var { r, g, b } = hexToRgb(hex);
  let rgbStr = "rgb(" + r + "," + g + "," + b + ")";
  console.log('Update colour input set ' + inputId + ' = ' + rgbStr + " (from hex: " + hex + ")");
  $(inputId).val(rgbStr);
}



// Set to Oxford Blue initially
function setColourPicker() {
  var hex = $("#colourValPicker").val("#105db5");
  updateColourInput();
}

function updateColourPicker() {
  console.log('Update colour picker');
  var rgb = $("#colourVal").val();
  let p = rgb.replace('rgb(', '').replace(')', '').split(',')

  var hex = rgbToHex(Number(p[0]),
    Number(p[1]), Number(p[2]));
  console.log('rgb: ' + p + ' => hex: ' + hex);
  $("#colourValPicker").val(hex);
}

function printFieldLimits(fieldInput, limitsId) {
  if (fieldInput == undefined) { fieldInput = "#field-addContour"; }
  if (limitsId == undefined) { limitsId = "#addContourLimits" }
  var field = $(fieldInput + " option:selected").text();

  var limits;
  metadata.pointData.arrays.forEach(function (array) {
    if (array.data.name == field) {
      limits = array.data.ranges[0];
    }
  });

  console.log(limits);
  console.log('Get limits for field: ' + field + ', limits: ' + limits);

  $(limitsId).html('Min: ' + Number(limits.min).toFixed(2)
    + '<br>Max: ' + Number(limits.max).toFixed(2));
}

$(document).ready(function () {
  populateFileList();
  document.title = getDataFile() + ' - Chombo Visualiser';

  setColourPicker();

  var metadata_url = getDataPath() + '/fields.vti/index.json';
  // metadata_url = '/data/' + getDataFile() + '/fields.vti/index.json';
  // console.log('Loading metadata from ' + metadata_url)

  $.getJSON(metadata_url, function (json) {
    console.log('Data from /data/...')
    console.log(json);
    metadata = json;
  });


  $(document).on("shown.bs.modal", "#addContour", function () {
    printFieldLimits();
  });

  // Handle edit button
  $(document).on("click", "button.edit", function () {
    console.log("Edit contour: ");
    console.log($(this)[0].dataset);

    let contourId = $(this)[0].dataset.id;
    let fieldId = $(this)[0].dataset.fieldid;
    let contourVal = $(this)[0].dataset.contourval;
    let color = $(this)[0].dataset.colour;

    let editModal = $("#editContour");

    // Setup edit modal for this contour
    editModal.find("#field-editContour").val(fieldId);
    editModal.find("#editContourDialogValue").val(contourVal);

    $("#colourValPickerEdit").val(color);
    updateColourInput("#colourValEdit", color);

    // editModal.find("#editContourDialogBtn").dataset = {'id': contourId};

    editModal.find("#editContourDialogBtn").attr({ "data-id": contourId });
    console.log('Edit button dataset:')
    console.log(editModal.find("#editContourDialogBtn").dataset);

    printFieldLimits("#field-editContour", "#editContourLimits");
  });

  $(document).on("change", "#colourValPicker", function () {
    updateColourInput();
  });

  $(document).on('shown.bs.modal', "#fileSelector", populateFileList);


});

$("#fileSelector").on('shown.bs.modal', populateFileList);
$("#colourVal").on('keyup', updateColourPicker);
$("#field-addContour").on('change', printFieldLimits);
$("#addContourBtn").on('click', printFieldLimits);
$("#field-addContour").on('change', printFieldLimits);

$("#field-editContour").on('change', function () {
  printFieldLimits("#field-editContour", "#editContourLimits");
});
//printFieldLimits(fieldInput, limitsId)

$('#addContour').on('shown.bs.modal', function () {
  $('#field-addContour').focus();
});

$('#addContour').on('shown.bs.modal', function () {
  $('#field-addContour').focus();
});

// General key presses
$("body").on('keypress', function (event) {

  // Don't respond to key presses during a modal
  if ($('#addContour').is(':visible')
    || $('#editContour').is(':visible')
    || $('#fileSelector').is(':visible')) {
    return;
  }

  if (String.fromCharCode(event.charCode) == 'a') {
    $("#addContour").modal('show');
  } else if (String.fromCharCode(event.charCode) == 'c') {
    $("#collapseController").collapse('toggle');
  } else if (String.fromCharCode(event.charCode) == 'o') {
    $("#fileSelector").modal('show');
  }
});

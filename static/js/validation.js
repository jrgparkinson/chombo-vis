
const colourRegex = /^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/
const numberRegex = /^[0-9\.e+-]+$/
const allowedKeys = [13, // enter
                    8] // backspace

function validateContourVal(e) {
    var str = String.fromCharCode(e.keyCode);
    console.log(e.keyCode+ ', ' + str);

    // Allow backspace (8) and enter (13)
    if (!/[0-9\.e+-]+/.test(str) && e.keyCode != 8 && e.keyCode != 13) {
        return false;
    }
}

function validateContourValRange(e) {
    console.log(e);

    var inputId = e.currentTarget.id;
    let addOrEdit = '';

    if (inputId.includes('field')) { addOrEdit = inputId.replace('field-', '').replace('Contour', ''); }
    else {addOrEdit = inputId.replace('ContourDialogValue', ''); }
    // var limitsId = inputId.replace('DialogValue', 'Limits');
    var limitsId = addOrEdit + 'ContourLimits';
    var warningId = addOrEdit + 'ValidationIssue';
    var submitButtonId = addOrEdit + 'ContourDialogBtn';
    var contourValId = '#' + addOrEdit + 'ContourDialogValue';

    range = $('#' + limitsId)[0];
    minMax = range.innerHTML.match(/Min:\s+(.*)\<br\>.*Max:\s+(.*)/)

    // let warningId = inputId.replace('ContourDialogValue', 'ValidationIssue');
    // let submitButtonId = inputId.replace('Value', 'Btn');

    console.log('Set submit button: ' + submitButtonId);

    // console.log('Value ' + $('#addContourDialogValue').val() + ' range: [' + Number(minMax[1]) + ',' +
    //                  Number(minMax[2]) + ']' )

    if ($(contourValId).val() < Number(minMax[1])
    || $(contourValId).val() > Number(minMax[2]) ) {
        console.log('Value exceeds data range');
        $(contourValId).css('background-color', 'salmon');
        $(contourValId).css('border-color', 'firebrick');
        $('.validationContour').css({"display":"list-item"});
        console.log('Set div: ' + warningId);
        $('#' + submitButtonId).prop('disabled', true);
    } else {
        $(contourValId).css('background-color', '');
        $(contourValId).css('border-color', '');
        $('.validationContour').css({"display":"none"});
        $('#' + submitButtonId).prop('disabled', false);
    }
}

function validateRGBColour(e) {
    
    let inputVal = e.currentTarget.value;
    var inputId = e.currentTarget.id;
    var submitButtonId = inputId.includes('Edit') ? 'editContourDialogBtn' : 'addContourDialogBtn';

    console.log('Validate RGB colour ' + inputVal);
    
    if (!/^rgb\(\d{1,3},\d{1,3},\d{1,3}\)$/.test(inputVal)) {
        console.log("Invalid RGB field");
        $('#' + inputId).css('background-color', 'salmon');
        $('#' + inputId).css('border-color', 'firebrick');
        $('.validationColour').css({"display":"list-item"});
        $('#' + submitButtonId).prop('disabled', true);
    } else {
        $('#' + inputId).css('background-color', '');
        $('#' + inputId).css('border-color', '');
        $('.validationColour').css({"display":"none"});
        $('#' + submitButtonId).prop('disabled', false);
    }
    
}

$(document).ready(function(){
    // Contour value fields
    $('#addContourDialogValue').keypress(validateContourVal);
    $("#addContourDialogValue").keyup(validateContourValRange);

    $('#editContourDialogValue').keypress(validateContourVal);
    $("#editContourDialogValue").keyup(validateContourValRange);

    $('.fieldNameSelect').change(validateContourValRange);

    // Colour fields
    $('#colourVal').keyup(validateRGBColour);
    $('#colourValEdit').keyup(validateRGBColour);
});
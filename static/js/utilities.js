
export const OPEN_PATH = 'open';
export const DATAFILES_PATH = 'datafiles';


export function componentToHex(c) {
  var hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

// Colour converters from  https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
export function hexToRgb(hex) {
  // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
  var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  let fullHex = hex.replace(shorthandRegex, function (m, r, g, b) {
    return r + r + g + g + b + b;
  });

  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export function rgbToHex(r, g, b) {
  return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function getBase() {
  if ($("base") && $("base").attr("href")) {
    return $("base").attr("href");
  } else {
    return '/';
  }
}


export function getDataFile() {
  let data_dir = '';
  const rel_url = window.location.pathname.replace(getBase(), '');
  const url_parts = rel_url.split('/')
  if (url_parts && url_parts[0] == OPEN_PATH) {
    data_dir = url_parts[1];
  }
  console.log('Data dir: ' + data_dir);
  return data_dir
}



/* e.g. /data/3d-amr
   or /vis/data/3d-amr
*/
export function getDataPath() {
  return getBase() + 'data/' + getDataFile();
}



export function normalizedColour(colour) {
  console.log("Make normalized colour of " + colour.toString());

  let max = colour.reduce(function (a, b) { return Math.max(a, b); });
  let normalizedColour;
  if (max > 1) { normalizedColour = colour.map(function (item) { return item / 255 }); }
  else { normalizedColour = colour; }
  return normalizedColour;
}

export function encodeForURL(contourId, fieldId, value, colour) {
  return contourId + '_' + fieldId + '_' + value + '_' + colour;
}

export function getCurrentFields() {
  // console.log('Searching for contours in url: ' + location.pathname);
  const reGlobal = /\/(\d+)_(\d+)_(\d+[\.]*[\d]*)_([a-z0-9]+)/g;
  const re = /\/(\d+)_(\d+)_(\d+[\.]*[\d]*)_([a-z0-9]+)/;
  const matches = location.pathname.match(reGlobal);
  // console.log(matches);

  let contours = [];
  if (matches) {
    matches.forEach(function (match) {
      const thisMatch = match.match(re);
      console.log(thisMatch);
      contours.push({
        'id': Number(thisMatch[1]),
        'fieldId': Number(thisMatch[2]),
        'value': Number(thisMatch[3]),
        'hexColour': "#" + thisMatch[4]
      });
    })
    // console.log(contours);
  }
  return contours;
}

export function getUrlItem(contourId) {

  const re = new RegExp("\/(" + contourId + "_[^/]*)", "g");
  console.log('Searching in url ' + location.pathname + ' for ' + re);
  const matches = location.pathname.match(re);
  console.log(matches);
  if (matches) {
    return matches[0];
  } else {
    return undefined;
  }
}

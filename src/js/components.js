
import imgPlus from '../img/plus.svg';

export function noContoursLi() {
    let noContours = document.createElement('li');
    noContours.id = `noContours`;
    noContours.classList = 'contourRow noContourRow';
    noContours.style.display = 'inline';
    noContours.innerHTML = `<a id="addContourBtn" class="add"
    data-toggle="modal" data-target="#addContour" alt="Add contour (a)"
    data-toggle="tooltip" title="Add contour (a)"><img src='` + imgPlus + `' class="contourControl"> Add a contour</a>`;
    return noContours;
  }


// export function contourLi() {

// }